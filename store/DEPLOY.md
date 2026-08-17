# Shipping Veiled

A runbook. Follow it top to bottom; every step says what "done" looks
like, so you can tell whether it worked rather than assuming.

**Never paste a credential into a chat window.** Every secret below goes
into a shell variable, a `.env` file that is not committed, or an
interactive prompt. If a tool asks for an Apple password and there is no
prompt to type it into, stop.

---

## 0. What must be true before anything else

Veiled is a real service. It does not work without a backend, and a build
that has no backend shows an empty app — which is the rejection you have
already had.

- [ ] The API is deployed and reachable over **HTTPS** at a stable domain.
- [ ] `GET https://<api>/api/health` returns 200 from outside your network.
- [ ] A TURN relay is running (see `backend/turn/README.md`). Without it,
      roughly one call in five rings, negotiates and connects to silence.

If the API is not up yet, deploy `backend/` first. Nothing below will
produce a submittable app until it is.

---

## 1. Check the machine

```sh
node --version        # 20 or newer
npm --version
xcodebuild -version   # macOS only, for a local build
npx eas --version     # installs eas-cli if missing
```

```sh
git clone <repo> veiled && cd veiled
npm ci
cd backend && npm ci && npm test && cd ..
```

**Done when:** the backend suite prints five blocks, all `0 failed`.
That covers the compatibility question, the veil, media messages, call
signalling, and a real WebRTC call carrying audio and video.

---

## 2. Pre-flight

```sh
export EXPO_PUBLIC_API_URL="https://api.veiled.app"   # your API, https
node scripts/preflight.js
```

This checks the things that get an app rejected: permissions with no code
behind them, background modes that oblige frameworks you do not have,
payment links outside IAP, missing account deletion, the encryption
declaration, duplicate native modules.

**Done when:** it prints `0 blocking`. If it does not, fix what it names.
Each blocking item is a rejection, not a style note.

---

## 3. Sign in to the build service

```sh
npx eas login          # prompts; do not pass the password as an argument
npx eas whoami
```

For App Store Connect, prefer an **API key** over an Apple ID password:

1. App Store Connect → Users and Access → Integrations → App Store
   Connect API → generate a key with **App Manager** access.
2. Download the `.p8` **once** — it cannot be downloaded again.
3. Put it somewhere outside the repo, e.g. `~/.appstore/AuthKey_XXX.p8`.

```sh
export EXPO_APPLE_API_KEY_PATH=~/.appstore/AuthKey_XXXXXXXXXX.p8
export EXPO_APPLE_API_KEY_ID=XXXXXXXXXX
export EXPO_APPLE_API_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

The `.p8` must never be committed. `.gitignore` covers `*.p8`; check that
`git status` is clean after you copy it.

---

## 4. Build

```sh
EXPO_PUBLIC_API_URL="https://api.veiled.app" npx eas build --platform ios --profile production
```

EAS assigns the build number itself (`appVersionSource: "remote"` with
`autoIncrement`). **Do not hand-edit a build number** — the store has
already seen 1, 2 and 3, and a repeat is refused at upload.

**Done when:** the build finishes and you have an `.ipa` URL. If it fails
in the native step, the log names the module; that is almost always a
version mismatch — run `npx expo-doctor` locally.

---

## 5. Check the build before Apple does

Install on a device from the EAS link, or:

```sh
npx eas build:run --platform ios --latest
```

Walk it, in this order, because each depends on the last:

- [ ] The app opens to sign-in — **not a white screen**. A white screen
      here means duplicate native modules; `npx expo-doctor` names them.
- [ ] Register a new account, complete onboarding.
- [ ] Discover shows real profiles from the API, and **no "Demo build"
      banner**. If the banner is there, `EXPO_PUBLIC_API_URL` did not
      reach the build.
- [ ] Send a like, a Rose (the rose draws itself beside her).
- [ ] Open a chat: send text, a photo, and a voice note. Play the voice
      note back.
- [ ] With a **second device and account, matched to the first**: place a
      voice call, then a video call. Both must connect and carry sound.
- [ ] Profile → Settings → delete the account, and confirm it is gone.

Calls cannot be checked on one device. If you only have one, say so
rather than ticking the box — that is the one thing in this app that
still has no automated proof on a real device.

---

## 6. Submit

```sh
npx eas submit --platform ios --latest
```

### What App Store Connect needs

**Review notes** — paste this, filled in:

> Veiled is a marriage-intent matchmaking app for Muslim women who wear
> hijab or niqab, and the men who want to marry them.
>
> Two test accounts, already matched to each other, so you can review the
> chat, voice notes and calling:
>   Account A: <email> / <password>
>   Account B: <email> / <password>
>
> Calling: sign in as A on one device and B on another, open the
> conversation, and use the call or video icons in the chat header. Calls
> are peer-to-peer WebRTC; a call cannot be demonstrated on one device.
>
> Voice notes: in a conversation, tap the microphone, speak, and send.
>
> The unveiled photo: women set aside one unveiled photo which is
> withheld from everyone until she chooses to reveal it to a specific
> match. It is never revealed automatically.

Create those two accounts **on the production API** before submitting,
and check they are matched. A reviewer who signs in to an empty app
rejects it.

**App privacy** — declare, matching what the backend stores:
Contact info (email), User content (photos, messages, voice notes),
Identifiers (user ID), Usage data. All linked to identity. Photos and
messages are used for app functionality only, not tracking.

**Age rating** — 17+. It is a dating app.

**Support and privacy policy URLs** — both must resolve. Apple checks.

---

## 7. If it comes back rejected

Read the actual guideline number in Resolution Center, and:

- **2.1 Information Needed** — usually a reviewer who could not get in,
  or could not find a feature. Answer in Resolution Center with steps.
  You do not need a new build for this.
- **2.1 Performance / completeness** — something was empty or broken on
  their device. Ask which screen.
- **3.1.1** — something digital is being sold outside IAP. `preflight`
  checks for external payment links; if this comes up, it is a control
  the check does not know about.
- **5.1.1(v)** — they could not find account deletion. It is under
  Profile → Settings.

Fix, bump nothing by hand, rebuild, resubmit.

---

## Backend deployment, briefly

```sh
cd backend
cp .env.example .env      # then fill it in
```

Required:

| Variable | Why |
|---|---|
| `JWT_SECRET` | 32+ random bytes. Rotating it signs everyone out. |
| `DB_PATH` | On a volume that survives a restart. |
| `UPLOAD_DIR` | Same. Photos and voice notes live here. |
| `ALLOWED_ORIGINS` | Your web origin, if any. |
| `TURN_URLS`, `TURN_SECRET` | Calls. See `backend/turn/README.md`. |

`npm start`, behind TLS. The app will not talk to plain HTTP.

**Done when:** `curl https://<api>/api/health` returns 200 and
`GET /api/dating/ice` with a valid token returns a TURN server, not just
STUN.
