# Muzz·ai — Muzz clone with an AI Butterfly matchmaker

A full Muzz-style dating + social app built in React Native / Expo. The
headline feature is the **AI Butterfly**: instead of endless swiping, an
AI matchmaker learns your profile and feedback, then automatically brings
you your most compatible people — each with a transparent reason for *why*
it chose them.

`App.js` mounts this experience via `MuzzNavigator`. (The original
Androgenic looksmaxxing app is still present under
`src/navigation/AppNavigator.js` if you want to switch back.)

## Architecture

```
src/muzz/
  theme.js              Muzz design system (brand pink-red, light surfaces)
  haptics.js            Web-safe haptics wrapper
  data.js               Mock profiles, social posts, interests, prompts
  butterfly.js          AI matching engine (scoring + reasons + daily pick)
  store.js              Global state + AsyncStorage persistence (MuzzProvider)
  components/
    ui.js               Avatar / PhotoTile / buttons / chips / verified tick
    Butterfly.js        Animated flapping SVG butterfly (reanimated)
  screens/
    OnboardingScreen        Multi-step setup that "trains" the butterfly
    ButterflyScreen         Home — auto-match flow with search animation + reasons
    MatchRevealScreen       "It's a match!" celebration + first message
    ExploreScreen           Optional manual browse grid (sorted by match %)
    MatchesScreen           Matches + "Likes you" (Gold-gated) tabs
    SocialScreen            Muzz Social feed (post / like / comment / filter)
    PostScreen              Single post with comments
    MessagesScreen          Conversation list + new-matches strip
    ChatScreen              1:1 chat: AI icebreakers, Chaperone mode, typing,
                            auto-replies, voice/video call affordances
    ProfileDetailScreen     Full profile w/ "Butterfly's take" compatibility
    ProfileScreen           Your profile, completeness, butterfly settings, stats
    GoldScreen              Premium paywall (perks + plans)
    SettingsScreen          Discovery / privacy / notifications / account
  MuzzNavigator.js      Custom bottom tab bar (butterfly center) + stack
```

## The AI Butterfly

`butterfly.js` scores every candidate against you using shared interests,
shared values, intention alignment (marriage / long-term), proximity,
verification, shared languages, and your learned like/pass feedback, plus a
deterministic "chemistry" jitter. It returns a 0–100 compatibility score and
a list of human-readable reasons. The home screen animates the butterfly
"flying out" to search, then reveals the top pick with its reasoning — the
whole loop replaces swiping.

## Modern dating features included

Auto-matching, compatibility scoring with explanations, verified profiles,
Super Likes, boosts, "Likes you" (premium), Muzz Social feed, in-app chat
with AI-generated icebreakers, **Chaperone** oversight mode, voice/video
call affordances, profile prompts, advanced filters & travel mode (Gold),
incognito mode, and a full Gold subscription paywall.

## Notes

- Profile photos are rendered as initial-on-gradient placeholders so the app
  runs with zero external assets (web + native).
- All state persists locally via AsyncStorage; "Reset demo data" on the
  Profile screen clears it.
