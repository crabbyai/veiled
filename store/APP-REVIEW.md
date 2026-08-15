# Resubmitting Veiled — everything for App Review

Apple rejected build 1 under **Guideline 2.1 — Information Needed**. They
did not say the app is broken; they said the App Review Information
section was empty and asked for seven things.

Six of the seven are written out below, ready to paste. The seventh (a
screen recording) has to be captured on a real iPhone — only you can do
that, and there's a tap-by-tap script for it in section D.

**Before any of this, the backend has to be live.** Section A. Without
it the app has nobody in it, and the reviewer will reject again — this
time for real.

---

## A. Deploy the backend (required, ~15 minutes)

The app was submitted with no server configured. That's why the
reviewer would have seen an app that couldn't do anything.

Any host that runs a Docker container works. `backend/Dockerfile` is
ready. Render is the shortest path with no card required for a free
instance:

1. Go to **render.com** → New → **Web Service** → connect the
   `crabbyai/veiled` repo.
2. Root directory `backend`, Environment **Docker**, instance type
   Free.
3. Add environment variables:

   | Key | Value |
   |---|---|
   | `JWT_SECRET` | a long random string — generate with `openssl rand -hex 32` |
   | `NODE_ENV` | `production` |
   | `DB_PATH` | `/data/veiled.db` |
   | `UPLOAD_DIR` | `/data/uploads` |

4. Add a **Disk**: mount path `/data`, 1 GB. (Without it the database
   is wiped on every redeploy.)
5. Deploy, then confirm it's up:
   `curl https://<your-service>.onrender.com/api/health` → `{"status":"ok"…}`
6. Point the app at it and commit:

   ```bash
   node scripts/configure-launch.js --api-url https://<your-service>.onrender.com
   git add -A && git commit -m "Point the app at the production API" && git push
   ```

> A free Render instance sleeps after inactivity and takes ~30s to wake.
> That is long enough to look broken to a reviewer. Either use the
> paid instance ($7/mo) for the review, or open the app once yourself
> right before you submit and keep it warm.

**Then create a few real profiles.** The reviewer needs to see people.
Sign up 3–5 accounts in the app (as sisters, with a veil style set) and
fill in their profiles — friends or family testing is ideal. Do *not*
set `SEED_DEMO_BOTS`; those are development bots that like everyone
back and must never be in a production database.

---

## B. Build and upload

On your Mac, in the repo:

```bash
git pull
export EXPO_TOKEN=…            # expo.dev → Account Settings → Access Tokens
./scripts/build-ios.sh --submit
```

The script refuses to build a stale checkout or a placeholder config, so
if it complains, fix what it says and re-run.

Don't touch `buildNumber` in `app.json`. `eas.json` sets
`appVersionSource: remote` with `autoIncrement` on the production
profile, so EAS keeps the build number on its side and bumps it for you.
Editing it by hand only causes conflicts.

### Getting it onto your phone

TestFlight has no link to share for your own app — as the account
holder, your builds appear automatically once they finish processing.

1. After `--submit`, the build lands in **App Store Connect →
   TestFlight**. It shows *Processing* for ~10 minutes.
2. Export compliance won't stop you: `ITSAppUsesNonExemptEncryption` is
   already declared in `app.json`, so there's no questionnaire to answer.
3. In **TestFlight → Internal Testing**, make sure there's a group with
   your own Apple ID in it, and that the new build is added to it. The
   account holder is usually there already.
4. On the iPhone: install **TestFlight** from the App Store, sign in
   with **the same Apple ID as your developer account**, and Veiled
   appears under *Apps*. Tap **Install**.
5. You'll get an email when the build is ready to test, too.

If Veiled doesn't appear in TestFlight on your phone, it's almost always
one of: still processing, you're signed into a different Apple ID, or
the build hasn't been added to an internal testing group.

---

## C. App Review Information → Notes

Paste this into **App Store Connect → your app → the version → App
Review Information → Notes**. Replace the two bracketed bits.

```
VEILED — REVIEW NOTES

WHAT THE APP IS
Veiled is a marriage-intent matchmaking app for practising Muslim women
who wear hijab or niqab, and the men seeking marriage with them. It is
not a casual dating app: profiles state marriage intent, conversations
can be supervised by a family chaperone (wali), and photos stay blurred
until a member chooses to reveal them to a specific match.

The problem it solves: Muslim women who cover face a bad choice between
mainstream dating apps, where their photos are public to everyone and
the intent is casual, and family introductions, which are limited to
who their family happens to know. Veiled gives them a space where
covering is the norm, photos are private by default and under their
control, and every member is there for marriage.

TEST ACCOUNT
Email: [REVIEWER TEST EMAIL]
Password: [REVIEWER TEST PASSWORD]
This account is fully set up so you can go straight to the main screens.
You can also create a fresh account from the first screen — registration
is email and password, no invite or waitlist.

HOW TO REACH THE MAIN FEATURES
1. Sign in with the account above (or tap "Create an account").
2. Discover tab — profiles of members near you. Swipe or use the buttons
   to pass or like. Tap a card to open the full profile.
3. Some members set a "Compatibility Question": a question you must
   answer before you can like them. Open such a profile and tap Like to
   see the answer sheet.
4. Likes You tab — who liked you, and anyone who answered your question.
5. Chats tab — conversations with your matches.
6. Profile tab — your own profile, photos, and your Compatibility
   Question. Settings (gear icon) holds privacy controls, the Terms of
   Use and Privacy Policy links, and Delete my account.

ACCOUNT DELETION
Profile tab → Settings → "Delete my account". Two confirmations, then
the account, profile, photos, matches and messages are permanently
deleted server-side. It is a deletion, not a sign-out.

PURCHASES
There are no in-app purchases in this version. Veiled Gold is described
in the app and is free for everyone during launch; no purchase, no
subscription, and no external payment path exists in the binary. In-app
purchases will be submitted for review with a later version.

USER-GENERATED CONTENT
Members write profile text, prompt answers, Compatibility Question
answers, and chat messages, and upload photos. Safety controls:
- Report and Block on every profile (the "…" menu, top right of a
  profile) and in every chat.
- Reported content goes to a moderation queue server-side; reporting
  also immediately removes that member from the reporter's view.
- Blocking is mutual and permanent: neither member can see or contact
  the other again.
- Members can pause their profile, keep photos veiled, and require a
  family chaperone on conversations.
- Terms of Use are linked in Settings, and accepted at sign-up.

PERMISSIONS THE APP ASKS FOR
- Camera: taking a profile photo, and identity verification.
- Photo library: choosing profile photos.
- Notifications: new matches and messages.
- Face ID: optional app lock.
None of these are required to use the app. Denying any of them leaves
every other feature working. The app does not request microphone,
location, or contacts access, and does not use App Tracking
Transparency.

DEVICES AND OS TESTED
[REPLACE WITH WHAT YOU ACTUALLY TESTED, e.g.:]
- iPhone 15 Pro, iOS 18.5
- iPhone 12, iOS 18.4
- iPad (10th generation), iPadOS 18.5

EXTERNAL SERVICES USED
- Our own API and realtime server (Node.js), hosted at
  [YOUR API URL]. It holds accounts, profiles, matches and messages.
  Authentication is our own — email and password, JWT sessions. There
  is no third-party login provider.
- Expo / EAS: build tooling and push notification delivery.
No third-party data providers, no payment processors, no AI services,
no advertising or tracking SDKs are used in this version. The app does
not use App Tracking Transparency because it does not track users.

REGIONAL DIFFERENCES
None. The app behaves identically in every region and country. There is
no region-locked content, no regional pricing, and no feature that
varies by territory. It is currently English only.

REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Veiled does not operate in a regulated industry. It contains no
third-party copyrighted or protected material: all artwork, copy and
imagery are original to us. Prayer times shown in the app are computed
locally from standard astronomical formulas, not licensed from a
provider. Veiled is not affiliated with or endorsed by any religious
authority or organisation.

CONTACT
adeelahmedrahman@gmail.com
```

---

## D. The screen recording (item 1 — only you can do this)

On your iPhone, running the latest iOS, with the TestFlight build
installed. Settings → Control Centre → add **Screen Recording** if it
isn't there.

Delete the app first, so the recording starts genuinely fresh, and make
sure you have a second account ready that has already liked your test
account (so a match happens on camera).

The notifications prompt appears on its own just after onboarding —
**accept it on camera**, that's one of the permission prompts Apple
asked to see.

Start recording, then, without cutting:

1. **Launch the app from the home screen.** Let the first screen appear.
2. **Tap "Create an account".** Enter an email and password, tap Create
   account. — *covers registration*
3. Walk through setup: name, age, gender, veil, interests, values.
4. At **Get verified**, tap Continue to skip it. — *shows it's optional*
5. On **Discover**, let the profiles load. Swipe one profile left
   (pass). Tap the ✕ on another.
6. **Tap a card** to open the full profile. Scroll through photos,
   prompts and vitals.
7. Tap the **"…" menu top right → Report**, then Cancel. Open it again →
   **Block**, then Cancel. — *covers UGC reporting and blocking*
8. Go back and open a profile that shows a **Compatibility Question**.
   Tap Like → the answer sheet opens → type an answer → Send answer.
9. **Like the account you pre-arranged**, so the match screen appears.
10. Open **Chats**, open that match, and **send a message**.
11. Add a photo to your profile: **Profile → Edit profile → Add** —
    **accept the photo library prompt on camera**. — *covers a
    permission prompt*
12. Open **Profile → Settings**. Scroll to show **Privacy policy** and
    **Terms of Use**, and tap one so the browser opens, then come back.
13. Tap **Veiled Gold** so the reviewer sees there is no purchase — the
    screen says Gold is free during launch. Close it.
14. Back in Settings, tap **Log out**, then sign back in with the same
    account. — *covers login*
15. Finally, Settings → **Delete my account** → confirm both prompts,
    and show the app returning to the sign-in screen. — *covers deletion*

Stop recording. Trim nothing. Upload the video in the Resolution Center
reply, or add it as an attachment in App Review Information.

Do step 15 last — it deletes the account you were using. Make the test
account you put in the notes a *different* one, and check it still signs
in afterwards.

---

## E. The Resolution Center reply

App Store Connect → your app → Resolution Center → Reply. Paste:

```
Hello,

Thank you for the review. All requested information is now in the App
Review Information → Notes field, and I've answered each point below.

1. Screen recording: attached. It starts from launching the app on an
   iPhone running the latest iOS and shows account registration, sign
   in, sign out, the main discovery and matching flows, sending a
   message and a voice note, reporting and blocking a member, the
   camera/photo/microphone permission prompts, and account deletion.

2. Devices and OS tested: [LIST]

3. What the app does and who it's for: Veiled is a marriage-intent
   matchmaking app for practising Muslim women who wear hijab or niqab
   and the men seeking marriage with them. Photos stay private until a
   member chooses to reveal them to a specific match, conversations can
   be supervised by a family chaperone, and every profile states
   marriage intent. It exists because women who cover currently have to
   choose between mainstream dating apps, where their photos are public
   and the intent is casual, and family introductions limited to who
   their family knows.

4. Setup and access: full instructions and a working test account are
   in the Notes field. No invite code or waitlist — you can also create
   a fresh account from the first screen.

5. External services: our own Node.js API and realtime server, which
   holds accounts, profiles, matches and messages, plus Expo/EAS for
   builds and push delivery. Authentication is our own email and
   password. There are no third-party data providers, payment
   processors, AI services, advertising SDKs or tracking SDKs in this
   version.

6. Regional differences: none. The app behaves identically in every
   region; no region-locked content, no regional pricing, English only.

7. Regulated industry / protected material: neither applies. Veiled is
   not in a regulated industry, and all artwork and copy are original
   to us. It is not affiliated with any religious authority.

One clarification on purchases: this version contains no in-app
purchases. Veiled Gold is free for all members during launch and there
is no purchase or subscription path in the binary. In-app purchases
will be submitted for review with a future version.

Thank you,
Adeel
```

---

## F. Quick checklist before you hit Submit

- [ ] Backend deployed, `/api/health` returns ok
- [ ] `.env` has the real `EXPO_PUBLIC_API_URL`, committed and pushed
- [ ] A few real profiles exist so the app isn't empty
- [ ] `SEED_DEMO_BOTS` is **not** set on the server
- [ ] `buildNumber` bumped in `app.json`
- [ ] New build uploaded and processed in TestFlight
- [ ] You installed that TestFlight build and it works on your phone
- [ ] Screen recording captured per section D
- [ ] Notes field filled in from section C, with real values in the
      three bracketed spots
- [ ] Test account in the notes actually signs in
- [ ] Resolution Center reply sent with the recording attached
