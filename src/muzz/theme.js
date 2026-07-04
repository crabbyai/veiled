// ─── Veiled Design System ───────────────────────────────────────────
// Veiled — the marriage app for hijabis & niqabis. A strict
// black-and-white monochrome, available in LIGHT and DARK.
//
// Theme mode is chosen at bundle load from a persisted preference
// (localStorage on web; defaults to light on native and applies on the
// next launch after a toggle). One functional accent survives the
// monochrome rule: a green "online / verified" signal.

import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@veiled_theme';

// Resolve the active mode synchronously so every StyleSheet built at
// import time uses the right palette. Web has synchronous localStorage;
// native falls back to light and applies a change on the next launch.
function initialMode() {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(THEME_KEY);
      if (v === 'dark' || v === 'light') return v;
    }
  } catch {}
  return 'light';
}

export const THEME_MODE = initialMode();
const dark = THEME_MODE === 'dark';

// One functional accent kept out of the monochrome rule.
const ONLINE = dark ? '#3BE37A' : '#12B76A';

const LIGHT = {
  primary: '#111111', primaryDark: '#000000', primaryLight: '#5B5B5F',
  primarySoft: '#F1F1F2', primaryGlow: 'rgba(0,0,0,0.28)',
  butterfly: '#2A2A2E', butterflyLight: '#9A9AA0', butterflySoft: '#F0F0F1',
  butterflyGlow: 'rgba(0,0,0,0.24)',
  mint: '#3A3A3C', gold: '#6E6E72', blue: '#1C1C1E',
  bg: '#FFFFFF', bgSoft: '#F5F5F6', bgCard: '#FFFFFF', bgElevated: '#FFFFFF',
  bgInput: '#F0F0F1', bgDark: '#0E0E10',
  text: '#111111', textSoft: '#6B6B6F', textMuted: '#A2A2A7', textOnPrimary: '#FFFFFF',
  border: '#E6E6E8', borderSoft: '#F0F0F1',
  online: ONLINE, away: '#6E6E72', danger: '#111111', success: ONLINE,
  overlay: 'rgba(10,10,12,0.55)', scrim: 'rgba(0,0,0,0.35)',
  veil: 'rgba(20,20,22,0.55)', veilDeep: 'rgba(0,0,0,0.82)',
};

const DARK = {
  primary: '#FFFFFF', primaryDark: '#E2E2E4', primaryLight: '#8A8A8E',
  primarySoft: '#1E1E20', primaryGlow: 'rgba(255,255,255,0.22)',
  butterfly: '#E6E6E8', butterflyLight: '#6B6B6F', butterflySoft: '#1C1C1E',
  butterflyGlow: 'rgba(255,255,255,0.18)',
  mint: '#C8C8CC', gold: '#C9C9CE', blue: '#E6E6E8',
  bg: '#0E0E10', bgSoft: '#161618', bgCard: '#161618', bgElevated: '#1E1E20',
  bgInput: '#1E1E20', bgDark: '#000000',
  text: '#F5F5F6', textSoft: '#A2A2A7', textMuted: '#6B6B6F', textOnPrimary: '#0E0E10',
  border: '#2A2A2C', borderSoft: '#1E1E20',
  online: ONLINE, away: '#C9C9CE', danger: '#F5F5F6', success: ONLINE,
  overlay: 'rgba(0,0,0,0.62)', scrim: 'rgba(0,0,0,0.5)',
  veil: 'rgba(0,0,0,0.55)', veilDeep: 'rgba(0,0,0,0.88)',
};

export const M = dark ? DARK : LIGHT;

export const GRAD = dark ? {
  primary: ['#FFFFFF', '#E2E2E4', '#C8C8CC'],
  primarySoft: ['#E2E2E4', '#C8C8CC'],
  butterfly: ['#E6E6E8', '#B4B4B8', '#8A8A8E'],
  butterflyPink: ['#C8C8CC', '#8A8A8E'],
  gold: ['#E8E8EA', '#B4B4B8'],
  sunset: ['#C8C8CC', '#8A8A8E', '#4A4A4E'],
  photo: ['#2C2C2E', '#0E0E10'],
  hero: ['rgba(14,14,16,0.0)', 'rgba(14,14,16,0.0)', 'rgba(0,0,0,0.9)'],
  veil: ['rgba(44,44,48,0.82)', 'rgba(0,0,0,0.92)'],
} : {
  primary: ['#3A3A3C', '#1C1C1E', '#000000'],
  primarySoft: ['#5B5B5F', '#1C1C1E'],
  butterfly: ['#4A4A4E', '#2A2A2E', '#0E0E10'],
  butterflyPink: ['#6B6B6F', '#1C1C1E'],
  gold: ['#E8E8EA', '#B4B4B8'],
  sunset: ['#5B5B5F', '#2A2A2E', '#0E0E10'],
  photo: ['#2C2C2E', '#0E0E10'],
  hero: ['rgba(14,14,16,0.0)', 'rgba(14,14,16,0.0)', 'rgba(10,10,12,0.85)'],
  veil: ['rgba(70,70,74,0.78)', 'rgba(14,14,16,0.9)'],
};

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

const shadowColor = '#000000';
export const SHADOW = {
  card: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: dark ? 0.5 : 0.10, shadowRadius: 20, elevation: 6 },
  soft: { shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: dark ? 0.4 : 0.07, shadowRadius: 8, elevation: 3 },
  primary: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: dark ? 0.55 : 0.28, shadowRadius: 18, elevation: 8 },
  butterfly: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: dark ? 0.5 : 0.26, shadowRadius: 22, elevation: 8 },
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

// Monochrome ramp — every photo placeholder is a shade of gray.
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

export function gradVariantFor(seed = '', idx = 0) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PHOTO_GRADS[(h + idx * 3) % PHOTO_GRADS.length];
}

// Persist a new theme choice and apply it. Web reloads immediately;
// native persists and applies on next launch (RN styles are built at
// load, so a live in-place swap isn't possible without a reload).
export async function setThemeMode(mode) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, mode);
  } catch {}
  try { await AsyncStorage.setItem(THEME_KEY, mode); } catch {}
  try {
    if (typeof window !== 'undefined' && window.location && window.location.reload) {
      window.location.reload();
      return;
    }
  } catch {}
  // Native: best-effort live reload if expo-updates is available.
  try {
    const Updates = require('expo-updates');
    if (Updates && Updates.reloadAsync) await Updates.reloadAsync();
  } catch {}
}

export const isDark = dark;
