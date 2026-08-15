#!/usr/bin/env bash
# build-ios.sh — build and submit Veiled to TestFlight without a TTY.
#
# `eas login` needs an interactive terminal, which agents and CI don't
# have. EAS supports token auth instead: set EXPO_TOKEN and no login
# prompt ever appears.
#
#   export EXPO_TOKEN=...                     # expo.dev → Account
#                                             #   Settings → Access Tokens
#   export EXPO_APPLE_ID=you@example.com      # only needed the first time,
#   export EXPO_APPLE_APP_SPECIFIC_PASSWORD=  # to create signing certs
#   ./scripts/build-ios.sh
#
#   ./scripts/build-ios.sh --submit           # also upload to TestFlight
#
# Nothing is printed that would leak a secret.

set -euo pipefail
cd "$(dirname "$0")/.."

SUBMIT=0
[ "${1:-}" = "--submit" ] && SUBMIT=1

fail() { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

step "Checking prerequisites"

[ -n "${EXPO_TOKEN:-}" ] || fail "EXPO_TOKEN is not set.
  Create one at https://expo.dev → Account Settings → Access Tokens,
  then:  export EXPO_TOKEN=<token>
  (Use an environment variable — never paste a token into a chat.)"
ok "EXPO_TOKEN is set (${#EXPO_TOKEN} chars)"

command -v npx >/dev/null || fail "node/npx not found"
ok "node $(node -v)"

# Refuse to build a stale checkout: the PassKit removal and the live
# privacy URL must be in the binary or Apple will reject it again.
if [ -d .git ]; then
  git fetch -q origin "$(git rev-parse --abbrev-ref HEAD)" 2>/dev/null || true
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "@{u}" 2>/dev/null || echo "$LOCAL")
  [ "$LOCAL" = "$REMOTE" ] || fail "This checkout is behind the remote. Run: git pull"
  ok "on $(git rev-parse --short HEAD), up to date with remote"
fi

step "Verifying launch configuration"
node scripts/configure-launch.js --check
node scripts/configure-launch.js --check | grep -q '✗' \
  && fail "Some launch values are still placeholders (see ✗ above)."
ok "all launch values set"

# Apple Pay must not be declared — shipping the entitlement without an
# Apple Pay integration is a guideline 2.1 rejection.
if grep -q "in-app-payments" app.json; then
  fail "app.json still declares the Apple Pay entitlement. Remove it before building."
fi
ok "no Apple Pay entitlement"

step "Installing dependencies"
npm ci --no-audit --no-fund
ok "dependencies installed"

# A missing or duplicated native module builds fine and then white-screens
# on launch — the JS bundle loads, the native side isn't there. That cost
# us a review cycle once (@expo/vector-icons needs expo-font, and npm had
# resolved two different versions of it). Catch it here instead.
step "Checking native module health"
DOCTOR=$(npx expo-doctor@latest 2>&1 || true)
if printf '%s' "$DOCTOR" | grep -q "Missing peer dependency"; then
  printf '%s\n' "$DOCTOR" | grep -A 3 "Missing peer dependency"
  fail "A native peer dependency is missing. Install it before building."
fi
if printf '%s' "$DOCTOR" | grep -q "Found duplicates for"; then
  printf '%s\n' "$DOCTOR" | grep -A 4 "Found duplicates for"
  fail "Two versions of a native module are installed. De-duplicate before building."
fi
ok "no missing or duplicated native modules"

step "Building iOS (production) — this takes 10-20 minutes"
npx eas-cli@latest build --platform ios --profile production --non-interactive

if [ "$SUBMIT" = "1" ]; then
  step "Submitting the latest build to App Store Connect"
  npx eas-cli@latest submit --platform ios --latest --non-interactive
  ok "submitted — it appears in TestFlight after ~10 minutes of processing"
else
  printf '\nBuild finished. To upload it:\n  ./scripts/build-ios.sh --submit\n'
fi
