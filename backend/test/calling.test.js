// Call signalling over the socket layer: two matched users can ring,
// negotiate and hang up; two strangers cannot reach each other at all.
//
//   node backend/test/calling.test.js   (exits non-zero on failure)
const os = require('os');
const path = require('path');
const http = require('http');

process.env.DB_PATH = path.join(os.tmpdir(), `veiled-call-test-${process.pid}.db`);
process.env.JWT_SECRET = 'test-secret-for-call-signalling-0123456789';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
require('fs').rmSync(process.env.DB_PATH, { force: true });
process.on('exit', () => require('fs').rmSync(process.env.DB_PATH, { force: true }));

const app = require('../server.js');
const realtime = require('../realtime');
const { io: client } = require('socket.io-client');

let base, origin;
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
  else { fail++; console.log('  ✗', n, x !== undefined ? JSON.stringify(x).slice(0, 200) : ''); }
};

// Wait for one event, or give up. Returns null on timeout so a missing
// event is a failed assertion rather than a hung test run.
const waitFor = (socket, event, ms = 1500) => new Promise((resolve) => {
  const t = setTimeout(() => { socket.off(event, h); resolve(null); }, ms);
  const h = (payload) => { clearTimeout(t); socket.off(event, h); resolve(payload); };
  socket.on(event, h);
});

const connect = (token) => new Promise((resolve, reject) => {
  const s = client(origin, { auth: { token }, transports: ['websocket'] });
  s.once('connect', () => resolve(s));
  s.once('connect_error', reject);
});

(async () => {
  const server = http.createServer(app);
  realtime.init(server);
  server.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;
  base = `http://127.0.0.1:${port}/api`;
  origin = `http://127.0.0.1:${port}`;

  const mk = async (name, profile) => {
    const r = await req('POST', '/auth/register', {
      body: { email: `${name}${Date.now()}@v.test`, password: 'Passw0rd!test', displayName: name },
    });
    const p = await req('PUT', '/dating/profile', { token: r.body.token, body: profile });
    return { token: r.body.token, id: p.body.profile && p.body.profile.id };
  };

  const her = await mk('Safiyyah', {
    name: 'Safiyyah', age: 28, gender: 'Woman', veil: 'Niqab', city: 'Bristol',
    unveiledPhoto: '/uploads/safiyyah-unveiled.jpg',
  });
  const him = await mk('Yahya', { name: 'Yahya', age: 31, gender: 'Man', city: 'Bristol' });
  const stranger = await mk('Kamal', { name: 'Kamal', age: 33, gender: 'Man', city: 'Bristol' });

  await req('POST', '/dating/swipe', { token: her.token, body: { targetId: him.id, action: 'like' } });
  const m = await req('POST', '/dating/swipe', { token: him.token, body: { targetId: her.id, action: 'like' } });
  ok('the two are matched', m.body.match === true, m.body);

  const a = await connect(him.token);      // caller
  const b = await connect(her.token);      // callee
  const c = await connect(stranger.token); // uninvolved

  console.log('\nRinging a match reaches them');
  const incoming = waitFor(b, 'call:incoming');
  const strangerSees = waitFor(c, 'call:incoming', 600);
  const acked = await new Promise((r) => a.emit('call:ring', { to: her.id, mode: 'video', callId: 'call-1' }, r));
  ok('the ring is accepted', acked && acked.ok === true, acked);
  const ring = await incoming;
  ok('she is rung', !!ring && ring.callId === 'call-1', ring);
  ok('with the mode asked for', ring && ring.mode === 'video', ring);
  ok('and nobody else hears it', (await strangerSees) === null);

  console.log('\nThe offer and answer pass between the two of them');
  const gotOffer = waitFor(b, 'call:offer');
  a.emit('call:offer', { callId: 'call-1', sdp: { type: 'offer', sdp: 'v=0 fake' } });
  const offer = await gotOffer;
  ok('she receives the offer', !!offer && offer.sdp && offer.sdp.type === 'offer', offer);

  const gotAnswer = waitFor(a, 'call:answer');
  b.emit('call:answer', { callId: 'call-1', sdp: { type: 'answer', sdp: 'v=0 fake' } });
  const answer = await gotAnswer;
  ok('he receives the answer', !!answer && answer.sdp.type === 'answer', answer);

  const gotIce = waitFor(a, 'call:ice');
  b.emit('call:ice', { callId: 'call-1', candidate: { candidate: 'candidate:1 udp' } });
  const ice = await gotIce;
  ok('candidates flow back', !!ice && !!ice.candidate, ice);

  console.log('\nHanging up tells the other side');
  const ended = waitFor(a, 'call:ended');
  b.emit('call:end', { callId: 'call-1' });
  const end = await ended;
  ok('he is told it ended', !!end && end.reason === 'ended', end);

  console.log('\nSignalling for a finished call goes nowhere');
  const afterEnd = waitFor(b, 'call:offer', 600);
  a.emit('call:offer', { callId: 'call-1', sdp: { type: 'offer', sdp: 'late' } });
  ok('a late offer is dropped', (await afterEnd) === null);

  console.log('\nA stranger cannot ring you');
  const shouldNotRing = waitFor(b, 'call:incoming', 600);
  const denied = await new Promise((r) => c.emit('call:ring', { to: her.id, mode: 'audio', callId: 'call-2' }, r));
  ok('the ring is refused', denied && denied.ok === false, denied);
  ok('and she is never rung', (await shouldNotRing) === null);

  console.log('\nDropping the connection hangs up');
  await new Promise((r) => a.emit('call:ring', { to: her.id, mode: 'audio', callId: 'call-3' }, r));
  await waitFor(b, 'call:incoming');
  const droppedEnd = waitFor(b, 'call:ended');
  a.disconnect();
  const dropped = await droppedEnd;
  ok('she is told he dropped', !!dropped && dropped.reason === 'disconnected', dropped);

  b.disconnect(); c.disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
