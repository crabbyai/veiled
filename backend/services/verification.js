// ─── Identity / selfie verification ─────────────────────────────────
// Real liveness + document/selfie checks via Persona or Onfido. The
// client opens the provider's flow with a session token from start();
// the provider calls our webhook when the check passes, and we mark the
// user selfie_verified. Replaces the UI-only verification screen.

const crypto = require('crypto');
const { config } = require('./config');

const enabled = () => config.verification.provider !== 'none';

// Create a verification session/inquiry for a user. Returns a token the
// client hands to the provider SDK.
async function start(userId, { referenceId } = {}) {
  const v = config.verification;
  if (v.provider === 'persona') {
    const res = await fetch('https://api.withpersona.com/api/v1/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${v.personaApiKey}`, 'Persona-Version': '2023-01-05' },
      body: JSON.stringify({ data: { attributes: { 'inquiry-template-id': v.personaTemplateId, 'reference-id': referenceId || String(userId) } } }),
    });
    const data = await res.json();
    const inquiryId = data?.data?.id;
    const sessionToken = data?.meta?.['session-token'];
    return { ok: !!inquiryId, provider: 'persona', inquiryId, sessionToken };
  }
  if (v.provider === 'onfido') {
    const res = await fetch('https://api.onfido.com/v3.6/sdk_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token token=${v.onfidoApiToken}` },
      body: JSON.stringify({ applicant_id: referenceId }),
    });
    const data = await res.json();
    return { ok: !!data.token, provider: 'onfido', sessionToken: data.token };
  }
  return { ok: false, provider: 'none', error: 'verification_unconfigured' };
}

// Validate an incoming provider webhook. Returns { ok, userId?, passed? }.
function verifyWebhook(req, rawBody) {
  const v = config.verification;
  try {
    if (v.provider === 'persona') {
      const sig = req.headers['persona-signature'] || '';
      const t = /t=(\d+)/.exec(sig)?.[1];
      const v1 = /v1=([a-f0-9]+)/.exec(sig)?.[1];
      const digest = crypto.createHmac('sha256', v.personaWebhookSecret).update(`${t}.${rawBody}`).digest('hex');
      if (!v1 || digest !== v1) return { ok: false };
      const body = JSON.parse(rawBody);
      const attrs = body?.data?.attributes?.payload?.data?.attributes || {};
      const passed = attrs.status === 'completed' || attrs.status === 'approved';
      const userId = Number(attrs['reference-id']) || null;
      return { ok: true, userId, passed };
    }
    if (v.provider === 'onfido') {
      const sig = req.headers['x-sha2-signature'] || '';
      const digest = crypto.createHmac('sha256', v.onfidoWebhookToken).update(rawBody).digest('hex');
      if (digest !== sig) return { ok: false };
      const body = JSON.parse(rawBody);
      const passed = body?.payload?.object?.status === 'complete';
      return { ok: true, userId: null, passed };
    }
  } catch (e) {
    console.error('[verification] webhook error:', e.message);
  }
  return { ok: false };
}

module.exports = { enabled, start, verifyWebhook };
