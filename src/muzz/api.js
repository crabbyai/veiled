// ─── Backend client ─────────────────────────────────────────────────
// Talks to backend/routes/dating.js. The app is offline-first: every
// screen works from the local store, and when a backend URL is
// configured the client hydrates from the server and mirrors actions
// to it. Set EXPO_PUBLIC_API_URL (e.g. http://localhost:3000) to enable.

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL || '';
const TOKEN_KEY = '@muzz_api_token';

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

export async function discover() {
  const data = await request('/dating/discover');
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

export const swipe = (targetId, action) =>
  request('/dating/swipe', { method: 'POST', body: { targetId: toServerId(targetId), action } });

export const instantChat = (targetId) =>
  request('/dating/instant-chat', { method: 'POST', body: { targetId: toServerId(targetId) } });

export const likesYou = () => request('/dating/likes-you');
export const matches = () => request('/dating/matches');
export const butterflyPick = () => request('/dating/butterfly/pick');
export const getMessages = (matchId) => request(`/dating/matches/${matchId}/messages`);
export const sendMessage = (matchId, body) =>
  request(`/dating/matches/${matchId}/messages`, { method: 'POST', body: { body } });

export const superLike = (targetId, note) =>
  request('/dating/super-like', { method: 'POST', body: { targetId: toServerId(targetId), note } });
export const boost = () => request('/dating/boost', { method: 'POST' });
export const reactToMessage = (messageId, emoji) =>
  request(`/dating/messages/${messageId}/react`, { method: 'POST', body: { emoji } });
export const block = (targetId, reason) =>
  request('/dating/block', { method: 'POST', body: { targetId: toServerId(targetId), reason } });
export const deletePhoto = (photoId) => request(`/dating/photos/${photoId}`, { method: 'DELETE' });

// Upload a local photo (uri from image picker) as multipart form data.
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
