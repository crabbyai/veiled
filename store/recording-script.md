# Screen recording for App Review — shot list

One continuous recording, on a physical iPhone running the latest iOS,
from the TestFlight build. No cuts, no edits. About 4–5 minutes.

Apple asked for four things specifically, and this covers all of them:
account registration / login / deletion, paid content, user-generated
content with reporting and blocking, and permission prompts.

---

## Before you press record

1. **The backend must be live** and the build must point at it. If the
   app opens to "Can't reach Veiled", stop — nothing below will work.
   (See `store/APP-REVIEW.md` section A.)
2. **A few real profiles must exist**, or the deck will be empty.
3. **Delete the app from your phone**, then reinstall from TestFlight,
   so the recording genuinely starts from nothing.
4. **Prepare a second account** — on another phone, or in the simulator
   — and have it **like your recording account** before you start. That
   way a real match happens on camera at step 9.
5. **Prepare a third account** to be your reviewer test account, and put
   *that* one in the App Review notes. Step 15 deletes the account you
   record with.
6. Add **Screen Recording** to Control Centre: Settings → Control
   Centre → Screen Recording.
7. Turn on Do Not Disturb so no notifications interrupt.

---

## The shot list

Swipe down for Control Centre, press record, wait 3 seconds, then go to
the home screen.

| # | What to do | Why it's in the recording |
|---|---|---|
| 1 | **Tap the Veiled icon** on the home screen. Let it load. | Apple requires the recording to begin with launching the app |
| 2 | Tap **Create an account**. Type an email and password. Tap **Create account**. | Registration |
| 3 | Fill in setup: name, age, Brother/Sister, veil style, 3 interests, 2 values, a short bio. | Normal user flow |
| 4 | At **Get verified**, tap **Continue** to skip. | Shows verification is optional, not a dead end |
| 5 | When the **notifications prompt** appears, tap **Allow**. | Permission prompt #1 |
| 6 | On **Discover**, wait for profiles to load. Swipe one card left, then tap **✕** on the next. | Core feature |
| 7 | **Tap a card** to open the full profile. Scroll slowly through photos, prompts and details. | Core feature |
| 8 | Tap **"…"** top right → **Report** → then **Cancel**. Open **"…"** again → **Block** → then **Cancel**. | UGC reporting and blocking — Apple asked for this explicitly |
| 9 | Find a profile showing a **Compatibility Question**. Tap **Like** → the answer sheet opens → type a real sentence → **Send answer**. | Distinctive feature, and shows how likes work |
| 10 | **Like the account you pre-arranged** at step 4 of the prep. The match screen appears. | Shows matching is real |
| 11 | Open **Chats** → that match → **type and send a message**. | Core feature |
| 12 | **Profile** tab → **Edit profile** → **Add** photo. When the **photo library prompt** appears, tap **Allow**. Pick a photo. | Permission prompt #2 |
| 13 | **Profile** → **Settings** (gear, top right). Scroll to show **Privacy policy** and **Terms of Use**. Tap one — let the browser open — then come back. | Apple checks these links resolve |
| 14 | Settings → **Veiled Gold**. Let the screen show that Gold is free during launch. Close it. | Paid content: proves there is no purchase flow in this version |
| 15 | Settings → **Log out**. Then **sign back in** with the same email and password. | Login |
| 16 | Settings → **Delete my account** → confirm **both** prompts → show the app landing back on the sign-in screen. | Account deletion (guideline 5.1.1(v)) |

Stop the recording. Don't trim the start or end.

---

## Watch out for

- **Step 16 deletes the account you just recorded with.** That's why the
  test account in your review notes has to be a different one. Check
  that one still signs in after you finish.
- If a free-tier host put the server to sleep, the first screen may hang
  for ~30 seconds. Open the app once a minute before recording to wake
  it, or the reviewer will see the same hang.
- If the match at step 10 doesn't happen, the other account didn't like
  you first. Fix that and re-record — a match screen that doesn't appear
  looks like a broken feature.
- Don't demonstrate calls or voice notes. They aren't in this build.

---

## Where it goes

Attach the video to your **Resolution Center** reply, along with the
text in `store/APP-REVIEW.md` section E.
