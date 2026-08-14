// ─── Build configuration ────────────────────────────────────────────
// Where the app gets its people from, decided at build time.
//
// Veiled is a real matchmaking service: the members you see must be
// real accounts on the API. The repo also ships a handful of written
// sample profiles used while developing the UI — those are fiction, and
// a build that shows fiction as if it were members is both dishonest to
// the people using it and a guideline 2.1 rejection ("app completeness"
// covers demo and placeholder content).
//
// So sample profiles are opt-in, they can never be on in a build that
// has a backend, and when they are on the app says so on screen.

export const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// A backend is configured — members come from the API.
export const HAS_BACKEND = !!API_URL;

// Development only: EXPO_PUBLIC_DEMO_MODE=1 loads the written sample
// profiles. Ignored whenever a backend is configured, so a shipping
// build cannot accidentally carry them.
export const DEMO_MODE = !HAS_BACKEND && process.env.EXPO_PUBLIC_DEMO_MODE === '1';
