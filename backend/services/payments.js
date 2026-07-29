// ─── Payments / IAP ─────────────────────────────────────────────────
// Verifies App Store / Google Play purchase receipts and interprets
// RevenueCat webhooks, then grants entitlements (Gold, Roses). The client
// buys through StoreKit/Play Billing (see src/muzz/integrations/purchases.js)
// and sends the receipt/token here for server-side verification.

const crypto = require('crypto');
const { config, safeRequire } = require('./config');

// Verify an Apple App Store receipt. Returns { ok, productId?, expiresAt? }.
async function verifyApple(receiptData) {
  const body = { 'receipt-data': receiptData, password: config.payments.appleSharedSecret, 'exclude-old-transactions': true };
  const call = async (url) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  let data = await call('https://buy.itunes.apple.com/verifyReceipt');
  if (data.status === 21007) data = await call('https://sandbox.itunes.apple.com/verifyReceipt'); // sandbox receipt
  if (data.status !== 0) return { ok: false, status: data.status };
  const latest = (data.latest_receipt_info || []).sort((a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms))[0];
  return { ok: true, productId: latest?.product_id, expiresAt: latest?.expires_date_ms ? Number(latest.expires_date_ms) : null };
}

// Verify a Google Play purchase token via the Android Publisher API.
async function verifyGoogle(productId, purchaseToken, isSub = true) {
  const sa = config.payments.googleServiceAccount;
  const google = safeRequire('googleapis');
  if (!sa || !google) return { ok: false, error: 'google_unconfigured' };
  const creds = JSON.parse(sa);
  const auth = new google.google.auth.JWT(creds.client_email, null, creds.private_key, ['https://www.googleapis.com/auth/androidpublisher']);
  const publisher = google.google.androidpublisher({ version: 'v3', auth });
  const pkg = process.env.ANDROID_PACKAGE || 'com.veiledapp.hijabimarriage';
  const res = isSub
    ? await publisher.purchases.subscriptions.get({ packageName: pkg, subscriptionId: productId, token: purchaseToken })
    : await publisher.purchases.products.get({ packageName: pkg, productId, token: purchaseToken });
  const d = res.data;
  return { ok: true, productId, expiresAt: d.expiryTimeMillis ? Number(d.expiryTimeMillis) : null };
}

// Validate a RevenueCat webhook signature (Authorization: Bearer <secret>).
function verifyRevenueCatSignature(req) {
  const secret = config.payments.revenuecatWebhookSecret;
  if (!secret) return false;
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  // Constant-time compare
  const a = Buffer.from(token); const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Map a product id → entitlement grant.
function entitlementFor(productId) {
  const p = config.payments.products;
  if (productId === p.goldMonthly || productId === p.goldAnnual) return { type: 'gold' };
  if (productId === p.roses3) return { type: 'roses', amount: 3 };
  if (productId === p.roses12) return { type: 'roses', amount: 12 };
  return null;
}

module.exports = { verifyApple, verifyGoogle, verifyRevenueCatSignature, entitlementFor, products: () => config.payments.products };
