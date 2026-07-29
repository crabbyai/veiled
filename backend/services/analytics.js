// ─── Server-side analytics ──────────────────────────────────────────
// Fire-and-forget product events (matches, roses, purchases). PostHog by
// default; no-op when unconfigured. Never blocks or throws in a request.

const { config } = require('./config');

async function track(userId, event, props = {}) {
  if (config.analytics.provider !== 'posthog') return;
  try {
    await fetch(`${config.analytics.posthogHost}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: config.analytics.posthogKey, event, distinct_id: String(userId), properties: props, timestamp: new Date().toISOString() }),
    });
  } catch (e) {
    // analytics must never affect the request path
  }
}

module.exports = { track };
