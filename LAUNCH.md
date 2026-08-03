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
| Age rating | Mature — set by answering **Dating: Yes** |
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

### 1b. Publish your Support + Privacy pages — 5 min
Apple requires **two** working URLs, and clicks both. A 404 is an instant
rejection. Both pages are already written for you in `docs/`.

1. Create a new **public** repo called `veiled-support`
2. Upload **both** files from `docs/`: `index.html` and `privacy.html`
3. Repo **Settings → Pages → Source: main branch, / (root)** → Save
4. Wait ~1 minute, then check both load:
   - Support URL: `https://<your-github-username>.github.io/veiled-support/`
   - Privacy URL: `https://<your-github-username>.github.io/veiled-support/privacy.html`

Write both URLs down — you need them in App Store Connect and in step 2.

### 1c. Decide your support email
Any address you actually read, e.g. `support@yourdomain.com` or a Gmail.
Apple emails users here. Write it down.

### 1d. Create the app record in App Store Connect — 5 min

> **Already have a rejected app record you want to reuse?**
> See [Reusing an existing app record](#reusing-an-existing-app-record)
> at the bottom before doing this step — it changes what you do here.

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

`eas login` needs an interactive terminal, which agents and CI don't have.
Use a token instead — then no login prompt ever appears.

**Get a token (once):** <https://expo.dev> → Account Settings →
**Access Tokens** → Create. Treat it like a password.

**First build only** — EAS has to create your iOS signing certificate, so
it also needs Apple credentials. Create an app-specific password at
<https://account.apple.com> → Sign-In and Security → App-Specific
Passwords.

Then run:

```
export EXPO_TOKEN=<your expo token>
export EXPO_APPLE_ID=<your apple id email>
export EXPO_APPLE_APP_SPECIFIC_PASSWORD=<app-specific password>

./scripts/build-ios.sh --submit
```

The script refuses to build a stale checkout, refuses if any launch value
is still a placeholder, and refuses if the Apple Pay entitlement ever
comes back — then builds and uploads. Drop `--submit` to build only.

> Set these as environment variables in your own terminal. Don't paste
> tokens or passwords into a chat with anyone, including me.

The build appears in App Store Connect → **TestFlight** after ~10 minutes
of Apple processing. You'll get an email.

---

# STEP 4 — Fill in the listing (~15 min, you)

In App Store Connect, open your app → the **1.0.0 Prepare for Submission**
page. Open `store/metadata.md` beside it and copy-paste each field.

Checklist:

- [ ] **Promotional Text** — from metadata.md
- [ ] **Description** — from metadata.md
- [ ] **Keywords** — from metadata.md
- [ ] **Support URL** — your GitHub Pages support page from step 1b
- [ ] **Privacy Policy URL** — the /privacy.html URL from step 1b
- [ ] **Marketing URL** — leave blank
- [ ] **Copyright** — `2026 Veiled` (no © symbol)
- [ ] **Content Rights** — "Does your app contain third-party content?" → **No**
- [ ] **Screenshots** — drag in `store/screenshots/iphone-6.9/` (all 6)
      and `store/screenshots/ipad-13/` (all 6)
- [ ] **App Preview videos** — leave empty (deliberate: avoids a 2.3.8 rejection)
- [ ] **Category** — Lifestyle / Social Networking
- [ ] **Age Rating** — click Edit, answer per the *Age Rating* section of
      metadata.md. Answering **Dating: Yes** sets the mature rating
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

# Reusing an existing app record

If you already have an app in App Store Connect that was **rejected and
never released** (status `1.0 Rejected`), you can turn that record into
Veiled instead of creating a new one.

### The one thing that decides it: the bundle ID is permanent

You can rename an app, change its icon, screenshots, description and
category — but **the bundle ID can never be changed** once the record
exists. So reusing a record means Veiled permanently adopts that record's
bundle ID.

That's usually fine. A bundle ID is invisible to users. But it's forever,
so pick deliberately:

| | Reuse the old record | Create a fresh record |
|---|---|---|
| Bundle ID | Stuck with the old app's | Clean, e.g. `com.veiledapp.hijabimarriage` |
| Rejection history | Reviewers see the previous rejection on this record | None |
| Effort | Rename + swap metadata | 5 minutes to create |
| Cost | Free | Free |

**My recommendation: create a fresh record.** It costs five minutes, it's
free, and it gives Veiled a clean bundle ID and no prior-rejection
history. Reuse only if you specifically want that record — for example
you like the bundle ID, or the name `Androgenic` is one you want to keep.

⚠️ One caution if you do reuse: if the old app was rejected for something
that reflects on intent — spam, misleading metadata, guideline 4.3
(duplicate/spam apps) — repurposing that same record into an unrelated
app can attract extra scrutiny. If the rejection was mundane (missing
info, a crash, a broken link), reuse is low risk. **Read the old rejection
message first.**

### If you reuse it — what to do

**In App Store Connect (you):**
1. Open the rejected app → **App Information**
2. Change **Name** to `Veiled: Hijabi Marriage`
3. Change **Subtitle**, **Category** (Lifestyle / Social Networking) and
   **Age Rating** (must come out 17+) per `store/metadata.md`
4. Copy the **Bundle ID** shown on that page — you need it next
5. Copy the **Apple ID** number — you need it too
6. Delete the old screenshots and description; you'll replace them in STEP 4

**Then hand this to Cowork:**

```
I'm reusing an existing App Store Connect record for Veiled.

Run:
node scripts/configure-launch.js \
  --bundle-id <BUNDLE ID FROM APP STORE CONNECT> \
  --asc-app-id <APPLE ID NUMBER> \
  --support-email <MY SUPPORT EMAIL> \
  --privacy-url <MY PRIVACY POLICY URL>

Then run `node scripts/configure-launch.js --check` and show me the
output. Confirm the old bundle ID no longer appears anywhere:
  grep -rn "com.veiledapp.hijabimarriage" --include=*.json --include=*.js . | grep -v node_modules
That grep must return nothing. Then commit and push.
```

The script updates the bundle ID everywhere it appears (iOS bundle,
Android package, Apple Pay merchant ID, Proguard rule and the backend's
default package) so the build can't break from a half-renamed ID.

After that, continue from **STEP 3** as normal.

### If the old app was rejected, read why first

Whatever the reason, it's worth knowing — the same issue may apply to
Veiled. Paste it into Cowork:

```
My previous app was rejected by Apple for this reason:
<paste the full rejection text from "View App Review Issues & Messages">

Check whether Veiled has the same problem. Look at the actual code, tell
me honestly if it applies, and fix it if it does.
```

---

# Quick reference

| I want to… | Do this |
|---|---|
| Check my launch config | `node scripts/configure-launch.js --check` |
| Reuse an existing app record | `node scripts/configure-launch.js --bundle-id <id> --asc-app-id <n>` |
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
