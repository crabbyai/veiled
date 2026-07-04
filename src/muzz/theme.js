// ─── Veiled Design System ───────────────────────────────────────────
// Veiled — the marriage app for hijabis & niqabis. Elegant, modest,
// premium: a strict black-and-white monochrome. White surfaces,
// near-black ink for brand + actions, and a full grayscale scale.
// No colour — the veil, the photos and the type carry the drama.

export const M = {
  // Brand — monochrome ink
  primary: '#111111',        // Veiled ink (black)
  primaryDark: '#000000',
  primaryLight: '#5B5B5F',
  primarySoft: '#F1F1F2',    // tint backgrounds / chips
  primaryGlow: 'rgba(0,0,0,0.28)',

  // Butterfly accent (AI matchmaker) — graphite, still monochrome
  butterfly: '#2A2A2E',
  butterflyLight: '#9A9AA0',
  butterflySoft: '#F0F0F1',
  butterflyGlow: 'rgba(0,0,0,0.24)',

  // Secondary / accents — all neutralised to the grayscale ramp
  mint: '#3A3A3C',
  gold: '#6E6E72',           // premium tier reads as platinum/graphite
  blue: '#1C1C1E',           // verified tick / super-like → ink

  // Surfaces — silk-white light theme
  bg: '#FFFFFF',
  bgSoft: '#F5F5F6',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgInput: '#F0F0F1',
  bgDark: '#0E0E10',         // chat bubbles (theirs), hero overlays

  // Text
  text: '#111111',
  textSoft: '#6B6B6F',
  textMuted: '#A2A2A7',
  textOnPrimary: '#FFFFFF',

  // Lines
  border: '#E6E6E8',
  borderSoft: '#F0F0F1',

  // Status — kept monochrome; presence uses a solid ink dot
  online: '#111111',
  away: '#6E6E72',
  danger: '#111111',
  success: '#111111',

  // Overlays
  overlay: 'rgba(10,10,12,0.55)',
  scrim: 'rgba(0,0,0,0.35)',

  // The Veil — frosted photo-privacy layer (charcoal frost)
  veil: 'rgba(20,20,22,0.55)',
  veilDeep: 'rgba(0,0,0,0.82)',
};

export const GRAD = {
  primary: ['#3A3A3C', '#1C1C1E', '#000000'],
  primarySoft: ['#5B5B5F', '#1C1C1E'],
  butterfly: ['#4A4A4E', '#2A2A2E', '#0E0E10'],
  butterflyPink: ['#6B6B6F', '#1C1C1E'],
  gold: ['#E8E8EA', '#B4B4B8'],       // platinum sheen for the premium tier
  sunset: ['#5B5B5F', '#2A2A2E', '#0E0E10'],
  photo: ['#2C2C2E', '#0E0E10'],      // fallback photo backdrop
  hero: ['rgba(14,14,16,0.0)', 'rgba(14,14,16,0.0)', 'rgba(10,10,12,0.85)'],
  veil: ['rgba(70,70,74,0.78)', 'rgba(14,14,16,0.9)'],
};

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

export const SHADOW = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  primary: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  butterfly: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 22,
    elevation: 8,
  },
};

export const TYPE = {
  hero: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: M.text },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, color: M.text },
  h2: { fontSize: 19, fontWeight: '700', color: M.text },
  h3: { fontSize: 16, fontWeight: '700', color: M.text },
  body: { fontSize: 15, fontWeight: '500', color: M.text },
  soft: { fontSize: 14, fontWeight: '500', color: M.textSoft },
  caption: { fontSize: 12, fontWeight: '600', color: M.textMuted },
};

// Deterministic gradient picker for avatars / photo placeholders.
// Monochrome ramp — every placeholder is a shade of gray, never colour.
export const PHOTO_GRADS = [
  ['#3A3A3C', '#1C1C1E'],
  ['#6B6B6E', '#2E2E30'],
  ['#9A9A9E', '#4A4A4D'],
  ['#4A4A4D', '#161618'],
  ['#7A7A7E', '#3A3A3C'],
  ['#5A5A5E', '#242426'],
  ['#8A8A8E', '#3E3E40'],
  ['#2E2E30', '#0E0E10'],
  ['#6E6E72', '#2A2A2C'],
  ['#525256', '#1E1E20'],
];

export function gradFor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PHOTO_GRADS[h % PHOTO_GRADS.length];
}

// Nth "photo" for a profile — used by the card photo pager.
export function gradVariantFor(seed = '', idx = 0) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PHOTO_GRADS[(h + idx * 3) % PHOTO_GRADS.length];
}
