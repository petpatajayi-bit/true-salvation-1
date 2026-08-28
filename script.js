const ACCESS_CONFIG = { code: '5431' };
const accessGate = document.querySelector('#access-gate');
const accessForm = document.querySelector('#access-form');
const accessInput = document.querySelector('#access-code');
const accessError = document.querySelector('#access-error');
const showCode = document.querySelector('#show-code');
let chatSocket;
showCode.addEventListener('click', () => {
  const visible = accessInput.type === 'text';
  accessInput.type = visible ? 'password' : 'text';
  showCode.classList.toggle('active', !visible);
  showCode.setAttribute('aria-pressed', String(!visible));
  showCode.setAttribute('aria-label', visible ? 'Hide invitation code' : 'Show invitation code');
});
const userName = `Member ${Math.floor(Math.random() * 9000) + 1000}`;

function connectChat() {
  if (location.protocol === 'file:') return;
  const socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  chatSocket = new WebSocket(`${socketProtocol}://${location.host}/socket?user=${encodeURIComponent(userName)}`);
  chatSocket.addEventListener('message', async (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'presence') {
      document.querySelector('#conversation-status').innerHTML = `<i></i> ${data.count} member${data.count === 1 ? '' : 's'} online`;
    } else if (data.type === 'history') {
      data.messages.forEach(addServerMessage);
    } else if (data.type === 'message' || data.type === 'image') {
      addServerMessage(data);
    } else if (data.type === 'call-offer') {
      receiveCall(data);
    } else if (data.type === 'call-answer' && callPeer) {
      await callPeer.setRemoteDescription(data.sdp);
    } else if (data.type === 'call-ice' && callPeer && data.candidate) {
      await callPeer.addIceCandidate(data.candidate);
    } else if (data.type === 'call-end') {
      closeCall(false);
    }
  });
  chatSocket.addEventListener('close', () => showToast('Connection closed. Refresh to reconnect.'));
}

function addServerMessage(data) {
  if (data.user === userName) return;
  const safeUser = data.user.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]));
  const safeText = (data.text || '').replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]));
  const picture = data.type === 'image' ? `<img src="${data.image}" alt="Shared picture" style="max-width:220px;max-height:180px;display:block;border-radius:4px">` : `<p>${safeText}</p>`;
  messages.insertAdjacentHTML('beforeend', `<div class="bubble-row"><span class="avatar avatar-group">${safeUser.charAt(0)}</span><div class="bubble incoming"><span class="bubble-author">${safeUser}</span>${picture}<time>${data.time}</time></div></div>`);
  messages.scrollTop = messages.scrollHeight;
}

async function unlock(code) {
  if (location.protocol === 'file:') return code.toUpperCase() === ACCESS_CONFIG.code;
  const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  return response.ok;
}

accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (await unlock(accessInput.value.trim())) {
    accessGate.classList.add('hidden');
    accessInput.value = '';
    connectChat();
  } else {
    accessError.textContent = 'That code is not correct. Please ask your community leader.';
    accessInput.select();
  }
});

const sidebar = document.querySelector('#sidebar');
const conversation = document.querySelector('#conversation');
const menuToggle = document.querySelector('#menu-button');
const themeButton = document.querySelector('#theme-button');
const themePicker = document.querySelector('#theme-picker');
const toast = document.querySelector('#toast');
const messages = document.querySelector('#messages');
const messageInput = document.querySelector('#message-input');
const emojiPicker = document.querySelector('#emoji-picker');
const defaultMessages = messages.innerHTML;
const callChoice = document.querySelector('#call-choice');
let aiMode = false;
let videoStream;
let callStream;
let callPeer;
let snapStream;
let snapFilterIndex = 0;
const snapFilters = ['none', 'sepia(0.35)', 'saturate(1.7) hue-rotate(20deg)', 'grayscale(0.8) contrast(1.2)'];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

document.querySelectorAll('.chat-preview').forEach((chat) => chat.addEventListener('click', () => {
  document.querySelectorAll('.chat-preview').forEach((item) => item.classList.remove('selected'));
  chat.classList.add('selected');
  document.querySelector('#conversation-name').textContent = chat.dataset.name;
  document.querySelector('#conversation-status').innerHTML = `<i></i> ${chat.dataset.status}`;
  document.querySelector('#header-avatar').textContent = chat.dataset.avatar || chat.dataset.name.charAt(0);
  aiMode = chat.dataset.ai === 'true';
  messages.innerHTML = aiMode ? '<div class="date-chip">JESUS WORD GUIDE</div><div class="bubble-row"><span class="avatar avatar-ai">✝</span><div class="bubble incoming"><span class="bubble-author">Jesus Word Guide</span><p>Welcome. I am a scripture study assistant sharing the teachings of Jesus. Ask me about love, forgiveness, prayer, faith, serving others, or a Bible passage. I am not Jesus and I do not replace a pastor or counsellor.</p><time>now</time></div></div>' : defaultMessages;
  conversation.classList.add('mobile-open');
  sidebar.classList.add('mobile-hidden');
}));
document.querySelector('#back-button').addEventListener('click', () => { conversation.classList.remove('mobile-open'); sidebar.classList.remove('mobile-hidden'); });
menuToggle.addEventListener('click', () => showToast('More chat options are coming soon'));
document.querySelector('#new-chat').addEventListener('click', () => showToast('New chat invitations are coming soon'));
const visibilityPanel = document.querySelector('#visibility-panel');
document.querySelector('#settings-button').addEventListener('click', () => { visibilityPanel.classList.add('open'); visibilityPanel.setAttribute('aria-hidden', 'false'); });
document.querySelector('#close-settings').addEventListener('click', () => { visibilityPanel.classList.remove('open'); visibilityPanel.setAttribute('aria-hidden', 'true'); });
document.querySelectorAll('.setting-row input').forEach((toggle) => {
  const saved = localStorage.getItem(`visibility-${toggle.id}`);
  if (saved !== null) toggle.checked = saved === 'true';
  toggle.addEventListener('change', () => {
    localStorage.setItem(`visibility-${toggle.id}`, String(toggle.checked));
    showToast(`${toggle.closest('.setting-row').querySelector('strong').textContent}: ${toggle.checked ? 'On' : 'Off'}`);
  });
});
document.querySelector('#search-button').addEventListener('click', () => messageInput.focus());
document.querySelector('#conversation-menu').addEventListener('click', () => showToast('Conversation options are coming soon'));
document.querySelectorAll('.story-item').forEach((story) => story.addEventListener('click', () => showToast(`${story.dataset.story}'s story is opening soon`)));
document.querySelector('#story-add').addEventListener('click', () => openSnap());
document.querySelector('#snap-button').addEventListener('click', () => openSnap());
document.querySelector('.emoji-button').addEventListener('click', () => {
  const open = emojiPicker.classList.toggle('open');
  emojiPicker.setAttribute('aria-hidden', String(!open));
});
emojiPicker.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
  messageInput.value += button.textContent;
  messageInput.focus();
}));

themeButton.addEventListener('click', () => { const open = themePicker.classList.toggle('open'); themePicker.setAttribute('aria-hidden', String(!open)); });
document.querySelectorAll('[data-wallpaper]').forEach((button) => button.addEventListener('click', () => { document.body.className = button.dataset.wallpaper; themePicker.classList.remove('open'); showToast(`Wallpaper changed to ${button.textContent.trim()}`); }));

document.querySelector('#message-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  messages.insertAdjacentHTML('beforeend', `<div class="bubble-row own"><div class="bubble outgoing"><p>${text.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</p><time>now ✓</time></div></div>`);
  if (chatSocket?.readyState === WebSocket.OPEN && !aiMode) chatSocket.send(JSON.stringify({ type: 'message', text }));
  messageInput.value = '';
  emojiPicker.classList.remove('open');
  messages.scrollTop = messages.scrollHeight;
  if (aiMode) {
    window.setTimeout(() => {
      const lowerText = text.toLowerCase();
      let reply = 'I can help with the teachings of Jesus and scripture. Try asking about love, forgiveness, prayer, faith, serving others, worry, or a Bible passage.';
      if (lowerText.includes('love')) reply = 'Jesus teaches us to love God and to love our neighbour as ourselves. See Matthew 22:37–39.';
      else if (lowerText.includes('forgive')) reply = 'Jesus calls us to forgive from the heart and to seek reconciliation. See Matthew 6:14–15 and Matthew 18:21–22.';
      else if (lowerText.includes('pray')) reply = 'Jesus teaches us to pray sincerely, trusting the Father. See Matthew 6:6–13 and Luke 11:1–4.';
      else if (lowerText.includes('worry') || lowerText.includes('anxious')) reply = 'Jesus invites us not to be consumed by worry, but to seek God’s kingdom and trust one day at a time. See Matthew 6:25–34.';
      else if (lowerText.includes('faith')) reply = 'Jesus teaches that faith begins with trust in God and becomes visible through a life of love and action. See Mark 11:22–24 and James 2:17.';
      else if (lowerText.includes('serve') || lowerText.includes('help')) reply = 'Jesus teaches that greatness is found in serving others with humility. See Mark 10:43–45 and Matthew 25:35–40.';
      messages.insertAdjacentHTML('beforeend', `<div class="bubble-row"><span class="avatar avatar-ai">✝</span><div class="bubble incoming"><span class="bubble-author">Jesus Word Guide</span><p>${reply}</p><time>now</time></div></div>`);
      messages.scrollTop = messages.scrollHeight;
    }, 500);
  }
});
document.querySelector('#image-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  messages.insertAdjacentHTML('beforeend', `<div class="bubble-row own"><div class="bubble outgoing"><img src="${url}" alt="Shared picture" style="max-width:220px;max-height:180px;display:block;border-radius:4px"><time>now ✓</time></div></div>`);
  if (chatSocket?.readyState === WebSocket.OPEN && !aiMode) chatSocket.send(JSON.stringify({ type: 'image', image: await fileToDataUrl(file) }));
  messages.scrollTop = messages.scrollHeight;
  showToast('Picture added to chat');
});

function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }

async function openSnap() {
  const modal = document.querySelector('#snap-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.querySelector('#snap-status').textContent = 'Opening camera...';
  if (!navigator.mediaDevices?.getUserMedia) {
    document.querySelector('#snap-status').textContent = 'Camera preview needs browser permission';
    return;
  }
  try {
    snapStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.querySelector('#snap-video').srcObject = snapStream;
    document.querySelector('#snap-status').textContent = 'Camera ready · tap the shutter';
  } catch {
    document.querySelector('#snap-status').textContent = 'Camera access is needed to take a snap';
  }
}
function closeSnap() {
  document.querySelector('#snap-modal').classList.remove('open');
  document.querySelector('#snap-modal').setAttribute('aria-hidden', 'true');
  if (snapStream) snapStream.getTracks().forEach((track) => track.stop());
  document.querySelector('#snap-video').srcObject = null;
}
document.querySelector('#close-snap').addEventListener('click', closeSnap);
document.querySelector('#snap-filter').addEventListener('click', () => {
  snapFilterIndex = (snapFilterIndex + 1) % snapFilters.length;
  document.querySelector('#snap-video').style.filter = snapFilters[snapFilterIndex];
  showToast('Camera filter changed');
});
document.querySelector('#flip-camera').addEventListener('click', () => showToast('Camera flip is ready when connected to a device camera'));
document.querySelector('#take-snap').addEventListener('click', () => {
  const video = document.querySelector('#snap-video');
  const canvas = document.querySelector('#snap-canvas');
  if (!video.videoWidth) { showToast('Allow camera access first'); return; }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const url = canvas.toDataURL('image/jpeg');
  messages.insertAdjacentHTML('beforeend', `<div class="bubble-row own"><div class="bubble outgoing"><img src="${url}" alt="Snap picture" style="max-width:220px;max-height:180px;display:block;border-radius:4px"><time>now ✓</time></div></div>`);
  closeSnap();
  messages.scrollTop = messages.scrollHeight;
  showToast('Snap sent to chat');
});

function createCallPeer() {
  callPeer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  callPeer.onicecandidate = (event) => { if (event.candidate) chatSocket?.send(JSON.stringify({ type: 'call-ice', candidate: event.candidate })); };
  callPeer.ontrack = (event) => {
    const remoteVideo = document.querySelector('#remote-video');
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.style.display = 'block';
    document.querySelector('#call-status').textContent = 'Connected';
  };
  if (callStream) callStream.getTracks().forEach((track) => callPeer.addTrack(track, callStream));
}

async function startCall(video) {
  document.querySelector('#call-modal').classList.add('open');
  document.querySelector('#call-modal').setAttribute('aria-hidden', 'false');
  document.querySelector('#call-title').textContent = video ? 'Starting video call' : 'Calling Minister Grace';
  document.querySelector('#call-status').textContent = video ? 'Requesting camera access...' : 'Connecting securely...';
  if (!navigator.mediaDevices?.getUserMedia || !chatSocket || chatSocket.readyState !== WebSocket.OPEN) return;
  try { videoStream = await navigator.mediaDevices.getUserMedia({ video, audio: true }); document.querySelector('#local-video').srcObject = videoStream; document.querySelector('#local-video').style.display = video ? 'block' : 'none'; document.querySelector('#call-status').textContent = 'Your camera preview is live.'; } catch { document.querySelector('#call-status').textContent = 'Camera or microphone access was not granted.'; return; }
  callStream = videoStream;
  createCallPeer();
  const offer = await callPeer.createOffer();
  await callPeer.setLocalDescription(offer);
  chatSocket.send(JSON.stringify({ type: 'call-offer', video, sdp: offer }));
}
function openCallChoice() { callChoice.classList.add('open'); callChoice.setAttribute('aria-hidden', 'false'); }
function closeCallChoice() { callChoice.classList.remove('open'); callChoice.setAttribute('aria-hidden', 'true'); }
document.querySelector('#voice-call').addEventListener('click', openCallChoice);
document.querySelector('#video-call').addEventListener('click', openCallChoice);
document.querySelector('#close-choice').addEventListener('click', closeCallChoice);
document.querySelector('#choose-phone').addEventListener('click', () => { closeCallChoice(); startCall(false); });
document.querySelector('#choose-video').addEventListener('click', () => { closeCallChoice(); startCall(true); });
async function receiveCall(data) {
  if (callPeer) return;
  callVideo = data.video;
  document.querySelector('#call-modal').classList.add('open');
  document.querySelector('#call-modal').setAttribute('aria-hidden', 'false');
  document.querySelector('#call-title').textContent = `${data.from} is calling`;
  try { callStream = await navigator.mediaDevices.getUserMedia({ video: data.video, audio: true }); } catch { document.querySelector('#call-status').textContent = 'Camera or microphone access was not granted.'; return; }
  createCallPeer();
  await callPeer.setRemoteDescription(data.sdp);
  const answer = await callPeer.createAnswer();
  await callPeer.setLocalDescription(answer);
  chatSocket.send(JSON.stringify({ type: 'call-answer', sdp: answer }));
}
function closeCall(notify = true) { if (notify && chatSocket?.readyState === WebSocket.OPEN) chatSocket.send(JSON.stringify({ type: 'call-end' })); document.querySelector('#call-modal').classList.remove('open'); document.querySelector('#call-modal').setAttribute('aria-hidden', 'true'); if (callStream) callStream.getTracks().forEach((track) => track.stop()); if (callPeer) callPeer.close(); callStream = null; callPeer = null; document.querySelector('#local-video').srcObject = null; document.querySelector('#remote-video').srcObject = null; document.querySelector('#local-video').style.display = 'none'; document.querySelector('#remote-video').style.display = 'none'; }
document.querySelector('#close-call').addEventListener('click', closeCall);
document.querySelector('#end-call').addEventListener('click', closeCall);
