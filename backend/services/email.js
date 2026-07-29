// ─── Transactional email ────────────────────────────────────────────
// Verification codes, receipts, safety notices. SMTP (nodemailer) or
// Postmark. Logs to console when unconfigured so flows still complete in
// development.

const { config, safeRequire } = require('./config');

let transport = null;
function smtp() {
  if (transport) return transport;
  const nodemailer = safeRequire('nodemailer');
  if (!nodemailer) return null;
  const { host, port, user, pass } = config.email.smtp;
  transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined });
  return transport;
}

async function send({ to, subject, text, html }) {
  const provider = config.email.provider;
  try {
    if (provider === 'smtp') {
      const t = smtp();
      if (t) { await t.sendMail({ from: config.email.from, to, subject, text, html }); return { ok: true }; }
    }
    if (provider === 'postmark') {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Postmark-Server-Token': config.email.postmarkToken },
        body: JSON.stringify({ From: config.email.from, To: to, Subject: subject, TextBody: text, HtmlBody: html }),
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `postmark ${res.status}` };
    }
  } catch (e) {
    console.error('[email] send failed:', e.message);
    return { ok: false, error: e.message };
  }
  console.log(`[email:dev] to=${to} subject="${subject}"\n${text || ''}`);
  return { ok: true, dev: true };
}

module.exports = { send };
