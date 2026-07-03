// ─── Expo push notifications ────────────────────────────────────────
// Stores per-user Expo push tokens and sends via the Expo push API.
// Fire-and-forget: failures are logged, never block requests.

const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS push_tokens (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT DEFAULT 'unknown',
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, token)
  );
`);

function saveToken(userId, token, platform = 'unknown') {
  db.prepare(`
    INSERT INTO push_tokens (user_id, token, platform, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, token) DO UPDATE SET platform = excluded.platform, updated_at = excluded.updated_at
  `).run(userId, token, platform, Date.now());
}

async function sendPush(userId, title, body, data = {}) {
  try {
    const rows = db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(userId);
    if (!rows.length) return;
    const messages = rows
      .filter((r) => r.token.startsWith('ExponentPushToken'))
      .map((r) => ({ to: r.token, sound: 'default', title, body, data }));
    if (!messages.length) return;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) console.error('Push send failed:', res.status);
  } catch (err) {
    console.error('Push error:', err.message);
  }
}

module.exports = { saveToken, sendPush };
