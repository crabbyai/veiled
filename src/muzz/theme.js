// ─── Muzz Design System ─────────────────────────────────────────────
// Faithful recreation of the Muzz dating app aesthetic:
// clean white surfaces, signature pink-red brand, soft rounded cards.

export const M = {
  // Brand
  primary: '#FB406C',        // Muzz signature hot pink
  primaryDark: '#E22B57',
  primaryLight: '#FF7BA0',
  primarySoft: '#FFE9EF',    // tint backgrounds / chips
  primaryGlow: 'rgba(251,64,108,0.30)',

  // Butterfly accent (AI feature)
  butterfly: '#8B5CF6',
  butterflyLight: '#C4B5FD',
  butterflySoft: '#F1ECFF',
  butterflyGlow: 'rgba(139,92,246,0.30)',

  // Secondary / accents
  mint: '#19C3A2',
  gold: '#F5B400',
  blue: '#3B9DF5',

  // Surfaces — Muzz light theme
  bg: '#FFFFFF',
  bgSoft: '#F6F6F9',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgInput: '#F2F2F5',
  bgDark: '#16121C',         // chat bubbles (theirs), hero overlays

  // Text
  text: '#1A1726',
  textSoft: '#6B6878',
  textMuted: '#A09DAD',
  textOnPrimary: '#FFFFFF',

  // Lines
  border: '#ECECF1',
  borderSoft: '#F2F2F5',

  // Status
  online: '#2ECC71',
  away: '#F5B400',
  danger: '#FF3B30',
  success: '#2ECC71',

  // Overlays
  overlay: 'rgba(20,16,26,0.55)',
  scrim: 'rgba(0,0,0,0.35)',
};

export const GRAD = {
  primary: ['#FF6B93', '#FB406C', '#E22B57'],
  primarySoft: ['#FF8FA8', '#FB406C'],
  butterfly: ['#A78BFA', '#8B5CF6', '#7C3AED'],
  butterflyPink: ['#C084FC', '#F5325B'],
  gold: ['#FFD86B', '#F5B400'],
  sunset: ['#FF8F6B', '#F5325B', '#A855F7'],
  photo: ['#2A2438', '#16121C'],     // fallback photo backdrop
  hero: ['rgba(245,50,91,0.0)', 'rgba(245,50,91,0.0)', 'rgba(20,16,26,0.85)'],
};

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

export const SHADOW = {
  card: {
    shadowColor: '#1A1726',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  soft: {
    shadowColor: '#1A1726',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  primary: {
    shadowColor: '#FB406C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  butterfly: {
    shadowColor: '#8B5CF6',
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
  ['#FF6B8A', '#F5325B'],
  ['#A78BFA', '#7C3AED'],
  ['#FDBB2D', '#F5325B'],
  ['#22D3EE', '#3B82F6'],
  ['#34D399', '#059669'],
  ['#FB923C', '#EA580C'],
  ['#F472B6', '#A855F7'],
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
