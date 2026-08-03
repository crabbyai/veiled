# Veiled — App Store Connect metadata (copy-paste ready)

## App Information
- **Name** (30 chars max): `Veiled: Hijabi Marriage`
- **Subtitle** (30 chars max): `Halal matchmaking & nikah`
- **Primary category**: Lifestyle
- **Secondary category**: Social Networking
- **Bundle ID**: `com.veiledapp.hijabimarriage` (already in app.json)
- **SKU**: `veiled-ios-001` (any unique string; not user-visible)

## Promotional Text (170 chars max, editable without review)
```
The marriage app where every sister wears hijab or niqab — and her photos stay veiled until she chooses to unveil them. Talk to your AI matchmaker. No pressure.
```

## Description
```
Veiled is a marriage app built for practising Muslims — where every
sister on the platform wears hijab or niqab, and modesty is the
feature, not an afterthought.

THE VEIL
Her photos stay veiled — softly frosted behind an elegant geometric
screen — until she chooses to unveil them for a match. She stays in
control, always.

TALK, DON'T JUST SWIPE
Prefer to browse? Swipe a beautifully crafted deck sorted by
compatibility. Prefer to be introduced? Speak to your AI matchmaker in
your own voice, answer three questions, and meet exactly one person —
the one it would pick for you.

FRIEND'S TAKE
Your family and friends can add notes and voice messages vouching for
you, right on your profile — because the people who love you know you
best.

BUILT FOR NIKAH
• Marriage timelines, deen details, and values on every profile
• Wali / chaperone can be invited to observe any conversation
• Selfie verification for a trusted community
• Signals badge — earned by genuinely reading profiles and replying,
  not endless swiping
• Community events: wali-supervised taaruf evenings, sisters' halaqas,
  lectures and charity days
• Prayer times on your home screen
• Elegant black & white design with light and dark modes

Veiled is free to use. Veiled Gold (premium features) is free during
launch.
```

## Keywords (100 chars max, comma-separated)
<!-- 'muzz' removed: using a competitor's trademark as a keyword risks
     rejection and a trademark complaint. -->
```
muslim,marriage,nikah,hijab,niqab,halal,matchmaking,rishta,islamic,single,wali,deen,modest
```

## URLs
- **Support URL**: your website or a simple contact page (required)
- **Marketing URL** (optional): landing page
- **Privacy Policy URL** (required): host a privacy policy before submitting

## Age Rating questionnaire
Answer **None / No** to every violence, sexual content, horror, drugs and
gambling question. Then:
- **Unrestricted Web Access**: No
- **Dating**: **Yes**

Answering "Dating: Yes" is what makes Apple assign the mature rating
(18+). Do not try to force a lower rating on a dating app — mismatched
age ratings are a 2.3.8 metadata rejection.

## App Privacy (data collection questionnaire)
With the app running fully on-device/offline (no EXPO_PUBLIC_API_URL):
- Data collected: **None** (select "Data Not Collected")

If you deploy the backend and point the app at it, declare:
- **Contact Info → Email Address**: linked to identity, app functionality
- **User Content → Photos, Audio, Other user content (profile, messages)**:
  linked to identity, app functionality
- **Identifiers → User ID**: linked to identity, app functionality
- No tracking, no third-party advertising.

## Screenshots (already generated in this folder)
- `screenshots/iphone-6.9/` → upload to "iPhone 6.9" Display" (1290×2796)
- `screenshots/ipad-13/` → upload to "iPad 13" Display" (2048×2732)
Suggested order: 01 veil card → 06 voice → 02 unveiled chat → 03 events
→ 04 readiness → 05 gold.
- **App Previews (videos): leave empty.** They're optional; our previous
  slideshow-style videos caused rejection 2.3.8.

## Notes for App Review (paste in "App Review Information → Notes")
```
Veiled is a Muslim matchmaking app for adults seeking marriage.

NO APPLE PAY / PASSKIT
This build does not integrate Apple Pay and does not link PassKit. The
in-app-payments entitlement has been removed from the project. Veiled has
no physical goods or services, so it would use StoreKit in-app purchase,
not Apple Pay.

NO IN-APP PURCHASE PRODUCTS IN THIS BUILD
No IAP products are configured or referenced in this binary, and none are
awaiting review. "Veiled Gold" is granted free during launch: the button
reads "Join Gold — free during launch", no prices are displayed, and no
purchase sheet can be triggered anywhere in the app. Prices only ever
render if a live store product is returned, which cannot happen in this
build. We will submit IAP products for review before enabling any charge.

ACCOUNT DELETION (5.1.1(v))
Profile tab → Settings (gear, top right) → Account → "Delete my account".
Two-step confirmation, then all data is erased.

AGE
18+ only. Onboarding blocks anyone under 18, and the server independently
rejects an age below 18.

HOW TO REVIEW
• Fully functional offline with seeded demo profiles — no account or
  server needed. Just launch and swipe.
• "The Veil": some profiles show frosted photos by design; the member
  unveils them for a match. This is a user-controlled privacy feature.
• Voice matchmaking simulates voice notes locally in this build; no audio
  is recorded or transmitted.
• A wali (guardian) chat-oversight feature is a cultural safety feature;
  no third party gains account access.
• Report and Block are on every profile ("..." in the top right) and in
  every chat.
```
