// ─── Identity verification routes ───────────────────────────────────
// start() hands the client a provider session token; the provider posts
// to /webhook when the selfie/liveness check passes and we flip the
// user's selfie_verified flag. Replaces the UI-only verification screen.

const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const verification = require('../services/verification');
const { emitToUser } = require('../realtime');
const analytics = require('../services/analytics');

const router = express.Router();

// POST /api/verification/start — begin a verification session.
router.post('/start', authenticate, async (req, res) => {
  try {
    if (!verification.enabled()) return res.status(503).json({ error: 'Verification not configured', provider: 'none' });
    const out = await verification.start(req.userId, { referenceId: String(req.userId) });
    if (!out.ok) return res.status(502).json({ error: 'Could not start verification', detail: out });
    res.json(out);
  } catch (err) {
    console.error('Verification start error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/verification/webhook — provider callback (raw body needed).
router.post('/webhook', (req, res) => {
  const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
  const out = verification.verifyWebhook(req, raw);
  if (!out.ok) return res.status(401).json({ error: 'bad signature' });
  if (out.passed && out.userId) {
    db.prepare('UPDATE dating_profiles SET selfie_verified = 1 WHERE user_id = ?').run(out.userId);
    emitToUser(out.userId, 'verified', { ok: true });
    analytics.track(out.userId, 'identity_verified', {});
  }
  res.json({ ok: true });
});

module.exports = router;
