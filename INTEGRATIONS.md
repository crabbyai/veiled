# Veiled — Integrations

Every third-party integration is **scaffolded and wired**, and **degrades
gracefully**: with no keys the app runs in demo/offline mode; add the env
vars (and, where noted, `npm i` the SDK) to switch each one on. Nothing
below requires code changes — only configuration.

Check what's live at any time: `GET /api/health` returns an `integrations`
map (`storage`, `moderation`, `email`, `payments`, `verification`, `geo`,
`sms`, `analytics`).

Server config lives in `backend/.env` (see `backend/.env.example`).
Client config lives in `.env` as `EXPO_PUBLIC_*` (see `.env.example`).

---

## 1. Payments / In-App Purchases — Gold & Roses
- **Why:** revenue; Gold gating and Roses are already enforced everywhere.
- **Recommended:** RevenueCat (wraps StoreKit + Play Billing + webhooks).
- **Client:** `src/muzz/integrations/purchases.js` — `init()`, `getOfferings()`,
  `purchase(pkg)`, `restore()`. `npm i react-native-purchases`. Keys:
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`.
- **Server:** `backend/services/payments.js` + `routes/billing.js`
  (`GET /api/billing/products`, `POST /api/billing/verify`,
  `POST /api/billing/webhook`). Verifies Apple/Google receipts, grants
  entitlements, and syncs subscription state from RevenueCat webhooks.
- **Env:** `REVENUECAT_WEBHOOK_SECRET`, `APPLE_IAP_SHARED_SECRET`,
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (+ `npm i googleapis`), `PRODUCT_*`.
- **Setup:** create the products in App Store Connect / Play Console using
  the `PRODUCT_*` ids, wire them in RevenueCat, point its webhook at
  `/api/billing/webhook` with the shared secret.

## 2. Photo storage — S3 / R2 / Spaces
- **Why:** durable, CDN-served photos (local disk is dev-only).
- **Server:** `backend/services/storage.js`, used by the photo upload route.
  `npm i @aws-sdk/client-s3`.
- **Env:** `STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION`,
  `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (R2/Spaces),
  `S3_PUBLIC_BASE_URL` (CDN).

## 3. Content moderation — photos & messages
- **Why:** App Store safety (UGC), member trust.
- **Server:** `backend/services/moderation.js`. Photos screened on upload
  (rejected → 422); message text runs an always-on filter (blocked → 422).
- **Env:** `MODERATION_PROVIDER=hive` + `HIVE_API_KEY`, or `rekognition` +
  `AWS_REKOGNITION_REGION` (`npm i @aws-sdk/client-rekognition`);
  `TEXT_BLOCKLIST` to extend the text filter.

## 4. Identity / selfie verification — real liveness
- **Why:** replaces the demo selfie screen with a real verified tick.
- **Client:** `src/muzz/integrations/verify.js` (`startVerification()`),
  launched from `VerifyScreen`. Falls back to the guided demo scan offline.
- **Server:** `backend/services/verification.js` + `routes/verification.js`
  (`POST /api/verification/start`, `POST /api/verification/webhook`). The
  webhook flips `selfie_verified` when the provider approves.
- **Env:** Persona (`PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`,
  `PERSONA_WEBHOOK_SECRET`) or Onfido (`ONFIDO_API_TOKEN`,
  `ONFIDO_WEBHOOK_TOKEN`).

## 5. Push notifications — Expo
- **Why:** matches, messages, Roses re-engagement.
- **Client:** `src/muzz/notifications.js` registers the Expo push token on
  launch; **already wired** to `POST /api/dating/push-token`.
- **Server:** `backend/push.js` sends via the Expo push API (works out of
  the box on a native build; no extra keys for Expo push).

## 6. Phone verification — Twilio Verify (OTP)
- **Server:** `backend/services/sms.js` + `routes/auth.js`
  (`POST /api/auth/phone/start`, `/phone/verify`). Dev code is `000000`.
- **Env:** `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`.

## 7. Transactional email — SMTP / Postmark
- **Server:** `backend/services/email.js`. Logs to console until configured.
- **Env:** `EMAIL_PROVIDER=smtp` (`SMTP_*`, `npm i nodemailer`) or
  `postmark` (`POSTMARK_TOKEN`); `EMAIL_FROM`.

## 8. Geocoding — real distance & Passport
- **Server:** `backend/services/geo.js`. Built-in city table + haversine
  fallback (Passport cities already resolve offline); Google/Mapbox for
  arbitrary addresses.
- **Env:** `GEO_PROVIDER=google` + `GOOGLE_MAPS_API_KEY`, or `mapbox` +
  `MAPBOX_TOKEN`.

## 9. Analytics & crash reporting
- **Client:** `src/muzz/integrations/analytics.js` (PostHog,
  `npm i posthog-react-native`, `EXPO_PUBLIC_POSTHOG_KEY`) and
  `src/muzz/integrations/errors.js` (Sentry, `npm i @sentry/react-native`,
  `EXPO_PUBLIC_SENTRY_DSN`). Initialised at app start; identify on hydrate.
- **Server:** `backend/services/analytics.js` (PostHog, `POSTHOG_API_KEY`).

---

### Install everything (optional SDKs)
```
# server
cd backend && npm i @aws-sdk/client-s3 @aws-sdk/client-rekognition nodemailer googleapis
# client
npm i react-native-purchases posthog-react-native @sentry/react-native
```
Then fill in `.env` (client) and `backend/.env` (server). Re-check
`GET /api/health` — each integration should flip from `local`/`none` to
its provider name.
