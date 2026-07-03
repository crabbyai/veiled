// ─── Veiled Design System ───────────────────────────────────────────
// Veiled — the marriage app for hijabis & niqabis. Elegant, modest,
// premium: deep amethyst violet brand, silk-white surfaces, gold
// accents, and a rose accent for the AI Butterfly matchmaker.

export const M = {
  // Brand — Veiled amethyst
  primary: '#7C3AED',        // Veiled signature violet
  primaryDark: '#6D28D9',
  primaryLight: '#A78BFA',
  primarySoft: '#F1EAFE',    // tint backgrounds / chips
  primaryGlow: 'rgba(124,58,237,0.30)',

  // Butterfly accent (AI matchmaker)
  butterfly: '#DB2777',
  butterflyLight: '#F9A8D4',
  butterflySoft: '#FDEEF6',
  butterflyGlow: 'rgba(219,39,119,0.30)',

  // Secondary / accents
  mint: '#19C3A2',
  gold: '#C99A2C',           // Veiled gold — premium tier
  blue: '#3B9DF5',

  // Surfaces — silk-white light theme
  bg: '#FFFFFF',
  bgSoft: '#F7F5FB',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgInput: '#F3F1F7',
  bgDark: '#171122',         // chat bubbles (theirs), hero overlays

  // Text
  text: '#1C1526',
  textSoft: '#6C6579',
  textMuted: '#A29CAF',
  textOnPrimary: '#FFFFFF',

  // Lines
  border: '#ECE8F2',
  borderSoft: '#F3F1F7',

  // Status
  online: '#2ECC71',
  away: '#C99A2C',
  danger: '#FF3B30',
  success: '#2ECC71',

  // Overlays
  overlay: 'rgba(23,17,34,0.55)',
  scrim: 'rgba(0,0,0,0.35)',

  // The Veil — frosted photo-privacy layer
  veil: 'rgba(124,58,237,0.55)',
  veilDeep: 'rgba(46,26,84,0.82)',
};

export const GRAD = {
  primary: ['#9F67F5', '#7C3AED', '#6D28D9'],
  primarySoft: ['#B794F6', '#7C3AED'],
  butterfly: ['#F472B6', '#DB2777', '#BE185D'],
  butterflyPink: ['#C084FC', '#DB2777'],
  gold: ['#EFD27C', '#C99A2C'],
  sunset: ['#B47CF5', '#7C3AED', '#DB2777'],
  photo: ['#2C2340', '#171122'],     // fallback photo backdrop
  hero: ['rgba(124,58,237,0.0)', 'rgba(124,58,237,0.0)', 'rgba(23,17,34,0.85)'],
  veil: ['rgba(159,103,245,0.75)', 'rgba(76,40,140,0.88)'],
};

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

export const SHADOW = {
  card: {
    shadowColor: '#1C1526',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  soft: {
    shadowColor: '#1C1526',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  primary: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  butterfly: {
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
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

// Deterministic gradient picker for avatars / photo placeholders
export const PHOTO_GRADS = [
  ['#A78BFA', '#7C3AED'],
  ['#F472B6', '#BE185D'],
  ['#C084FC', '#8B5CF6'],
  ['#22D3EE', '#3B82F6'],
  ['#34D399', '#059669'],
  ['#EFD27C', '#C99A2C'],
  ['#F9A8D4', '#A855F7'],
  ['#60A5FA', '#6366F1'],
  ['#FBBF24', '#F59E0B'],
  ['#2DD4BF', '#0EA5E9'],
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
