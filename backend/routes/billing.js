// ─── Billing / IAP routes ───────────────────────────────────────────
// The client purchases through StoreKit / Play Billing, then verifies the
// receipt here so entitlements (Gold, Roses) are granted server-side and
// can't be spoofed. RevenueCat webhooks keep subscription state in sync.

const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const payments = require('../services/payments');
const analytics = require('../services/analytics');

const router = express.Router();

function grant(userId, ent) {
  if (!ent) return;
  if (ent.type === 'gold') {
    const until = Date.now() + 31 * 24 * 3600000; // extend ~1 month
    db.prepare('UPDATE dating_profiles SET is_gold = 1, gold_until = ? WHERE user_id = ?').run(until, userId);
  } else if (ent.type === 'roses') {
    db.prepare('INSERT INTO dating_limits (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING').run(userId);
    db.prepare('UPDATE dating_limits SET roses = roses + ? WHERE user_id = ?').run(ent.amount, userId);
  }
  analytics.track(userId, 'purchase_granted', ent);
}

// GET /api/billing/products — product ids the client should offer.
router.get('/products', (req, res) => res.json({ products: payments.products() }));

// POST /api/billing/verify { platform, receipt|productId+token }
// Verifies a purchase and grants the entitlement.
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { platform, receipt, productId, token, isSubscription = true } = req.body || {};
    let result;
    if (platform === 'ios') result = await payments.verifyApple(receipt);
    else if (platform === 'android') result = await payments.verifyGoogle(productId, token, isSubscription);
    else return res.status(400).json({ error: 'platform must be ios or android' });

    if (!result.ok) return res.status(402).json({ error: 'Receipt not valid', detail: result });
    const ent = payments.entitlementFor(result.productId || productId);
    if (!ent) return res.status(400).json({ error: 'Unknown product' });
    grant(req.userId, ent);
    res.json({ ok: true, entitlement: ent, expiresAt: result.expiresAt || null });
  } catch (err) {
    console.error('Billing verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/billing/webhook — RevenueCat server-to-server events.
router.post('/webhook', (req, res) => {
  if (!payments.verifyRevenueCatSignature(req)) return res.status(401).json({ error: 'bad signature' });
  const ev = req.body && req.body.event;
  if (!ev) return res.json({ ok: true });
  const userId = Number(ev.app_user_id);
  const type = ev.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, NON_RENEWING_PURCHASE
  try {
    if (['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE'].includes(type)) {
      grant(userId, payments.entitlementFor(ev.product_id));
    } else if (['EXPIRATION', 'CANCELLATION'].includes(type)) {
      db.prepare('UPDATE dating_profiles SET is_gold = 0, gold_until = 0 WHERE user_id = ?').run(userId);
    }
  } catch (e) {
    console.error('Webhook grant error:', e.message);
  }
  res.json({ ok: true });
});

module.exports = router;
