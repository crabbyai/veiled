const crypto = require('crypto');

// ─── ICE servers for calls ──────────────────────────────────────────
// WebRTC needs to know how to find the other device. STUN is enough on
// most home networks; symmetric NAT and a good share of mobile carriers
// need a TURN relay, and without one those calls ring, negotiate, and
// then connect to silence.
//
// TURN credentials are issued here rather than shipped in the app.
// A long-lived username and password compiled into a client bundle can
// be pulled out of it and used to relay anyone's traffic at your
// expense; these are derived per user and expire, which is what coturn's
// `use-auth-secret` mode is for.
//
// Configure with:
//   TURN_URLS      turn:turn.example.com:3478?transport=udp,turns:...:5349
//   TURN_SECRET    the same value as coturn's `static-auth-secret`
//   TURN_TTL       seconds a credential stays valid (default 12h)
// or, for a server that only does static credentials:
//   TURN_URLS + TURN_USERNAME + TURN_PASSWORD

const STUN = (process.env.STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
  .split(',').map((s) => s.trim()).filter(Boolean);

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

const TURN_URLS = list(process.env.TURN_URLS);
const TURN_SECRET = process.env.TURN_SECRET || '';
const TURN_USERNAME = process.env.TURN_USERNAME || '';
const TURN_PASSWORD = process.env.TURN_PASSWORD || '';
const TTL = Math.max(60, parseInt(process.env.TURN_TTL || '43200', 10) || 43200);

// coturn's REST scheme: the username is "<unix expiry>:<id>" and the
// password is the HMAC of it under the shared secret. coturn recomputes
// the same HMAC to check it, so nothing has to be stored anywhere.
function ephemeral(userId, now = Date.now()) {
  const expiry = Math.floor(now / 1000) + TTL;
  const username = `${expiry}:${userId}`;
  const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
  return { username, credential, expiry };
}

// Whether a relay is configured at all. The app tells people a call may
// not connect when this is false rather than letting it fail silently.
const hasRelay = () => TURN_URLS.length > 0 && (!!TURN_SECRET || (!!TURN_USERNAME && !!TURN_PASSWORD));

function iceServersFor(userId, now = Date.now()) {
  const servers = [{ urls: STUN }];
  if (TURN_URLS.length) {
    if (TURN_SECRET) {
      const { username, credential } = ephemeral(userId, now);
      servers.push({ urls: TURN_URLS, username, credential });
    } else if (TURN_USERNAME && TURN_PASSWORD) {
      servers.push({ urls: TURN_URLS, username: TURN_USERNAME, credential: TURN_PASSWORD });
    }
  }
  return { iceServers: servers, relay: hasRelay(), ttl: TTL };
}

module.exports = { iceServersFor, hasRelay, ephemeral, TTL };
