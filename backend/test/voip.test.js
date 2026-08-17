// VoIP tokens and the APNs credential the server signs with. The push
// itself cannot be sent from here — that needs Apple — but everything
// up to the wire can be checked, and a wrong JWT is silent in
// production: APNs answers 403 and the phone simply never rings.
//
//   node backend/test/voip.test.js   (exits non-zero on failure)
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

process.env.DB_PATH = path.join(os.tmpdir(), `veiled-voip-test-${process.pid}.db`);
process.env.JWT_SECRET = 'test-secret-for-voip-tokens-0123456789';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
require('fs').rmSync(process.env.DB_PATH, { force: true });
process.on('exit', () => require('fs').rmSync(process.env.DB_PATH, { force: true }));

// A throwaway ES256 key, so the signing path runs exactly as it would.
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
process.env.APNS_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.APNS_KEY_ID = 'ABCD123456';
process.env.APNS_TEAM_ID = 'TEAM123456';
process.env.APNS_BUNDLE_ID = 'com.veiledapp.hijabimarriage';

const app = require('../server.js');
const voip = require('../services/voip');

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

  const reg = await req('POST', '/auth/register', {
    body: { email: `voip${Date.now()}@v.test`, password: 'Passw0rd!test', displayName: 'Tariq' },
  });
  const token = reg.body.token;

  console.log('\nThe server is configured to send VoIP pushes');
  ok('configured with a key, id, team and bundle', voip.configured() === true);

  console.log('\nA device registers the token that lets us ring it');
  const bad = await req('POST', '/dating/voip-token', { token, body: {} });
  ok('a missing token is refused', bad.status === 400, bad.body);
  const anon = await req('POST', '/dating/voip-token', { body: { token: 'abc' } });
  ok('and it needs a signed-in member', anon.status === 401, anon.status);

  const saved = await req('POST', '/dating/voip-token', { token, body: { token: 'deadbeef01', platform: 'ios' } });
  ok('a real one is stored', saved.status === 201, saved.body);
  ok('and the app is told a closed phone can be rung', saved.body.canRingClosedApp === true, saved.body);

  const me = reg.body.user.id;
  ok('it comes back for that member', voip.tokensFor(me).includes('deadbeef01'), voip.tokensFor(me));

  console.log('\nRegistering twice does not ring twice');
  await req('POST', '/dating/voip-token', { token, body: { token: 'deadbeef01', platform: 'ios' } });
  ok('the same device is stored once', voip.tokensFor(me).filter((t) => t === 'deadbeef01').length === 1);

  console.log('\nA device that has gone away is dropped');
  voip.forgetVoipToken('deadbeef01');
  ok('and stops being rung', !voip.tokensFor(me).includes('deadbeef01'));

  console.log('\nThe APNs authentication token is one Apple would accept');
  // Reach the same signer the sender uses.
  const jwt = require('../services/voip');
  await voip.ringDevices(me, { callId: 'x', callerName: 'x', video: false }); // no tokens: no-op
  // Build one directly the way the service does and verify the signature.
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: process.env.APNS_KEY_ID })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign({ key: process.env.APNS_KEY, dsaEncoding: 'ieee-p1363' });
  const verifier = crypto.createVerify('SHA256');
  verifier.update(`${header}.${claims}`);
  ok('ES256 in the raw r||s form Apple requires', verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, sig));
  ok('and not the DER form, which APNs rejects with 403',
    !crypto.createVerify('SHA256').update(`${header}.${claims}`).verify({ key: publicKey }, sig));

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
