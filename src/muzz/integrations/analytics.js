// ─── Product analytics ──────────────────────────────────────────────
// PostHog wrapper with a no-op fallback. Import the singleton and call
// track()/identify() anywhere; safe on web and when unconfigured.

import { Platform } from 'react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let client = null;
let tried = false;

function get() {
  if (tried) return client;
  tried = true;
  if (!KEY || Platform.OS === 'web') return null;
  try {
    const PostHog = require('posthog-react-native').default;
    client = new PostHog(KEY, { host: HOST });
  } catch { client = null; }
  return client;
}

export function identify(userId, traits = {}) {
  const c = get();
  if (c) { try { c.identify(String(userId), traits); } catch {} }
}

export function track(event, props = {}) {
  const c = get();
  if (c) { try { c.capture(event, props); } catch {} }
}

export function screen(name, props = {}) {
  const c = get();
  if (c) { try { c.screen(name, props); } catch {} }
}
