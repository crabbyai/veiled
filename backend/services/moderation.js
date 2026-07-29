// ─── Content moderation ─────────────────────────────────────────────
// Photos are screened for nudity/violence and message text for abuse.
// Providers: Hive or AWS Rekognition (images). A lightweight always-on
// text filter runs regardless of provider. Fails open (allows) if a
// provider is unconfigured, but never crashes a request.

const fs = require('fs');
const { config, safeRequire } = require('./config');

// Always-on minimal text safety net (extend via TEXT_BLOCKLIST env).
const BASE_BLOCK = ['child', 'cp ', 'rape'];
function checkText(text) {
  const t = String(text || '').toLowerCase();
  const list = [...BASE_BLOCK, ...config.moderation.textBlocklist];
  const hit = list.find((w) => w && t.includes(w));
  return { ok: !hit, reason: hit ? 'blocked_term' : null };
}

// Screen an image file. Returns { ok, labels?, reason? }.
async function checkImage(localPath) {
  const provider = config.moderation.provider;
  try {
    if (provider === 'hive') return await hive(localPath);
    if (provider === 'rekognition') return await rekognition(localPath);
  } catch (e) {
    console.error('[moderation] image check failed, allowing:', e.message);
  }
  return { ok: true, reason: provider === 'none' ? 'unconfigured' : 'error_failed_open' };
}

async function hive(localPath) {
  const key = config.moderation.hiveApiKey;
  const buf = fs.readFileSync(localPath);
  const form = new FormData();
  form.append('media', new Blob([buf]));
  const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
    method: 'POST', headers: { authorization: `token ${key}` }, body: form,
  });
  const data = await res.json();
  // Interpret Hive's nudity/violence classes; threshold at 0.8.
  const classes = data?.status?.[0]?.response?.output?.[0]?.classes || [];
  const flagged = classes.filter((c) => /nsfw|nudity|sexual|violence|gore/i.test(c.class) && c.score >= 0.8);
  return { ok: flagged.length === 0, labels: flagged.map((c) => c.class), reason: flagged.length ? 'nsfw' : null };
}

async function rekognition(localPath) {
  const AWS = safeRequire('@aws-sdk/client-rekognition');
  if (!AWS) return { ok: true, reason: 'sdk_missing_failed_open' };
  const client = new AWS.RekognitionClient({ region: config.moderation.rekognitionRegion });
  const Bytes = fs.readFileSync(localPath);
  const out = await client.send(new AWS.DetectModerationLabelsCommand({ Image: { Bytes }, MinConfidence: 80 }));
  const labels = (out.ModerationLabels || []).map((l) => l.Name);
  const bad = labels.some((n) => /explicit|nudity|sexual|violence|gore/i.test(n));
  return { ok: !bad, labels, reason: bad ? 'nsfw' : null };
}

module.exports = { checkText, checkImage };
