// ─── Socket.IO real-time layer ──────────────────────────────────────
// JWT-authenticated sockets, one room per user. Routes call emitToUser
// to push live events (message:new, match:new, unveil, typing, presence).
//
// It also carries call signalling. The media never touches this server —
// WebRTC negotiates a direct connection between the two devices, and all
// that passes through here is the offer, the answer and the ICE
// candidates needed to find each other, plus ring/accept/decline/end.

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'veiled-dev-secret';

let io = null;
const online = new Set();
// callId -> { from, to, mode, startedAt }. A call only exists while both
// ends are talking about it; nothing is written to the database.
const calls = new Map();

// Signalling may only ever travel between two people who are matched and
// have not blocked each other. Without this check any authenticated
// socket could ring any user id it liked.
function canCall(a, b) {
  try {
    const m = db.prepare(
      'SELECT 1 FROM dating_matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)'
    ).get(a, b, b, a);
    if (!m) return false;
    const blocked = db.prepare(
      'SELECT 1 FROM dating_blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)'
    ).get(a, b, b, a);
    return !blocked;
  } catch {
    return false;
  }
}

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    online.add(socket.userId);
    io.emit('presence', { userId: socket.userId, online: true });

    // Relay typing state to the other participant
    socket.on('typing', ({ matchId, to, isTyping }) => {
      if (to) io.to(`user:${to}`).emit('typing', { matchId, from: socket.userId, isTyping: !!isTyping });
    });

    // ── Call signalling ───────────────────────────────────────────
    // The caller rings. `mode` is 'audio' or 'video'.
    socket.on('call:ring', ({ to, mode, callId }, ack) => {
      const peer = Number(to);
      if (!callId || !peer || !canCall(socket.userId, peer)) {
        if (ack) ack({ ok: false, error: 'unavailable' });
        return;
      }
      if (!online.has(peer)) {
        if (ack) ack({ ok: false, error: 'offline' });
        return;
      }
      calls.set(callId, { from: socket.userId, to: peer, mode: mode === 'video' ? 'video' : 'audio', startedAt: Date.now() });
      io.to(`user:${peer}`).emit('call:incoming', { callId, from: socket.userId, mode });
      if (ack) ack({ ok: true });
    });

    // Everything after the ring is between the two parties named on the
    // call, so each hop is checked against the call record rather than
    // trusted from the payload.
    const partner = (callId) => {
      const c = calls.get(callId);
      if (!c) return null;
      if (c.from === socket.userId) return c.to;
      if (c.to === socket.userId) return c.from;
      return null;
    };

    const relay = (event) => ({ callId, ...rest }) => {
      const other = partner(callId);
      if (other) io.to(`user:${other}`).emit(event, { callId, from: socket.userId, ...rest });
    };

    socket.on('call:offer', relay('call:offer'));
    socket.on('call:answer', relay('call:answer'));
    socket.on('call:ice', relay('call:ice'));

    socket.on('call:accept', ({ callId }) => {
      const other = partner(callId);
      if (other) io.to(`user:${other}`).emit('call:accepted', { callId, from: socket.userId });
    });

    socket.on('call:decline', ({ callId, reason }) => {
      const other = partner(callId);
      if (other) io.to(`user:${other}`).emit('call:ended', { callId, reason: reason || 'declined' });
      calls.delete(callId);
    });

    socket.on('call:end', ({ callId }) => {
      const other = partner(callId);
      if (other) io.to(`user:${other}`).emit('call:ended', { callId, reason: 'ended' });
      calls.delete(callId);
    });

    socket.on('disconnect', () => {
      online.delete(socket.userId);
      io.emit('presence', { userId: socket.userId, online: false });
      // Dropping off mid-call has to hang up, or the other side sits
      // listening to nothing until they give up on it themselves.
      for (const [callId, c] of calls) {
        if (c.from === socket.userId || c.to === socket.userId) {
          const other = c.from === socket.userId ? c.to : c.from;
          io.to(`user:${other}`).emit('call:ended', { callId, reason: 'disconnected' });
          calls.delete(callId);
        }
      }
    });
  });

  return io;
}

const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

const isOnline = (userId) => online.has(userId);
const onlineCount = () => online.size;

module.exports = { init, emitToUser, isOnline, onlineCount };
