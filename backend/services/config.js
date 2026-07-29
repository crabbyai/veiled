// ─── Integration configuration ──────────────────────────────────────
// Every third-party integration reads its keys from the environment and
// degrades gracefully when they're absent, so the server always boots.
// `safeRequire` lets us reference an optional SDK without making it a hard
// dependency — install the package (see INTEGRATIONS.md) to activate it.

function safeRequire(name) {
  try { return require(name); } catch { return null; }
}

const env = process.env;
const has = (...keys) => keys.every((k) => !!env[k]);

const config = {
  env: env.NODE_ENV || 'development',

  // Object storage for photos (S3-compatible). Falls back to local disk.
  storage: {
    provider: env.STORAGE_PROVIDER || (has('S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY') ? 's3' : 'local'),
    bucket: env.S3_BUCKET,
    region: env.S3_REGION || 'us-east-1',
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT,            // for R2/Spaces/MinIO
    publicBaseUrl: env.S3_PUBLIC_BASE_URL, // CDN / bucket public URL
  },

  // Content moderation for photos (nudity/violence) and message text.
  moderation: {
    provider: env.MODERATION_PROVIDER || (has('HIVE_API_KEY') ? 'hive' : has('AWS_REKOGNITION_REGION') ? 'rekognition' : 'none'),
    hiveApiKey: env.HIVE_API_KEY,
    rekognitionRegion: env.AWS_REKOGNITION_REGION,
    // Block message text matching these (basic profanity/safety net always on).
    textBlocklist: (env.TEXT_BLOCKLIST || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  },

  // Transactional email (verification, receipts, safety notices).
  email: {
    provider: env.EMAIL_PROVIDER || (has('SMTP_HOST') ? 'smtp' : has('POSTMARK_TOKEN') ? 'postmark' : 'none'),
    from: env.EMAIL_FROM || 'Veiled <no-reply@veiledapp.com>',
    smtp: { host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), user: env.SMTP_USER, pass: env.SMTP_PASS },
    postmarkToken: env.POSTMARK_TOKEN,
  },

  // In-app purchases / subscriptions (Veiled Gold, Roses).
  payments: {
    provider: env.PAYMENTS_PROVIDER || (has('REVENUECAT_WEBHOOK_SECRET') ? 'revenuecat' : 'store'),
    appleSharedSecret: env.APPLE_IAP_SHARED_SECRET,   // App Store Connect
    googleServiceAccount: env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
    revenuecatWebhookSecret: env.REVENUECAT_WEBHOOK_SECRET,
    // Product identifiers must match App Store Connect / Play Console.
    products: {
      goldMonthly: env.PRODUCT_GOLD_MONTHLY || 'com.veiledapp.gold.monthly',
      goldAnnual: env.PRODUCT_GOLD_ANNUAL || 'com.veiledapp.gold.annual',
      roses3: env.PRODUCT_ROSES_3 || 'com.veiledapp.roses.3',
      roses12: env.PRODUCT_ROSES_12 || 'com.veiledapp.roses.12',
    },
  },

  // Identity / selfie verification (liveness).
  verification: {
    provider: env.VERIFICATION_PROVIDER || (has('PERSONA_API_KEY') ? 'persona' : has('ONFIDO_API_TOKEN') ? 'onfido' : 'none'),
    personaApiKey: env.PERSONA_API_KEY,
    personaTemplateId: env.PERSONA_TEMPLATE_ID,
    personaWebhookSecret: env.PERSONA_WEBHOOK_SECRET,
    onfidoApiToken: env.ONFIDO_API_TOKEN,
    onfidoWebhookToken: env.ONFIDO_WEBHOOK_TOKEN,
  },

  // Geocoding for real distances + Passport city coordinates.
  geo: {
    provider: env.GEO_PROVIDER || (has('GOOGLE_MAPS_API_KEY') ? 'google' : has('MAPBOX_TOKEN') ? 'mapbox' : 'none'),
    googleKey: env.GOOGLE_MAPS_API_KEY,
    mapboxToken: env.MAPBOX_TOKEN,
  },

  // Phone verification / OTP.
  sms: {
    provider: env.SMS_PROVIDER || (has('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN') ? 'twilio' : 'none'),
    twilioSid: env.TWILIO_ACCOUNT_SID,
    twilioToken: env.TWILIO_AUTH_TOKEN,
    twilioFrom: env.TWILIO_FROM_NUMBER,
    twilioVerifyService: env.TWILIO_VERIFY_SERVICE_SID,
  },

  // Product analytics (server-side events).
  analytics: {
    provider: env.ANALYTICS_PROVIDER || (has('POSTHOG_API_KEY') ? 'posthog' : 'none'),
    posthogKey: env.POSTHOG_API_KEY,
    posthogHost: env.POSTHOG_HOST || 'https://app.posthog.com',
  },
};

// One-line status of every integration, for /api/health and logs.
function status() {
  return {
    storage: config.storage.provider,
    moderation: config.moderation.provider,
    email: config.email.provider,
    payments: config.payments.provider,
    verification: config.verification.provider,
    geo: config.geo.provider,
    sms: config.sms.provider,
    analytics: config.analytics.provider,
  };
}

module.exports = { config, status, safeRequire, has };
