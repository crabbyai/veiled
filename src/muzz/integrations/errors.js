// ─── Crash & error reporting (Sentry) ───────────────────────────────
// Initialise once at app start. No-op when the DSN or SDK is absent.

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let Sentry = null;

export function init() {
  if (!DSN) return false;
  try {
    Sentry = require('@sentry/react-native');
    Sentry.init({ dsn: DSN, tracesSampleRate: 0.2, enableAutoSessionTracking: true });
    return true;
  } catch {
    return false;
  }
}

export function captureException(err, context) {
  if (Sentry) { try { Sentry.captureException(err, context ? { extra: context } : undefined); } catch {} }
  else if (__DEV__) console.error('[error]', err);
}

export function setUser(userId) {
  if (Sentry) { try { Sentry.setUser(userId ? { id: String(userId) } : null); } catch {} }
}
