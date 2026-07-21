# Veiled — complete App Store deployment guide

Everything needed to ship Veiled to the App Store is in this repo:

| What | Where |
|---|---|
| App icon (1024, no alpha) | `store/icon/icon-1024.png` (also baked into the build via `assets/icon.png`) |
| iPhone 6.9" screenshots (1290×2796) | `store/screenshots/iphone-6.9/` |
| iPad 13" screenshots (2048×2732) | `store/screenshots/ipad-13/` |
| All App Store Connect text (name, subtitle, description, keywords, review notes, privacy answers) | `store/metadata.md` |
| Build config | `eas.json`, `app.json` |
| Backend (optional for v1 — app runs fully offline) | `backend/` |

## 0. Prerequisites (one-time)
1. **Apple Developer Program** membership ($99/yr) on developer.apple.com.
2. On your machine: `npm install -g eas-cli`, then `eas login` (your Expo
   account — `owner` in app.json is already `adeelahmedrahman`).

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

## Why the previous rejections stay fixed
- **2.1.0 (placeholder icon)** — real branded icon is in the binary
  (`assets/icon.png`, veiled-silhouette mark, 1024, no alpha).
- **5.6.0 (fake social proof)** — audited: no fabricated activity
  anywhere; the only live counter is the genuine prayer timer.
- **3.1.1 / 2.3.2 (purchases)** — the Gold paywall ships with
  `IAP_ENABLED = false` (`src/muzz/screens/GoldScreen.js`): no prices
  shown, Gold is a free launch perk. Flip to `true` only after creating
  real auto-renewable subscriptions in App Store Connect and wiring
  them through `react-native-iap`.
- **2.3.8 (preview videos)** — submit with screenshots only.

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
