// ─── Socket.IO real-time layer ──────────────────────────────────────
// JWT-authenticated sockets, one room per user. Routes call emitToUser
// to push live events (message:new, match:new, unveil, typing, presence).

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'veiled-dev-secret';

let io = null;
const online = new Set();

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

    socket.on('disconnect', () => {
      online.delete(socket.userId);
      io.emit('presence', { userId: socket.userId, online: false });
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
