import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';
const accessCode = process.env.ACCESS_CODE || '2431';
const sessions = new Set();
const clients = new Map();
const history = [];

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}
function isAuthorized(request) { return sessions.has(parseCookies(request).tsdm_session); }
function sendJson(response, status, data, headers = {}) { response.writeHead(status, { 'Content-Type': 'application/json', ...headers }); response.end(JSON.stringify(data)); }
function broadcast(data, except) { for (const client of clients.keys()) if (client !== except && client.readyState === 1) client.send(JSON.stringify(data)); }
function safeText(value) { return String(value || '').slice(0, 2000); }

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/api/login') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const { code } = JSON.parse(body);
        if (code !== accessCode) return sendJson(response, 401, { error: 'Invalid access code' });
        const session = crypto.randomBytes(24).toString('hex');
        sessions.add(session);
        return sendJson(response, 200, { ok: true }, { 'Set-Cookie': `tsdm_session=${session}; HttpOnly; SameSite=Lax; Path=/` });
      } catch { return sendJson(response, 400, { error: 'Invalid request' }); }
    });
    return;
  }
  if (request.url === '/api/session') return sendJson(response, isAuthorized(request) ? 200 : 401, { authenticated: isAuthorized(request) });
  if (request.url === '/api/logout' && request.method === 'POST') return sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'tsdm_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/' });
  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.join(root, path.normalize(requestedPath));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Not found' });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (requestUrl.pathname !== '/socket' || !isAuthorized(request)) return socket.destroy();
  wss.handleUpgrade(request, socket, head, (websocket) => wss.emit('connection', websocket, request));
});
wss.on('connection', (socket, request) => {
  const user = new URL(request.url, `http://${request.headers.host}`).searchParams.get('user') || 'Member';
  clients.set(socket, user);
  socket.send(JSON.stringify({ type: 'history', messages: history }));
  broadcast({ type: 'presence', count: clients.size }, socket);
  socket.send(JSON.stringify({ type: 'presence', count: clients.size }));
  socket.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (['call-offer', 'call-answer', 'call-ice', 'call-end'].includes(data.type)) {
        broadcast({ ...data, from: user }, socket);
        return;
      }
      if (!['message', 'image'].includes(data.type)) return;
      const item = { type: data.type, user, text: safeText(data.text), image: data.type === 'image' ? String(data.image || '').slice(0, 2_000_000) : '', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
      history.push(item);
      if (history.length > 100) history.shift();
      broadcast(item);
    } catch { socket.send(JSON.stringify({ type: 'error', message: 'Message could not be sent' })); }
  });
  socket.on('close', () => { clients.delete(socket); broadcast({ type: 'presence', count: clients.size }); });
});

server.listen(port, host, () => console.log(`True Salvation Military running at http://localhost:${port}`));
