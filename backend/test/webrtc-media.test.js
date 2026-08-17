// Two real WebRTC peers, through the real signalling server, running the
// app's own negotiation code — and media has to actually arrive.
//
// The app talks to react-native-webrtc, which only exists on a device,
// so the app's call cannot be run here. What can be run is the part that
// decides *when* to offer, answer and add candidates: src/muzz/callFlow.js
// has no platform in it, and this drives that exact file with Chromium's
// WebRTC and fake camera/microphone devices.
//
// What that proves: the choreography connects two peers and carries
// media. What it does not prove: that react-native-webrtc behaves the
// same on iOS. That still needs two devices.
//
//   node backend/test/webrtc-media.test.js   (exits non-zero on failure)
const os = require('os');
const path = require('path');
const fs = require('fs');
const http = require('http');

process.env.DB_PATH = path.join(os.tmpdir(), `veiled-media-rtc-${process.pid}.db`);
process.env.JWT_SECRET = 'test-secret-for-webrtc-media-0123456789';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
fs.rmSync(process.env.DB_PATH, { force: true });
process.on('exit', () => fs.rmSync(process.env.DB_PATH, { force: true }));

const app = require('../server.js');
const realtime = require('../realtime');

const ROOT = path.join(__dirname, '..', '..');
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright-core'));

// The negotiation the app itself uses. Stripped of module syntax so it
// can be dropped into a page as a plain script — if this file changes,
// the test changes with it.
const FLOW_SRC = fs
  .readFileSync(path.join(ROOT, 'src', 'muzz', 'callFlow.js'), 'utf8')
  .replace(/export default[\s\S]*$/, '')
  .replace(/^export /gm, '');

let base, origin, pageOrigin;
const req = (method, p, { body, token } = {}) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const r = http.request(`${base}${p}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }, (res) => {
    let buf = '';
    res.on('data', (c) => { buf += c; });
    res.on('end', () => { let j = null; try { j = JSON.parse(buf); } catch { j = buf; } resolve({ status: res.statusCode, body: j }); });
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ✓', n); }
  else { fail++; console.log('  ✗', n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); }
};

// One page = one participant. It connects the socket exactly as the app
// does and drives callFlow.js the way CallScreen does.
async function participant(context, { token, callId, video }) {
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('   page error:', String(e).slice(0, 200)));
  await page.goto(pageOrigin);
  await page.addScriptTag({ url: `${origin}/socket.io/socket.io.js` });
  await page.addScriptTag({ content: FLOW_SRC });
  await page.evaluate(async ({ token: t, callId: id, video: v, apiOrigin }) => {
    window.__origin = apiOrigin;
    window.__log = [];
    window.__state = { remote: false, connection: null };
    window.__stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: v });
    window.__sock = io(window.__origin, { auth: { token: t }, transports: ['websocket'] });
    await new Promise((r) => window.__sock.on('connect', r));

    const send = (event, payload) => window.__sock.emit(event, { callId: id, ...payload });
    window.__peer = createPeerFlow({
      RTCPeerConnection: window.RTCPeerConnection,
      RTCSessionDescription: window.RTCSessionDescription,
      RTCIceCandidate: window.RTCIceCandidate,
      stream: window.__stream,
      iceServers: [],   // loopback: host candidates are enough
      onRemoteStream: (s) => { window.__state.remote = true; window.__remote = s; },
      onState: (st) => { window.__state.connection = st; window.__log.push('state:' + st); },
      send,
    });

    // Exactly the events CallScreen reacts to, in the same order.
    window.__sock.on('call:accepted', async () => { window.__log.push('accepted'); await window.__peer.offer(); });
    window.__sock.on('call:offer', async (p) => { window.__log.push('offer'); await window.__peer.answerTo(p.sdp); });
    window.__sock.on('call:answer', async (p) => { window.__log.push('answer'); await window.__peer.acceptAnswer(p.sdp); });
    window.__sock.on('call:ice', async (p) => { await window.__peer.addCandidate(p.candidate); });
    window.__sock.on('call:incoming', (p) => { window.__log.push('incoming'); window.__incoming = p; });
    window.__sock.on('call:ended', (p) => { window.__log.push('ended:' + p.reason); });
  }, { token, callId, video, apiOrigin: origin });
  return page;
}

(async () => {
  const server = http.createServer(app);
  realtime.init(server);
  server.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;
  base = `http://127.0.0.1:${port}/api`;
  origin = `http://127.0.0.1:${port}`;

  // The page that drives the peers is served from its own origin rather
  // than from the API. The API sets Permissions-Policy to switch the
  // camera and microphone off for everything it serves — correct for an
  // API, and it denies getUserMedia to any page hosted there. (Worth
  // knowing if the web build ever moves onto the API's origin: calls
  // would fail there with a bare NotAllowedError.)
  const pageServer = http.createServer((_q, res) => {
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(self)');
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>call test</title>');
  });
  await new Promise((r) => pageServer.listen(0, r));
  pageOrigin = `http://127.0.0.1:${pageServer.address().port}`;

  const mk = async (name, profile) => {
    const r = await req('POST', '/auth/register', {
      body: { email: `${name}${Date.now()}@v.test`, password: 'Passw0rd!test', displayName: name },
    });
    const p = await req('PUT', '/dating/profile', { token: r.body.token, body: profile });
    return { token: r.body.token, id: p.body.profile && p.body.profile.id };
  };

  const her = await mk('Maryam', {
    name: 'Maryam', age: 27, gender: 'Woman', veil: 'Niqab', city: 'Cardiff',
    unveiledPhoto: '/uploads/maryam-unveiled.jpg',
  });
  const him = await mk('Ilyas', { name: 'Ilyas', age: 29, gender: 'Man', city: 'Cardiff' });
  await req('POST', '/dating/swipe', { token: her.token, body: { targetId: him.id, action: 'like' } });
  await req('POST', '/dating/swipe', { token: him.token, body: { targetId: her.id, action: 'like' } });

  console.log('\nICE configuration is served to a signed-in member');
  const iceRes = await req('GET', '/dating/ice', { token: him.token });
  ok('200 with servers', iceRes.status === 200 && Array.isArray(iceRes.body.iceServers) && iceRes.body.iceServers.length > 0, iceRes.body);
  ok('and says whether a relay exists', typeof iceRes.body.relay === 'boolean', iceRes.body);
  const iceNoAuth = await req('GET', '/dating/ice');
  ok('and not to a stranger', iceNoAuth.status === 401, iceNoAuth.status);

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: [
      '--no-sandbox',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--allow-file-access-from-files',
    ],
  });

  // Chromium still gates getUserMedia behind a permission even with a
  // fake device, so grant it for this origin.
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  await context.grantPermissions(['camera', 'microphone'], { origin: pageOrigin });

  const callId = 'rtc-1';
  const caller = await participant(context, { token: him.token, callId, video: true });
  const callee = await participant(context, { token: her.token, callId, video: true });

  console.log('\nA video call connects end to end');
  // Caller rings; callee picks up; the offer follows the acceptance.
  const ringAck = await caller.evaluate(({ to, id }) => new Promise((r) => {
    window.__sock.emit('call:ring', { to, mode: 'video', callId: id }, r);
  }), { to: her.id, id: callId });
  ok('the ring is accepted by the server', ringAck && ringAck.ok === true, ringAck);

  await callee.waitForFunction(() => window.__incoming, null, { timeout: 5000 });
  ok('the callee is rung', true);
  await callee.evaluate(({ id }) => window.__sock.emit('call:accept', { callId: id }), { id: callId });

  const connected = async (page) => page.waitForFunction(
    () => window.__state.connection === 'connected',
    null,
    { timeout: 20000 },
  ).then(() => true).catch(() => false);

  const [a, b] = await Promise.all([connected(caller), connected(callee)]);
  ok('the caller reaches connected', a, await caller.evaluate(() => window.__log));
  ok('the callee reaches connected', b, await callee.evaluate(() => window.__log));

  const gotRemote = async (page) => page.evaluate(() => window.__state.remote);
  ok('the caller has a remote stream', await gotRemote(caller));
  ok('the callee has a remote stream', await gotRemote(callee));

  console.log('\nMedia actually arrives');
  // Bytes on the wire, not just a connected state — this is the part
  // that separates "negotiated" from "you can hear her".
  const inbound = async (page) => page.evaluate(async () => {
    const stats = await window.__peer.pc.getStats();
    let audio = 0, video = 0;
    stats.forEach((r) => {
      if (r.type === 'inbound-rtp' && !r.isRemote) {
        if (r.kind === 'audio') audio += r.bytesReceived || 0;
        if (r.kind === 'video') video += r.bytesReceived || 0;
      }
    });
    return { audio, video };
  });
  // Give the streams a moment to carry something.
  await caller.waitForTimeout(3000);
  const inCaller = await inbound(caller);
  const inCallee = await inbound(callee);
  ok('the caller receives audio bytes', inCaller.audio > 0, inCaller);
  ok('the caller receives video bytes', inCaller.video > 0, inCaller);
  ok('the callee receives audio bytes', inCallee.audio > 0, inCallee);
  ok('the callee receives video bytes', inCallee.video > 0, inCallee);

  console.log('\nHanging up reaches the other end');
  await callee.evaluate(({ id }) => window.__sock.emit('call:end', { callId: id }), { id: callId });
  const sawEnd = await caller.waitForFunction(
    () => window.__log.some((l) => l.startsWith('ended:')),
    null,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  ok('the caller is told', sawEnd, await caller.evaluate(() => window.__log));

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  pageServer.close();
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
