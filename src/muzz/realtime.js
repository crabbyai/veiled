// ─── Realtime client ────────────────────────────────────────────────
// Connects to the backend's Socket.IO server when the API is configured.
// Offline-first: if there's no server, nothing connects and the app
// behaves exactly as before (simulated replies).

import { io } from 'socket.io-client';
import * as api from './api';

const BASE = process.env.EXPO_PUBLIC_API_URL || '';

let socket = null;
const typingListeners = new Map(); // personId -> Set<cb>
const presence = new Map();        // serverUserId -> online
const callListeners = new Set();   // cb({ event, ...payload })

export const isConnected = () => !!(socket && socket.connected);

export async function connect({ onMessage, onMatch } = {}) {
  if (!BASE || socket) return;
  if (!(await api.isAvailable())) return;
  const token = await api.loadToken();
  if (!token) return;

  socket = io(BASE, { auth: { token }, transports: ['websocket', 'polling'] });

  socket.on('message:new', async ({ matchId, message }) => {
    try {
      // Map server match → local person id via the matches list
      const { matches } = await api.matches();
      const m = matches.find((x) => x.matchId === matchId);
      if (m && onMessage) onMessage(api.toLocalId(m.person.id), message.body, message.kind || 'text', message.meta || null);
    } catch {}
  });

  socket.on('match:new', ({ person }) => {
    if (onMatch && person) onMatch(api.toLocalId(person.id), person);
  });

  socket.on('typing', ({ from, isTyping }) => {
    const localId = api.toLocalId(from);
    const subs = typingListeners.get(localId);
    if (subs) subs.forEach((cb) => cb(isTyping));
  });

  socket.on('presence', ({ userId, online }) => {
    presence.set(userId, online);
  });

  // Call signalling. These are relayed verbatim to whoever is listening
  // — the call screen while a call is up, and the app shell the rest of
  // the time so an incoming call can be announced from anywhere.
  ['call:incoming', 'call:offer', 'call:answer', 'call:ice', 'call:accepted', 'call:ended']
    .forEach((event) => {
      socket.on(event, (payload) => {
        callListeners.forEach((cb) => { try { cb(event, payload || {}); } catch {} });
      });
    });
}

// ── Calls ───────────────────────────────────────────────────────────
export function onCallEvent(cb) {
  callListeners.add(cb);
  return () => callListeners.delete(cb);
}

// Ring someone. Resolves the server's acknowledgement: { ok } or
// { ok: false, error: 'offline' | 'unavailable' }.
export function ring(serverUserId, { mode, callId }) {
  return new Promise((resolve) => {
    if (!isConnected()) { resolve({ ok: false, error: 'offline' }); return; }
    const t = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 6000);
    socket.emit('call:ring', { to: serverUserId, mode, callId }, (res) => {
      clearTimeout(t);
      resolve(res || { ok: false, error: 'unavailable' });
    });
  });
}

// Everything after the ring is addressed by call id — the server knows
// who the two parties are and routes it.
export function signal(event, payload) {
  if (isConnected()) socket.emit(event, payload);
}

export function disconnect() {
  if (socket) { socket.disconnect(); socket = null; }
}

// Subscribe to typing events for one conversation. Returns unsubscribe.
export function onTyping(personId, cb) {
  if (!typingListeners.has(personId)) typingListeners.set(personId, new Set());
  typingListeners.get(personId).add(cb);
  return () => typingListeners.get(personId)?.delete(cb);
}

// Tell the other side we're typing (debounced by the caller).
export function emitTyping(personId, isTyping) {
  if (!isConnected()) return;
  api.matches().then(({ matches }) => {
    const m = matches.find((x) => api.toLocalId(x.person.id) === personId);
    if (m) socket.emit('typing', { matchId: m.matchId, to: m.person.id, isTyping });
  }).catch(() => {});
}

export const isUserOnline = (serverUserId) => !!presence.get(serverUserId);
