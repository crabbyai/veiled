// Messages that carry media: a photo and a voice note survive the round
// trip with their kind and meta, and an attachment body cannot point
// somewhere we didn't put it.
//
//   node backend/test/media-messages.test.js   (exits non-zero on failure)
const os = require('os');
const path = require('path');
const http = require('http');

process.env.DB_PATH = path.join(os.tmpdir(), `veiled-media-test-${process.pid}.db`);
process.env.JWT_SECRET = 'test-secret-for-media-messages-0123456789';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
require('fs').rmSync(process.env.DB_PATH, { force: true });
process.on('exit', () => require('fs').rmSync(process.env.DB_PATH, { force: true }));

const app = require('../server.js');

let base;
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

(async () => {
  const server = http.createServer(app).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;

  const mk = async (name, profile) => {
    const r = await req('POST', '/auth/register', {
      body: { email: `${name}${Date.now()}@v.test`, password: 'Passw0rd!test', displayName: name },
    });
    const token = r.body.token;
    const p = await req('PUT', '/dating/profile', { token, body: profile });
    return { token, id: p.body.profile && p.body.profile.id };
  };

  const her = await mk('Ruqayyah', {
    name: 'Ruqayyah', age: 27, gender: 'Woman', veil: 'Niqab', city: 'Leeds',
    unveiledPhoto: '/uploads/ruqayyah-unveiled.jpg',
  });
  const him = await mk('Idris', { name: 'Idris', age: 30, gender: 'Man', city: 'Leeds' });

  // Match them so there is a conversation to send into.
  await req('POST', '/dating/swipe', { token: her.token, body: { targetId: him.id, action: 'like' } });
  const back = await req('POST', '/dating/swipe', { token: him.token, body: { targetId: her.id, action: 'like' } });
  ok('they match', back.body.match === true, back.body);
  const mine = await req('GET', '/dating/matches', { token: him.token });
  const matchId = mine.body.matches[0].matchId;

  console.log('\nA photo message keeps its kind');
  const img = await req('POST', `/dating/matches/${matchId}/messages`, {
    token: him.token, body: { body: '/uploads/abc123.jpg', kind: 'image' },
  });
  ok('accepted', img.status === 201, img.body);
  ok('stored as an image', img.body.message && img.body.message.kind === 'image', img.body.message);

  console.log('\nA voice note keeps its length');
  const vn = await req('POST', `/dating/matches/${matchId}/messages`, {
    token: him.token, body: { body: '/uploads/note.m4a', kind: 'audio', meta: { durationMs: 4200 } },
  });
  ok('accepted', vn.status === 201, vn.body);
  ok('stored as audio', vn.body.message.kind === 'audio', vn.body.message);

  console.log('\nBoth come back on the conversation');
  const read = await req('GET', `/dating/matches/${matchId}/messages`, { token: her.token });
  const msgs = read.body.messages || [];
  const gotImg = msgs.find((m) => m.kind === 'image');
  const gotAudio = msgs.find((m) => m.kind === 'audio');
  ok('the photo is there', !!gotImg && gotImg.body === '/uploads/abc123.jpg', gotImg);
  ok('the voice note is there', !!gotAudio, gotAudio);
  ok('and its length survived as a number', gotAudio && gotAudio.meta && gotAudio.meta.durationMs === 4200, gotAudio && gotAudio.meta);

  console.log('\nText is unaffected');
  const txt = await req('POST', `/dating/matches/${matchId}/messages`, { token: him.token, body: { body: 'Salaam' } });
  ok('still defaults to text', txt.body.message.kind === 'text', txt.body.message);

  console.log('\nAn attachment may only point at something we stored');
  const evil = await req('POST', `/dating/matches/${matchId}/messages`, {
    token: him.token, body: { body: 'https://elsewhere.example/tracker.png', kind: 'image' },
  });
  ok('an off-site url is refused', evil.status === 400, evil.body);
  const climb = await req('POST', `/dating/matches/${matchId}/messages`, {
    token: him.token, body: { body: '/uploads/../../etc/passwd', kind: 'image' },
  });
  ok('a path climbing out is refused', climb.status === 400, climb.body);
  const bogus = await req('POST', `/dating/matches/${matchId}/messages`, {
    token: him.token, body: { body: '/uploads/ok.jpg', kind: 'executable' },
  });
  ok('an unknown kind falls back to text', bogus.status === 201 && bogus.body.message.kind === 'text', bogus.body.message);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
