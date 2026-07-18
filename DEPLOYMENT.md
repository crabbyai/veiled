# Veiled — App Store submission checklist

This documents the fixes for the three review rejections and how to
prepare a clean resubmission.

## Rejection fixes

### 2.1.0 — App Completeness (placeholder icon) ✅ fixed in code
The app previously shipped an inherited placeholder icon. It now uses a
real branded Veiled mark (white butterfly on near-black with a
mashrabiya halo). Files: `assets/icon.png` (1024×1024, no alpha),
`assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/favicon.png`.
Stale brand colours were also purged from `app.json`.

Action: rebuild (`eas build`) so the binary carries the new icon. In App
Store Connect the icon is taken from the build automatically.

### 5.6.0 — Developer Code of Conduct (fake social proof) ✅ not present
Audited: the Veiled paywall (`src/muzz/screens/GoldScreen.js`) contains
**no** fabricated social proof — no rotating "X from Y just subscribed"
toasts and no time-varying fake subscriber counts. The only live counter
in the app is the prayer-times widget, which is genuine. Nothing to
remove. (If you add testimonials later, keep them real and attributable.)

### 2.3.8 — Accurate Metadata (App Preview videos) — action required
The previous rejection was because the App Preview videos were static
**screenshot slideshows**, which Apple treats as not representing real
app usage.

**Recommended fix (simplest, fully compliant): don't upload App Preview
videos at all.** They are optional. Screenshots alone satisfy the store.
In App Store Connect, delete any uploaded previews from the iPhone and
iPad "App Previews" rows and leave them empty.

Use the screenshots in `store/screenshots/` instead (generated from the
real running app, at the exact required sizes):
- iPhone 6.9" — 1290×2796
- iPad 12.9"/13" — 2048×2732

### If you still want App Preview videos
They must be genuine screen recordings, H.264, matching the slot size
(iPad 12.9"/13" is 1200×1600 or 1600×1200; 15–30s). The easiest way with
no physical device:
1. Run the app in Xcode's iOS Simulator on a Mac.
2. Record with QuickTime (File → New Screen Recording) or
   `xcrun simctl io booted recordVideo preview.mov`.
3. Format to the exact spec:

```bash
ffmpeg -i preview.mov \
  -vf "scale=1200:1600:force_original_aspect_ratio=decrease,\
pad=1200:1600:(ow-iw)/2:(oh-ih)/2:color=black,fps=30" \
  -t 19 -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -an output.mp4
```

Note: real H.264 encoding can't be produced in the CI/web sandbox this
repo was built in (the bundled ffmpeg is VP8/webm-only), which is why the
recordings must be captured on a Mac/simulator.

## Pre-submit checklist
- [ ] `app.json` bundle ids, version, buildNumber correct
- [ ] New icon present in the build (2.1.0)
- [ ] No App Preview videos, or real H.264 recordings only (2.3.8)
- [ ] Screenshots uploaded for every required device size
- [ ] Privacy policy URL set; data-collection questionnaire completed
- [ ] `EXPO_PUBLIC_API_URL` pointed at your deployed backend (see
      `backend/README.md`) if you want live data; the app also runs fully
      offline from seed data
