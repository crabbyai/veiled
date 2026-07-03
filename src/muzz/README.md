# Veiled — the marriage app for hijabis & niqabis

A full marriage-matchmaking + social app built in React Native / Expo,
designed to go head-to-head with Muzz — with a twist that is also its
name: **every sister on Veiled wears hijab or niqab**, and her photos
stay **veiled** (frosted) until she chooses to unveil them for a match.

`App.js` mounts this experience via `MuzzNavigator`.

## The two signature features

1. **The Veil** — photo privacy as identity. Profiles carry a
   `veil` style (`Hijab` | `Niqab`) shown as a badge, and a
   `photoVeiled` flag. Veiled photos render frosted everywhere
   (Discover cards, profile detail, likes grid) until the two of you
   match — then her profile shows "Unveiled for you".
2. **The AI Butterfly** — the matchmaker. It learns interests, values,
   deen and timeline during onboarding, ranks the deck by
   compatibility, and auto-delivers picks. No endless swiping.

## Structure

```
src/muzz/
  theme.js              Veiled design system (amethyst violet, gold, rose butterfly)
  data.js               Seed sisters (all hijabi/niqabi), prompts, intentions
  butterfly.js          Compatibility scoring + pick scheduling
  store.js              Global state + AsyncStorage persistence (MuzzProvider)
  api.js                Backend client (offline-first, mirrors to backend/)
  realtime.js           Socket.IO client (typing, presence, live messages)
  notifications.js      Push + local notifications
  photos.js             Image picker + upload
  haptics.js            Haptic helpers
  components/
    ui.js                   PhotoTile (with veil overlay), VeilBadge, Avatar, buttons, chips
    Butterfly.js            Animated butterfly
    Stories.js              Moments rail
  screens/
    OnboardingScreen        Welcome → profile → veil step (sisters) → deen → verify
    DiscoverScreen          Card stack with veil badges + veiled photos
    ButterflyScreen         AI matchmaker picks
    MatchesScreen           Likes-you grid + matches list
    MatchRevealScreen       Match moment + "she can unveil for you"
    ChatScreen              Chat with reactions, typing, calls
    ProfileDetailScreen     Full profile: veil, deen, prompts; unveils on match
    FiltersScreen           Veil style / sect / prayer / ethnicity filters
    GoldScreen              Veiled Gold paywall
    SocialScreen            Community feed (post / like / comment)
  MuzzNavigator.js      Bottom tabs + stack
```

## Backend

`backend/` is a deployable Node/Express + Socket.IO + SQLite API this
client mirrors to when `EXPO_PUBLIC_API_URL` is set. Offline-first:
without a backend the app runs fully from local seed data.
