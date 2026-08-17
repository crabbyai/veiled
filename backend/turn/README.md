# TURN relay for calls

WebRTC connects the two phones directly wherever it can. STUN is enough
for that on most home networks. It is **not** enough behind symmetric NAT
or on some mobile carriers, and those calls will ring, negotiate, and
then connect to silence. A relay is what fixes them, and roughly one call
in five needs one on real networks.

This directory stands one up.

## Run it

```sh
cd backend/turn
export TURN_REALM=veiled.app
export TURN_SECRET="$(openssl rand -hex 32)"
export TURN_PUBLIC_IP=203.0.113.10        # the server's own public IP
docker compose up -d
```

Then give the API the same secret, and tell it where the relay is:

```sh
TURN_URLS="turn:turn.veiled.app:3478?transport=udp,turn:turn.veiled.app:3478?transport=tcp,turns:turn.veiled.app:5349?transport=tcp"
TURN_SECRET="<the same value>"
TURN_TTL=43200
```

`turns:` on 5349 matters more than it looks: some corporate and hotel
networks let nothing out but TCP 443/5349, and it is the difference
between a call working there and not.

## Why the app never sees the secret

The app asks `GET /api/dating/ice` when a call starts and gets back a
username of `<expiry>:<userId>` with an HMAC of it as the password —
coturn's `use-auth-secret` scheme. coturn recomputes the same HMAC to
check it, so no credential is ever stored, and nothing long-lived is
compiled into the app.

A fixed TURN username and password shipped in a mobile binary can be
pulled out of it in about a minute, and then anyone can relay their own
traffic through your server on your bill. That is the whole reason for
the indirection.

## Firewall

| Port          | Protocol | For                        |
|---------------|----------|----------------------------|
| 3478          | UDP, TCP | STUN/TURN                  |
| 5349          | TCP      | TURN over TLS              |
| 49160–49200   | UDP      | relayed media              |

Narrow the relay range in `turnserver.conf` if you want, but it must be
open, or the relay will allocate ports nothing can reach.

## Checking it works

```sh
# Should print a relay candidate ("typ relay"), not just srflx.
npx webrtc-ice-tester --turn turn:turn.veiled.app:3478 --user "$(date -d '+1 hour' +%s):test" ...
```

Easier in practice: open <https://icetest.info/>, paste the server and a
credential pair from `GET /api/dating/ice`, and look for a candidate of
type `relay`. If you only see `host` and `srflx`, the relay is not
reachable and the calls that need it will still fail.
