require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In production, refuse to boot with the built-in dev JWT secret — a
// predictable secret would let anyone forge auth tokens.
if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'veiled-dev-secret')) {
  console.error('FATAL: set a strong JWT_SECRET before running in production');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a proxy/load balancer (Fly, Render, etc.) so rate limiting and
// secure cookies read the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

// ---- Middleware ----

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// ---- Routes ----

const authRoutes = require('./routes/auth');
const datingRoutes = require('./routes/dating');
const { seedDating } = require('./seed-dating');

seedDating();

app.use('/api/auth', authRoutes);
app.use('/api/dating', datingRoutes);

// Health check — also probes the database so load balancers can tell a
// live-but-broken instance from a healthy one.
const db = require('./db');
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try { dbOk = db.prepare('SELECT 1 AS ok').get().ok === 1; } catch { dbOk = false; }
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded', app: 'veiled', db: dbOk,
    timestamp: Date.now(), version: '1.0.0',
  });
});

// ── Friend's Take: public vouch page ─────────────────────────────────
// The shareable link a member sends to family/friends. It's a tiny
// self-contained page that reads the invite preview and submits a vouch
// through the public API — no app install or account required.
app.get('/vouch/:token', (req, res) => {
  const token = String(req.params.token).replace(/[^a-zA-Z0-9]/g, '');
  res.type('html').send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vouch on Veiled</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background:#0E0E10; color:#F2ECE4; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  .card { width:100%; max-width:440px; background:#17171A; border:1px solid #2A2A2E; border-radius:24px; padding:28px; }
  h1 { font-size:22px; margin:0 0 4px; }
  p.sub { color:#A6A0A8; margin:0 0 22px; font-size:15px; line-height:1.4; }
  label { display:block; font-size:13px; font-weight:700; margin:16px 0 6px; color:#C9C3CB; }
  input, textarea, select { width:100%; padding:13px 14px; border-radius:14px; border:1px solid #2A2A2E;
    background:#0E0E10; color:#F2ECE4; font-size:15px; font-family:inherit; }
  textarea { min-height:110px; resize:vertical; }
  button { width:100%; margin-top:22px; padding:15px; border:0; border-radius:999px; font-size:16px; font-weight:800;
    color:#111; background:linear-gradient(90deg,#EBE4D8,#C9BFA9); cursor:pointer; }
  button:disabled { opacity:.5; }
  .ok, .err { text-align:center; padding:8px; border-radius:12px; margin-top:16px; font-size:14px; display:none; }
  .ok { background:#14361f; color:#8fe0aa; } .err { background:#3a1414; color:#e08f8f; }
  .done { text-align:center; }
</style></head>
<body>
  <div class="card" id="card">
    <div id="form-wrap">
      <h1 id="title">A word for someone you love</h1>
      <p class="sub" id="sub">Loading…</p>
      <div id="form" style="display:none">
        <label>Your name</label>
        <input id="author" maxlength="60" placeholder="e.g. Aisha" />
        <label>How you know them</label>
        <input id="relationship" maxlength="40" placeholder="e.g. Sister, close friend" />
        <label>Your vouch</label>
        <textarea id="text" maxlength="500" placeholder="Share honestly what makes them a wonderful person to marry."></textarea>
        <button id="submit">Send vouch</button>
        <div class="ok" id="ok">Thank you — your vouch has been added. 🤍</div>
        <div class="err" id="err"></div>
      </div>
    </div>
  </div>
<script>
  var token = ${JSON.stringify(token)};
  var base = '/api/dating/friend-takes/invite/' + token;
  var sub = document.getElementById('sub'), form = document.getElementById('form');
  var title = document.getElementById('title');
  fetch(base).then(function(r){ return r.json().then(function(d){ return { ok:r.ok, d:d }; }); })
    .then(function(res){
      if (!res.ok) { sub.textContent = res.d.error || 'This invite is no longer valid.'; return; }
      title.textContent = 'Vouch for ' + res.d.name;
      sub.textContent = 'You have been asked to share a Friend\\'s Take on ' + res.d.name +
        (res.d.city ? ' in ' + res.d.city : '') + '. It will appear on their Veiled profile.';
      if (res.d.relationship) document.getElementById('relationship').value = res.d.relationship;
      form.style.display = 'block';
    })
    .catch(function(){ sub.textContent = 'Something went wrong loading this invite.'; });

  document.getElementById('submit') && document.getElementById('submit').addEventListener('click', function(){
    var btn = this, ok = document.getElementById('ok'), err = document.getElementById('err');
    err.style.display = 'none';
    var payload = {
      author: document.getElementById('author').value.trim(),
      relationship: document.getElementById('relationship').value.trim(),
      text: document.getElementById('text').value.trim()
    };
    if (!payload.text) { err.textContent = 'Please write a short vouch.'; err.style.display='block'; return; }
    btn.disabled = true;
    fetch(base, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      .then(function(r){ return r.json().then(function(d){ return { ok:r.ok, d:d }; }); })
      .then(function(res){
        if (res.ok) { form.innerHTML = '<div class="done"><h1>Thank you 🤍</h1><p class="sub">Your vouch has been added to their profile.</p></div>'; }
        else { err.textContent = res.d.error || 'Could not submit.'; err.style.display='block'; btn.disabled=false; }
      })
      .catch(function(){ err.textContent = 'Network error — please try again.'; err.style.display='block'; btn.disabled=false; });
  });
</script>
</body></html>`);
});

// ── Share my profile: public read-only card ──────────────────────────
// The page a member shares (e.g. with a wali). Photos are never exposed.
app.get('/p/:token', (req, res) => {
  const token = String(req.params.token).replace(/[^a-zA-Z0-9]/g, '');
  res.type('html').send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>A Veiled profile</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background:#0E0E10; color:#F2ECE4; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
  .card { width:100%; max-width:460px; background:#17171A; border:1px solid #2A2A2E; border-radius:24px; padding:28px; }
  .veil { display:flex; align-items:center; gap:8px; font-size:12px; color:#A6A0A8; margin-bottom:18px; }
  h1 { font-size:24px; margin:0 0 2px; } .loc { color:#A6A0A8; margin:0 0 18px; font-size:15px; }
  .badge { display:inline-block; background:#0E0E10; border:1px solid #2A2A2E; border-radius:999px; padding:5px 12px; font-size:13px; margin:0 6px 8px 0; }
  .verify { color:#7fc6ff; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.6px; color:#A6A0A8; margin:22px 0 10px; }
  p.bio { line-height:1.5; font-size:15px; margin:0; }
  .prompt { background:#0E0E10; border:1px solid #2A2A2E; border-radius:14px; padding:14px; margin-bottom:10px; }
  .prompt .q { font-size:12px; color:#A6A0A8; margin:0 0 4px; } .prompt .a { margin:0; font-size:15px; }
  .sub { color:#A6A0A8; font-size:14px; }
</style></head>
<body><div class="card" id="card"><p class="sub" id="loading">Loading…</p></div>
<script>
  var token = ${JSON.stringify(token)};
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  fetch('/api/dating/p/' + token).then(function(r){ return r.json().then(function(d){ return {ok:r.ok, d:d}; }); })
    .then(function(res){
      var c = document.getElementById('card');
      if (!res.ok) { c.innerHTML = '<p class="sub">' + esc(res.d.error || 'This profile link is no longer valid.') + '</p>'; return; }
      var p = res.d, h = '';
      h += '<div class="veil">🤍 Shared from Veiled · photos stay private</div>';
      h += '<h1>' + esc(p.name) + (p.age ? ', ' + esc(p.age) : '') + (p.verified ? ' <span class="verify">✓</span>' : '') + '</h1>';
      h += '<p class="loc">' + [esc(p.job), esc(p.city)].filter(Boolean).join(' · ') + '</p>';
      var chips = [];
      if (p.veil) chips.push(p.veil === 'Niqab' ? 'Niqabi' : 'Hijabi');
      [p.intention, p.sect, p.prayerLevel, p.ethnicity, p.height].forEach(function(v){ if (v && v !== 'Prefer not to say') chips.push(v); });
      if (chips.length) h += '<div>' + chips.map(function(x){ return '<span class="badge">' + esc(x) + '</span>'; }).join('') + '</div>';
      if (p.bio) { h += '<h2>About</h2><p class="bio">' + esc(p.bio) + '</p>'; }
      if (p.interests && p.interests.length) { h += '<h2>Interests</h2><div>' + p.interests.map(function(x){ return '<span class="badge">' + esc(x) + '</span>'; }).join('') + '</div>'; }
      if (p.prompts && p.prompts.length) { h += '<h2>In her words</h2>' + p.prompts.map(function(pr){ return '<div class="prompt"><p class="q">' + esc(pr.q) + '</p><p class="a">"' + esc(pr.a) + '"</p></div>'; }).join(''); }
      c.innerHTML = h;
    })
    .catch(function(){ document.getElementById('card').innerHTML = '<p class="sub">Something went wrong loading this profile.</p>'; });
</script>
</body></html>`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Start ----

const http = require('http');
const { init: initRealtime } = require('./realtime');

const httpServer = http.createServer(app);
initRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Veiled API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Realtime: socket.io attached`);
});

// Graceful shutdown: stop accepting connections, then checkpoint & close
// the database so a WAL isn't left mid-write when the platform restarts us.
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully`);
  httpServer.close(() => {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); } catch (e) { console.error('DB close error:', e.message); }
    process.exit(0);
  });
  // Failsafe: don't hang forever if a connection won't drain.
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
