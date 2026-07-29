# Veiled backend

Node/Express + Socket.IO + SQLite API powering the Veiled app: auth,
profiles (with veil style + The Veil photo privacy), butterfly
matching, swipes/likes/super-likes, instant chat, matches & messages,
per-match photo **unveiling**, social feed, photo uploads, push
notifications, boosts, blocks, and realtime (typing/presence/live
messages).

## Run locally

```bash
cd backend
npm install
npm start          # http://localhost:3000/api/health
```

The database (`veiled.db`) is created and seeded automatically with 10
demo sisters and 5 social posts on first boot.

Point the app at it:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start
```

The app is offline-first — it works fully without the backend, and
mirrors actions to it when configured.

## Deploy

Any Node host works (Render, Railway, Fly.io, a VPS):

```bash
docker build -t veiled-api .
docker run -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -v veiled-data:/data -e DB_PATH=/data/veiled.db -e UPLOAD_DIR=/data/uploads \
  veiled-api
```

Set `JWT_SECRET` in production. Mount a volume for `DB_PATH` and
`UPLOAD_DIR` so data survives restarts.

## API surface

- `POST /api/auth/register|login`, `GET /api/auth/me`, `DELETE /api/auth/account`
- `GET|PUT /api/dating/profile` (women must carry `veil: "Hijab"|"Niqab"`)
- `GET /api/dating/discover` — butterfly-ranked candidates with
  server-side Smart Filters (all optional query params):
  `ageMin, ageMax, maxDistance, veil, sect, prayerLevel, ethnicity,
  verifiedOnly` plus Passport `city=<name>` (discover in any city;
  relaxes distance). Echoes `appliedFilters` and `passport`.
- `GET /api/dating/butterfly/pick`
- `GET /api/dating/top-picks` — curated daily high-compatibility set (Gold sees all; free sees a few + `lockedCount`)
- `GET /api/dating/surge` — live activity (`online`, `activeNow`, `surging`) for the Swipe Surge banner
- `POST /api/dating/swipe|super-like|instant-chat|boost|block|report`
  (`report` files a moderation report — required for App Store UGC review).
  `swipe`/`super-like` accept a Hinge-style `comment` + `contentType`
  (`photo|prompt|profile`) + `contentRef`; on match the comment posts as
  the opener. `likes-you` returns each like's comment/rose/super context.
- `POST /api/dating/rose` `{ targetId, comment?, contentType?, contentRef? }` — a Rose (Hinge standout like), uses a Rose credit
- `GET /api/dating/standouts` — weekly-refreshed, prompt-forward set to send Roses to
- `POST /api/dating/matches/:id/we-met` `{ met, wentWell }` — private post-date feedback (Hinge We Met)
- `POST /api/dating/rewind` — undo the most recent swipe (or `{ targetId }`);
  returns the card to the deck, undoes a no-message match, refunds a like
- `GET /api/dating/likes-you`
- `GET /api/dating/matches`, `GET|POST /api/dating/matches/:id/messages`
- `POST /api/dating/matches/:id/unveil` — lift The Veil for one match (emits `unveil` + push)
- `POST /api/dating/matches/:id/unmatch` — end a match & delete its chat, no block (emits `unmatch`)
- `POST /api/dating/profile/pause` `{ paused }` — Snooze: hide from discovery, keep matches
- `POST /api/dating/profile/share` → tokenised read-only profile link; public page at `/p/:token` (photos never exposed)
- `POST /api/dating/messages/:id/react`
- `POST|DELETE /api/dating/photos` — veiled photos are only served to
  matches you've unveiled for
- `GET|POST /api/dating/social/posts`, likes + comments
- Friend's Take (vouches):
  - `POST /api/dating/friend-takes/invite` — mint a shareable link
  - `GET /api/dating/friend-takes/invite/:token` — public preview (no auth)
  - `POST /api/dating/friend-takes/invite/:token` — friend submits a vouch (no auth)
- Signals (engagement rewards):
  - `GET /api/dating/signals` — your score + badge tier
  - `POST /api/dating/signals/read` — credit reading a full profile
  - `POST /api/dating/signals/reply` — credit replying in a match
- `POST /api/dating/push-token`
- Socket.IO: `message:new`, `match:new`, `unveil`, `unmatch`, `rewind`,
  `typing`, `presence`, `friendtake:new`

In production the server refuses to boot on the built-in dev
`JWT_SECRET`; set a strong secret. `trust proxy` is enabled so rate
limiting sees the real client IP behind a load balancer.
