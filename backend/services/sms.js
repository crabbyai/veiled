// ─── Phone verification (OTP) ───────────────────────────────────────
// Sends and checks one-time codes via Twilio Verify. Falls back to a
// dev flow (code 000000, logged) when unconfigured so onboarding still
// works locally. Wire: routes/auth.js phone endpoints.

const { config } = require('./config');

const enabled = () => config.sms.provider === 'twilio';

async function sendCode(phone) {
  if (!enabled()) { console.log(`[sms:dev] OTP for ${phone} = 000000`); return { ok: true, dev: true }; }
  const { twilioSid, twilioToken, twilioVerifyService } = config.sms;
  const res = await fetch(`https://verify.twilio.com/v2/Services/${twilioVerifyService}/Verifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64') },
    body: new URLSearchParams({ To: phone, Channel: 'sms' }),
  });
  return { ok: res.ok };
}

async function checkCode(phone, code) {
  if (!enabled()) return { ok: code === '000000' };
  const { twilioSid, twilioToken, twilioVerifyService } = config.sms;
  const res = await fetch(`https://verify.twilio.com/v2/Services/${twilioVerifyService}/VerificationCheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64') },
    body: new URLSearchParams({ To: phone, Code: code }),
  });
  const d = await res.json();
  return { ok: d.status === 'approved' };
}

module.exports = { enabled, sendCode, checkCode };
