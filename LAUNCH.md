# Veiled — Launch Guide

Everything needed to get Veiled live on the App Store, split into **what
only you can do** (Apple requires a human) and **what you can hand to
Cowork**. Copy-paste prompts for Cowork are in grey boxes.

**You do not need a Mac.** Expo's EAS builds iOS binaries in the cloud.

Realistic timeline: ~1 hour of your time, then 24–48h waiting on Apple.

---

## Facts about this app (you'll be asked for these)

| Field | Value |
|---|---|
| App name | `Veiled: Hijabi Marriage` |
| Bundle ID | `com.veiledapp.hijabimarriage` |
| Version / Build | `1.0.0` / `1` |
| Expo account | `adeelahmedrahman` |
| Age rating | **17+** (dating app) |
| Category | Primary: **Lifestyle**, Secondary: **Social Networking** |

All listing copy (description, keywords, promo text, privacy answers,
review notes) is already written in **`store/metadata.md`** — you will
copy-paste from it, not write it.

---

# STEP 1 — Things only you can do (~30 min)

Apple ties these to a legal identity and 2FA, so no agent can do them.

### 1a. Join the Apple Developer Program — $99/year
1. Go to <https://developer.apple.com/programs/enroll/>
2. Sign in with your Apple ID (enable 2FA if prompted)
3. Enrol as an **Individual** (fastest — approval is usually same-day;
   "Organization" needs a D-U-N-S number and takes weeks)
4. Wait for the confirmation email before continuing

### 1b. Put your Privacy Policy on the web — 5 min
Apple requires a public URL. The HTML is already written for you at
`store/privacy-policy.html`.

Easiest free option — GitHub Pages:
1. Create a new public repo called `veiled-privacy`
2. Upload `store/privacy-policy.html`, renamed to **`index.html`**
3. Repo **Settings → Pages → Source: main branch** → Save
4. Your URL becomes `https://<your-github-username>.github.io/veiled-privacy/`

Write that URL down — you need it twice (in the app, and in App Store Connect).

### 1c. Decide your support email
Any address you actually read, e.g. `support@yourdomain.com` or a Gmail.
Apple emails users here. Write it down.

### 1d. Create the app record in App Store Connect — 5 min
1. Go to <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**
2. Fill in:
   - Platform: **iOS**
   - Name: `Veiled: Hijabi Marriage`
   - Primary language: **English (U.K.)**
   - Bundle ID: select **`com.veiledapp.hijabimarriage`**
     *(if it isn't listed, create it at
     <https://developer.apple.com/account/resources/identifiers/list>
     first — Identifiers → + → App IDs → App → paste the bundle ID)*
   - SKU: `veiled-001`
   - User Access: Full Access
3. Click Create. Now open the app → **App Information** and copy the
   **Apple ID** number (a ~10-digit number). Write it down.

### 1e. Create an App Store Connect API key — 3 min
This is what lets Cowork upload builds for you without your password.
1. App Store Connect → **Users and Access** → **Integrations** tab → **App Store Connect API**
2. Click **+**, name it `EAS`, Access: **App Manager**, Generate
3. **Download the `.p8` file** (you only get one chance) and note the
   **Key ID** and **Issuer ID** shown on that page
4. Keep the file somewhere safe on your computer

> ⚠️ Treat the `.p8` file, Key ID and Issuer ID like passwords. Give them
> to the EAS CLI when it prompts you — don't paste them into a chat.

---

# STEP 2 — Hand this to Cowork (~10 min)

Open Cowork in this repo and paste this prompt, filling in your four values:

```
Configure Veiled for App Store launch. Run:

node scripts/configure-launch.js \
  --support-email <YOUR SUPPORT EMAIL> \
  --privacy-url <YOUR PRIVACY POLICY URL> \
  --asc-app-id <YOUR APP STORE CONNECT APPLE ID NUMBER>

Then run `node scripts/configure-launch.js --check` and show me the
output. Every row must show a ✓ except the backend API URL. Then commit
and push the change.
```

That single script updates the support email and privacy URL everywhere
in the app, and writes your App Store Connect app ID into `eas.json`.

> **Terms of Use:** already set to Apple's standard EULA, which Apple
> accepts. If you host your own terms later, add `--terms-url <URL>`.

---

# STEP 3 — Build and upload (~20 min, mostly waiting)

Paste this into Cowork:

```
Build and submit Veiled to TestFlight:

1. npm install -g eas-cli
2. eas login          (I will type my Expo password)
3. eas init           (link this project to my Expo account)
4. eas build --platform ios --profile production
   - When it asks to generate a Distribution Certificate and Provisioning
     Profile, say YES to both — let EAS manage them.
   - This takes 10-20 minutes. Wait for it and tell me when it finishes.
5. eas submit --platform ios --latest
   - When it asks for App Store Connect credentials, pause and tell me,
     because I need to provide my API key.

Report any error to me in full rather than guessing a fix.
```

**Your part during this step:** type your Expo password at step 2, and at
step 5 provide the API key from 1e (path to the `.p8` file, Key ID,
Issuer ID). EAS stores them securely for next time.

When it finishes, the build appears in App Store Connect → **TestFlight**
after ~10 minutes of Apple processing. You'll get an email.

---

# STEP 4 — Fill in the listing (~15 min, you)

In App Store Connect, open your app → the **1.0.0 Prepare for Submission**
page. Open `store/metadata.md` beside it and copy-paste each field.

Checklist:

- [ ] **Promotional Text** — from metadata.md
- [ ] **Description** — from metadata.md
- [ ] **Keywords** — from metadata.md
- [ ] **Support URL** — your privacy URL works, or a simple contact page
- [ ] **Privacy Policy URL** — the URL from step 1b
- [ ] **Screenshots** — drag in `store/screenshots/iphone-6.9/` (all 6)
      and `store/screenshots/ipad-13/` (all 6)
- [ ] **App Preview videos** — leave empty (deliberate: avoids a 2.3.8 rejection)
- [ ] **Category** — Lifestyle / Social Networking
- [ ] **Age Rating** — click Edit, answer per the *Age Rating* section of
      metadata.md. It must come out **17+**
- [ ] **App Privacy** — Data Collection questionnaire, answers are in the
      *App Privacy* section of metadata.md
- [ ] **App Review Information** → Notes — paste the *Notes for App
      Review* section from metadata.md
- [ ] **Sign-in required?** — No (the app works without an account)
- [ ] **Build** — click **+**, pick the build that came from step 3

Then click **Add for Review** → **Submit**.

---

# STEP 5 — After you submit

- **In Review** usually within 24h; decision usually within 24–48h.
- If **rejected**, don't panic. Paste Apple's exact message into Cowork:

```
Apple rejected Veiled with this message:
<paste the full rejection text>
Diagnose the real cause, fix it in the code, explain what you changed,
then rebuild and resubmit.
```

- If **approved**, it goes live automatically (or on your chosen date).

---

# Optional — go live with the backend

The app ships fully working in **offline demo mode**. Matching, chat and
profiles run on-device, which is enough to launch and pass review.

To run the real multi-user backend (real accounts, real matches between
real people, photo storage, push):

```
Deploy the Veiled backend from ./backend to Fly.io and point the app at it:

1. Read backend/README.md and INTEGRATIONS.md first.
2. Deploy backend/ (it has a Dockerfile). Set at minimum:
   - JWT_SECRET  (generate a long random string)
   - NODE_ENV=production
   - a persistent volume for DB_PATH and UPLOAD_DIR
3. Confirm https://<my-api-domain>/api/health returns status ok.
4. Run: node scripts/configure-launch.js --api-url https://<my-api-domain>
5. Rebuild and resubmit as in STEP 3.
```

Turning on paid Gold, real photo storage, moderation, selfie verification
and SMS is documented provider-by-provider in **`INTEGRATIONS.md`** —
each one is just environment variables, no code changes.

---

# Quick reference

| I want to… | Do this |
|---|---|
| Check my launch config | `node scripts/configure-launch.js --check` |
| Change support email / URLs | `node scripts/configure-launch.js --support-email … --privacy-url …` |
| Build a new version | `eas build --platform ios --profile production` |
| Upload the newest build | `eas submit --platform ios --latest` |
| Ship an update later | Bump `version` in `app.json`, then build + submit again |
| See the review checklist | `DEPLOYMENT.md` |
| Turn on a paid/3rd-party feature | `INTEGRATIONS.md` |

## Common snags

- **"Bundle ID not available"** — someone has taken
  `com.veiledapp.hijabimarriage`. Change `ios.bundleIdentifier` in
  `app.json` to something unique (e.g. add your initials) and rebuild.
- **Build fails on credentials** — run `eas credentials` and let EAS
  regenerate the certificate.
- **Build doesn't appear in TestFlight** — Apple processing takes ~10
  minutes; also check email for an "invalid binary" notice.
- **Rejected for "no account deletion"** — shouldn't happen; it's in
  Settings → Delete my account. Point the reviewer there in the notes.
