# Run the real community server

The browser-only version is still available by opening `index.html`, but real users need the Node server.

## One-time setup

1. Install the current Node.js LTS version from https://nodejs.org/.
2. Close and reopen VS Code.
3. Open a terminal in this folder.
4. Run:

```powershell
npm install
npm start
```

5. Open http://localhost:3000 in the browser.
6. Share the computer's local network address with trusted users on the same Wi-Fi, for example `http://192.168.1.20:3000`. Windows Firewall may ask you to allow Node.js on private networks; allow it.
7. Everyone enters the access code `2431`.

For users in different countries, use the deployment steps in `PUBLIC_DEPLOY.md` to put the server on an HTTPS host.

## What the server does

- Protects the WebSocket room with a session cookie.
- Broadcasts new text messages to connected browsers.
- Broadcasts picture messages to connected browsers.
- Shows the connected member count.
- Keeps the latest 100 messages in memory while the server is running.

## Important before public launch

This is a working local server foundation, not a production deployment. To support every device over the internet, deploy `server.js` to a Node host such as Render, Railway, Fly.io, or your own VPS, then use an HTTPS domain. The server now automatically uses secure WebSockets when the page uses HTTPS. Before public launch, add a real user database, password reset, moderation tools, rate limits, persistent image storage, and a real WebRTC signaling/TURN-server setup for calls. Do not rely on the front-end code or one shared code for sensitive privacy.

Set a different access code when starting the server:

```powershell
$env:ACCESS_CODE='your-new-code'; npm start
```
