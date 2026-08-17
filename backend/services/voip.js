const http2 = require('http2');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');

// ─── VoIP pushes ────────────────────────────────────────────────────
// A socket only reaches an app that is running. To ring a phone whose
// owner has closed Veiled — which is most of the time — the call has to
// arrive as a VoIP push, and iOS then wakes the app long enough to hand
// the call to CallKit.
//
// This talks to APNs directly over HTTP/2 with a JWT signed by the .p8
// key. Nothing needs installing for that; node has both. Expo's push
// service cannot do this — VoIP pushes use a different token, a
// different topic, and a certificate Expo does not hold.
//
// Configure with:
//   APNS_KEY_PATH   path to AuthKey_XXXXXXXX.p8   (or APNS_KEY, its text)
//   APNS_KEY_ID     the key's 10-character id
//   APNS_TEAM_ID    your Apple team id
//   APNS_BUNDLE_ID  app.veiled...  (the topic becomes <bundle>.voip)
//   APNS_ENV        sandbox | production   (default: production)

const KEY_ID = process.env.APNS_KEY_ID || '';
const TEAM_ID = process.env.APNS_TEAM_ID || '';
const BUNDLE_ID = process.env.APNS_BUNDLE_ID || '';
const ENV = process.env.APNS_ENV === 'sandbox' ? 'sandbox' : 'production';
const HOST = ENV === 'sandbox'
  ? 'https://api.sandbox.push.apple.com'
  : 'https://api.push.apple.com';

let privateKey = null;
try {
  if (process.env.APNS_KEY) privateKey = process.env.APNS_KEY.replace(/\\n/g, '\n');
  else if (process.env.APNS_KEY_PATH) privateKey = fs.readFileSync(process.env.APNS_KEY_PATH, 'utf8');
} catch (err) {
  console.error('[voip] could not read the APNs key:', err.message);
}

const configured = () => !!(privateKey && KEY_ID && TEAM_ID && BUNDLE_ID);

// APNs wants a fresh-ish token but rejects one made more than once an
// hour, so it is cached and remade every 40 minutes.
let cachedToken = null;
let cachedAt = 0;
function authToken() {
  const now = Date.now();
  if (cachedToken && now - cachedAt < 40 * 60000) return cachedToken;
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(now / 1000) })).toString('base64url');
  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${claims}`);
  // ES256 signatures must be in the raw r||s form, not DER.
  const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  cachedToken = `${header}.${claims}.${signature}`;
  cachedAt = now;
  return cachedToken;
}

// ── Tokens ──────────────────────────────────────────────────────────
// Kept apart from the ordinary push tokens: a VoIP token is a different
// token for a different topic, and sending one to the other silently
// does nothing.
db.exec(`
  CREATE TABLE IF NOT EXISTS voip_tokens (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT DEFAULT 'ios',
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, token)
  );
`);

function saveVoipToken(userId, token, platform = 'ios') {
  if (!token) return;
  db.prepare(`
    INSERT INTO voip_tokens (user_id, token, platform, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, token) DO UPDATE SET updated_at = excluded.updated_at
  `).run(userId, String(token), platform, Date.now());
}

const forgetVoipToken = (token) =>
  db.prepare('DELETE FROM voip_tokens WHERE token = ?').run(String(token));

const tokensFor = (userId) =>
  db.prepare('SELECT token FROM voip_tokens WHERE user_id = ?').all(userId).map((r) => r.token);

// ── Sending ─────────────────────────────────────────────────────────
function push(deviceToken, payload) {
  return new Promise((resolve) => {
    const client = http2.connect(HOST);
    const body = JSON.stringify(payload);
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${authToken()}`,
      'apns-topic': `${BUNDLE_ID}.voip`,
      'apns-push-type': 'voip',
      // A call is worth nothing in ten minutes' time.
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 30),
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });
    let status = 0;
    let data = '';
    req.on('response', (headers) => { status = headers[':status']; });
    req.setEncoding('utf8');
    req.on('data', (c) => { data += c; });
    req.on('end', () => { client.close(); resolve({ status, data }); });
    req.on('error', (err) => { client.close(); resolve({ status: 0, data: err.message }); });
    req.end(body);
  });
}

// Ring `userId`'s devices. Returns how many were reached — the caller
// uses that to tell a caller "they're not reachable" rather than leaving
// the line open to nobody.
async function ringDevices(userId, { callId, callerName, video }) {
  if (!configured()) return 0;
  const tokens = tokensFor(userId);
  if (!tokens.length) return 0;

  let delivered = 0;
  await Promise.all(tokens.map(async (token) => {
    const res = await push(token, { callId, callerName, video: !!video, ts: Date.now() });
    if (res.status === 200) { delivered++; return; }
    // 410 means the app is gone from that device; 400 BadDeviceToken the
    // same in practice. Keeping them means ringing nothing forever.
    if (res.status === 410 || /BadDeviceToken|Unregistered/.test(res.data || '')) {
      forgetVoipToken(token);
    } else if (res.status) {
      console.error(`[voip] APNs ${res.status}: ${String(res.data).slice(0, 200)}`);
    }
  }));
  return delivered;
}

module.exports = { configured, saveVoipToken, forgetVoipToken, tokensFor, ringDevices };
