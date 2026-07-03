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
- `GET /api/dating/discover[?veil=Hijab|Niqab]` — butterfly-ranked candidates
- `GET /api/dating/butterfly/pick`
- `POST /api/dating/swipe|super-like|instant-chat|boost|block`
- `GET /api/dating/likes-you`
- `GET /api/dating/matches`, `GET|POST /api/dating/matches/:id/messages`
- `POST /api/dating/matches/:id/unveil` — lift The Veil for one match (emits `unveil` + push)
- `POST /api/dating/messages/:id/react`
- `POST|DELETE /api/dating/photos` — veiled photos are only served to
  matches you've unveiled for
- `GET|POST /api/dating/social/posts`, likes + comments
- `POST /api/dating/push-token`
- Socket.IO: `message:new`, `match:new`, `unveil`, `typing`, `presence`
