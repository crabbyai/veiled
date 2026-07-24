require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In production, refuse to boot with the built-in dev JWT secret — a
// predictable secret would let anyone forge auth tokens.
if (process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'veiled-dev-secret')) {
  console.error('FATAL: set a strong JWT_SECRET before running in production');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a proxy/load balancer (Fly, Render, etc.) so rate limiting and
// secure cookies read the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

// ---- Middleware ----

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// ---- Routes ----

const authRoutes = require('./routes/auth');
const datingRoutes = require('./routes/dating');
const { seedDating } = require('./seed-dating');

seedDating();

app.use('/api/auth', authRoutes);
app.use('/api/dating', datingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'veiled', timestamp: Date.now(), version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Start ----

const http = require('http');
const { init: initRealtime } = require('./realtime');

const httpServer = http.createServer(app);
initRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Veiled API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Realtime: socket.io attached`);
});

module.exports = app;
