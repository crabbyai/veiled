# Veiled — complete App Store deployment guide

Everything needed to ship Veiled to the App Store is in this repo:

| What | Where |
|---|---|
| App icon (1024, no alpha) | `store/icon/icon-1024.png` (also baked into the build via `assets/icon.png`) |
| iPhone 6.9" screenshots (1290×2796) | `store/screenshots/iphone-6.9/` |
| iPad 13" screenshots (2048×2732) | `store/screenshots/ipad-13/` |
| All App Store Connect text (name, subtitle, description, keywords, review notes, privacy answers) | `store/metadata.md` |
| Build config | `eas.json`, `app.json` |
| Privacy policy (ready to host) | `store/privacy-policy.html` |
| Backend (optional for v1 — app runs fully offline) | `backend/` |

## 0. Prerequisites (one-time)
1. **Apple Developer Program** membership ($99/yr) on developer.apple.com.
2. On your machine: `npm install -g eas-cli`, then `eas login` (your Expo
   account — `owner` in app.json is already `adeelahmedrahman`).
3. **Host the privacy policy** (required URL for the listing). Fastest
   path with zero extra accounts — GitHub Pages on this repo:
   1. Copy `store/privacy-policy.html` to `docs/index.html` on your
      default branch and push.
   2. GitHub → repo **Settings → Pages** → Source: *Deploy from a
      branch* → branch `main`, folder `/docs` → Save.
   3. Your URL becomes `https://<user>.github.io/veiled/` — paste it in
      App Store Connect as the Privacy Policy URL (and Support URL).
   Any other static host (Netlify/Vercel drop, your own site) works too.

## 1. Build the iOS binary
```bash
git clone <this repo> && cd veiled
npm install --legacy-peer-deps
eas build --platform ios --profile production
```
- First run, EAS asks to register a bundle ID and create signing
  credentials — say **yes** to everything (it talks to your Apple
  account; bundle ID `com.veiledapp.hijabimarriage` comes from app.json).
- Wait for the build to finish (~15–25 min on EAS servers).

## 2. Create the app record in App Store Connect
1. appstoreconnect.apple.com → My Apps → **+ → New App**.
2. Platform iOS · Name **Veiled: Hijabi Marriage** · primary language
   English (U.K.) · Bundle ID `com.veiledapp.hijabimarriage` · SKU
   `veiled-ios-001`.
3. Copy the numeric **Apple ID** of the app (App Information page) into
   `eas.json` → `submit.production.ios.ascAppId`.

## 3. Upload the build
```bash
eas submit --platform ios --latest
```
(or download the .ipa from the EAS build page and upload with Apple's
Transporter app.) The build appears in App Store Connect → TestFlight
after ~10 min of processing.

## 4. Fill in the listing (all text is pre-written)
Open `store/metadata.md` and copy each block into App Store Connect:
- Name, subtitle, category, promotional text, description, keywords
- Support URL + **Privacy Policy URL** (host one first — required)
- Age rating questionnaire (select the Dating category honestly → 17+)
- App Privacy: "Data Not Collected" while the app ships offline-only
- **Screenshots**: drag the PNGs from `store/screenshots/iphone-6.9/`
  and `store/screenshots/ipad-13/` into the matching device rows.
  **Leave App Previews (videos) empty** — optional, and slideshow-style
  videos are what triggered rejection 2.3.8 previously.
- App Review Information → paste the "Notes for App Review" block.

## 5. Select the build & submit
Version page → Build section → pick the processed build → **Add for
Review** → **Submit to App Review**.

## App Store review checklist (all handled in code)

| Guideline | Requirement | How Veiled satisfies it |
|---|---|---|
| **2.1.0** | Real app icon | Branded veiled-silhouette mark, 1024px, no alpha (`assets/icon.png`) |
| **5.1.1(v)** | **Account deletion in-app** | Settings → **Delete my account** (two-step confirm) calls `DELETE /api/auth/account`, which erases the profile, photos (including objects in S3), swipes, matches, messages, reports, blocks and push tokens, then wipes local storage |
| **1.2** | UGC safety: report, block, filter | Report + Block on every profile and chat; server-side image moderation on upload and text filtering on every message |
| **3.1.1 / 3.1.2** | Real IAP, restore, terms | Gold uses live StoreKit/Play products via RevenueCat; **prices only render when a real purchase flow exists**, otherwise Gold is a free launch perk. Restore purchases, renewal disclosure, and **Terms of Use + Privacy Policy links** sit on the paywall |
| **5.6.0** | No fake social proof | Audited and removed: no seeded "people who like you" behind the paywall, and no invented "profile views" metric — every counter shown is real |
| **1.1.4 / age** | 18+ only | Onboarding blocks under-18 with an inline message; the server independently rejects `age < 18` (422), so a patched client can't bypass it |
| **5.1.1** | Purpose strings | Camera, photo library, microphone (voice notes), Face ID and location strings all present in `app.json` |
| **5.1.2** | Privacy manifest | `NSPrivacyAccessedAPITypes` declared in `app.json` |
| **2.3.8** | Accurate previews | Submit with screenshots only (no preview videos) |

Set the App Store age rating to **17+** and answer the questionnaire as a
dating app. Fill in Support URL and Privacy Policy URL in App Store
Connect (the policy HTML is in `store/privacy-policy.html`).

> Before submitting, replace the placeholder support email and privacy
> URL in `src/muzz/screens/SettingsScreen.js` with your real ones.

## Optional: go live with the backend
The app is fully reviewable offline. To run live accounts/matching/chat:
```bash
cd backend && docker build -t veiled-api .
docker run -p 3000:3000 -e JWT_SECRET="$(openssl rand -hex 32)" \
  -v veiled-data:/data -e DB_PATH=/data/veiled.db -e UPLOAD_DIR=/data/uploads veiled-api
```
Then rebuild the app with `EXPO_PUBLIC_API_URL=https://your-api.example.com`
set (eas.json env, or `eas secret:create`). Remember to update the App
Privacy questionnaire per `store/metadata.md` once the backend is live.

## Version bumps for future submissions
`eas.json` has `autoIncrement: true` — EAS bumps the build number
automatically. Bump the marketing `version` in app.json when you ship
feature releases.
