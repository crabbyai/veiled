const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');
const sms = require('../services/sms');

const router = express.Router();

// ── Phone verification (OTP) ─────────────────────────────────────────
// POST /api/auth/phone/start { phone } — send a one-time code.
router.post('/phone/start', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const out = await sms.sendCode(phone);
    res.json({ ok: !!out.ok, dev: !!out.dev });
  } catch (err) {
    console.error('OTP start error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/phone/verify { phone, code } — check code; marks the
// signed-in user's profile phone_verified when valid.
router.post('/phone/verify', authenticate, async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });
    const out = await sms.checkCode(phone, code);
    if (!out.ok) return res.status(401).json({ error: 'Invalid code' });
    db.prepare('UPDATE dating_profiles SET phone_verified = 1 WHERE user_id = ?').run(req.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
    ).run(email.toLowerCase(), hash, displayName || null);

    const token = generateToken(result.lastInsertRowid);

    res.status(201).json({
      token,
      user: {
        id: result.lastInsertRowid,
        email: email.toLowerCase(),
        displayName: displayName || null,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
    },
  });
});

// DELETE /api/auth/account
router.delete('/account', authenticate, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  res.json({ success: true });
});

module.exports = router;
