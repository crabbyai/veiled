// ─── Backend client ─────────────────────────────────────────────────
// Talks to backend/routes/dating.js. The app is offline-first: every
// screen works from the local store, and when a backend URL is
// configured the client hydrates from the server and mirrors actions
// to it. Set EXPO_PUBLIC_API_URL (e.g. http://localhost:3000) to enable.

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL || '';
const TOKEN_KEY = '@veiled_api_token';

let token = null;
let available = null; // null = unknown, true/false after first probe
// Local seed ids (p1..p10) ↔ server user ids, built from /discover by name.
const idMap = {};
const reverseMap = {};

export const isConfigured = () => !!BASE;

export async function loadToken() {
  if (token) return token;
  try { token = await AsyncStorage.getItem(TOKEN_KEY); } catch {}
  return token;
}

async function setToken(t) {
  token = t;
  try {
    if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!BASE) throw new Error('API not configured');
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    await loadToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.upgradeRequired = !!data.upgradeRequired;
    throw err;
  }
  return data;
}

// Probe the server once; remembers the answer for the session.
export async function isAvailable() {
  if (!BASE) return false;
  if (available !== null) return available;
  try {
    const res = await fetch(`${BASE}/api/health`, { method: 'GET' });
    available = res.ok;
  } catch {
    available = false;
  }
  return available;
}

// ── Auth ─────────────────────────────────────────────────────────────

export async function register(email, password, displayName) {
  const data = await request('/auth/register', { method: 'POST', body: { email, password, displayName }, auth: false });
  await setToken(data.token);
  return data.user;
}

export async function login(email, password) {
  const data = await request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
  await setToken(data.token);
  return data.user;
}

export const logout = () => setToken(null);
export const hasSession = async () => !!(await loadToken());

// ── Dating ───────────────────────────────────────────────────────────

export const getMyProfile = () => request('/dating/profile');
export const saveProfile = (profile) => request('/dating/profile', { method: 'PUT', body: profile });

// Build the discover query string from the app's filter object. Passport
// (filters.passportCity) discovers in any city and relaxes distance.
function discoverQuery(filters = {}) {
  const p = [];
  const add = (k, v) => { if (v !== undefined && v !== null && v !== '' && v !== 'Any') p.push(`${k}=${encodeURIComponent(v)}`); };
  add('ageMin', filters.ageMin);
  add('ageMax', filters.ageMax);
  add('veil', filters.veil);
  add('sect', filters.sect);
  add('prayerLevel', filters.prayerLevel);
  add('ethnicity', filters.ethnicity);
  if (filters.verifiedOnly) p.push('verifiedOnly=true');
  if (filters.passportCity) add('city', filters.passportCity);
  else add('maxDistance', filters.maxDistance);
  return p.length ? `?${p.join('&')}` : '';
}

export async function discover(filters) {
  const data = await request(`/dating/discover${discoverQuery(filters)}`);
  // Rebuild the local↔server id map from candidate names (seed parity).
  const localIds = { Layla: 'p1', Amara: 'p2', Sana: 'p3', Yasmin: 'p4', Noor: 'p5', Hana: 'p6', Mariam: 'p7', Zara: 'p8', Eman: 'p9', Aaliyah: 'p10' };
  for (const c of data.candidates) {
    const local = localIds[c.person.name];
    if (local) { idMap[local] = c.person.id; reverseMap[c.person.id] = local; }
  }
  return data;
}

export const toServerId = (localId) => idMap[localId] || localId;
export const toLocalId = (serverId) => reverseMap[serverId] || serverId;

// `answer` carries the reply to her Compatibility Question when she has
// one — the server refuses an unanswered like with 422 answerRequired.
export const swipe = (targetId, action, { answer = null } = {}) =>
  request('/dating/swipe', { method: 'POST', body: { targetId: toServerId(targetId), action, answer } });
// Rewind: undo the most recent swipe (or a specific person's) on the server.
export const rewind = (targetId) =>
  request('/dating/rewind', { method: 'POST', body: targetId ? { targetId: toServerId(targetId) } : {} });

export const instantChat = (targetId) =>
  request('/dating/instant-chat', { method: 'POST', body: { targetId: toServerId(targetId) } });

export const likesYou = () => request('/dating/likes-you');
export const topPicks = () => request('/dating/top-picks');
export const surge = () => request('/dating/surge');
export const matches = () => request('/dating/matches');
export const butterflyPick = () => request('/dating/butterfly/pick');
export const getMessages = (matchId, { before, limit } = {}) => {
  const qs = [];
  if (before) qs.push(`before=${before}`);
  if (limit) qs.push(`limit=${limit}`);
  return request(`/dating/matches/${matchId}/messages${qs.length ? `?${qs.join('&')}` : ''}`);
};
export const unveil = (matchId) => request(`/dating/matches/${matchId}/unveil`, { method: 'POST' });
// The Veil: where this pair stands, and his request that she unveil.
export const veilState = (matchId) => request(`/dating/matches/${matchId}/veil`);
export const askUnveil = (matchId) => request(`/dating/matches/${matchId}/unveil-ask`, { method: 'POST' });
export const unmatch = (matchId) => request(`/dating/matches/${matchId}/unmatch`, { method: 'POST' });
// `kind` is 'text', 'image' or 'audio'; for the latter two `body` is
// the path returned by uploadMedia and `meta` carries whatever that
// kind needs (a voice note's length, a photo's shape).
export const sendMessage = (matchId, body, kind = 'text', meta = null) =>
  request(`/dating/matches/${matchId}/messages`, { method: 'POST', body: { body, kind, meta } });

export const superLike = (targetId, note, content) =>
  request('/dating/super-like', { method: 'POST', body: { targetId: toServerId(targetId), note, ...(content || {}) } });
// Hinge: like with a comment on a specific photo/prompt.
export const likeWithComment = (targetId, { comment, contentType, contentRef, answer = null } = {}) =>
  request('/dating/swipe', { method: 'POST', body: { targetId: toServerId(targetId), action: 'like', comment, contentType, contentRef, answer } });
// Hinge: Roses (standout like) + Standouts set + We Met feedback.
export const rose = (targetId, { comment, contentType, contentRef, answer = null } = {}) =>
  request('/dating/rose', { method: 'POST', body: { targetId: toServerId(targetId), comment, contentType, contentRef, answer } });
export const standouts = () => request('/dating/standouts');
export const weMet = (matchId, met, wentWell) =>
  request(`/dating/matches/${matchId}/we-met`, { method: 'POST', body: { met, wentWell } });
export const boost = () => request('/dating/boost', { method: 'POST' });
export const reactToMessage = (messageId, emoji) =>
  request(`/dating/messages/${messageId}/react`, { method: 'POST', body: { emoji } });
export const block = (targetId, reason) =>
  request('/dating/block', { method: 'POST', body: { targetId: toServerId(targetId), reason } });
export const deletePhoto = (photoId) => request(`/dating/photos/${photoId}`, { method: 'DELETE' });

// ── Safety: report ───────────────────────────────────────────────────
export const report = (targetId, { kind = 'profile', refId = null, reason = 'other', detail = null } = {}) =>
  request('/dating/report', {
    method: 'POST',
    body: { targetId: targetId ? toServerId(targetId) : null, kind, refId, reason, detail },
  });

// ── Friend's Take: vouch invites ─────────────────────────────────────
// Member creates a shareable link; a friend opens it (public preview),
// then submits a vouch — no account needed.
export const createVouchInvite = (relationship) =>
  request('/dating/friend-takes/invite', { method: 'POST', body: { relationship } });
export const getVouchInvite = (token) =>
  request(`/dating/friend-takes/invite/${token}`, { auth: false });
export const submitVouch = (token, { author, relationship, text, voiceUrl } = {}) =>
  request(`/dating/friend-takes/invite/${token}`, {
    method: 'POST', auth: false, body: { author, relationship, text, voiceUrl },
  });
// Public web page a friend opens to submit their vouch (served by the API).
export const vouchUrl = (token) => (BASE ? `${BASE}/vouch/${token}` : '');

// ── Account deletion (App Store 5.1.1(v) requires this in-app) ───────
export async function deleteAccount() {
  const out = await request('/auth/account', { method: 'DELETE' });
  await setToken(null);
  return out;
}

// ── Billing (IAP) & identity verification ────────────────────────────
export const billingProducts = () => request('/billing/products', { auth: false });
export const billingVerify = (payload) => request('/billing/verify', { method: 'POST', body: payload });
export const verificationStart = () => request('/verification/start', { method: 'POST' });
export const phoneStart = (phone) => request('/auth/phone/start', { method: 'POST', auth: false, body: { phone } });
export const phoneVerify = (phone, code) => request('/auth/phone/verify', { method: 'POST', body: { phone, code } });

// ── Pause (Snooze) & Share my profile ────────────────────────────────
export const pauseProfile = (paused) =>
  request('/dating/profile/pause', { method: 'POST', body: { paused: !!paused } });
export const shareProfile = () => request('/dating/profile/share', { method: 'POST' });
export const profileShareUrl = (token) => (BASE ? `${BASE}/p/${token}` : '');

// ── Signals ──────────────────────────────────────────────────────────
export const getSignals = () => request('/dating/signals');
export const signalRead = (profileId) =>
  request('/dating/signals/read', { method: 'POST', body: { profileId: toServerId(profileId) } });
export const signalReply = (matchId) =>
  request('/dating/signals/reply', { method: 'POST', body: { matchId } });

// Upload a local photo (uri from image picker) as multipart form data.
// An attachment for a message. Same shape as uploadPhoto, but the
// endpoint takes audio too and the field is 'file'.
export async function uploadMedia(uri, { name, type } = {}) {
  if (!BASE) throw new Error('API not configured');
  await loadToken();
  const form = new FormData();
  const guess = (uri.split('?')[0].split('/').pop()) || 'file';
  const filename = name || guess;
  if (uri.startsWith('data:') || uri.startsWith('blob:')) {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, filename);
  } else {
    form.append('file', { uri, name: filename, type: type || 'application/octet-stream' });
  }
  const res = await fetch(`${BASE}/api/dating/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function uploadPhoto(uri) {
  if (!BASE) throw new Error('API not configured');
  await loadToken();
  const form = new FormData();
  if (uri.startsWith('data:') || uri.startsWith('blob:')) {
    const blob = await (await fetch(uri)).blob();
    form.append('image', blob, 'photo.jpg');
  } else {
    const name = uri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    form.append('image', { uri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  }
  const res = await fetch(`${BASE}/api/dating/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export const mediaUrl = (url) => (url && url.startsWith('/') ? `${BASE}${url}` : url);

// ── Social ───────────────────────────────────────────────────────────

export const getPosts = () => request('/dating/social/posts');
export const createPost = (body, tag, imageSeed) =>
  request('/dating/social/posts', { method: 'POST', body: { body, tag, imageSeed } });
export const likePost = (postId) => request(`/dating/social/posts/${postId}/like`, { method: 'POST' });
export const getComments = (postId) => request(`/dating/social/posts/${postId}/comments`);
export const addComment = (postId, body) =>
  request(`/dating/social/posts/${postId}/comments`, { method: 'POST', body: { body } });

// ── Fire-and-forget mirroring ────────────────────────────────────────
// Store actions call this so local-first UX is never blocked by the
// network; failures are silently dropped (server re-syncs on next pull).
export function mirror(fn) {
  if (!BASE) return;
  isAvailable().then((ok) => { if (ok) fn().catch(() => {}); });
}
