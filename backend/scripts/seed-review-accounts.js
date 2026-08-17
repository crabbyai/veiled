#!/usr/bin/env node
/* eslint-disable no-console */
// ─── Reviewer accounts ──────────────────────────────────────────────
// Two accounts, matched to each other, with a conversation already in
// it. A reviewer who signs in to an empty app rejects it — that is what
// happened the first time — and calling cannot be reviewed at all
// without two accounts that can reach each other.
//
//   node backend/scripts/seed-review-accounts.js
//   node backend/scripts/seed-review-accounts.js --reset
//
// Prints the credentials once, to paste into the review notes. They are
// ordinary accounts with nothing special about them, so what a reviewer
// sees is what a member sees.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

const RESET = process.argv.includes('--reset');
const A_EMAIL = process.env.REVIEW_EMAIL_A || 'review.aisha@veiled.app';
const B_EMAIL = process.env.REVIEW_EMAIL_B || 'review.yusuf@veiled.app';
// Generated, not chosen: a guessable password on an account that reaches
// a live service is an open door.
const password = process.env.REVIEW_PASSWORD
  || `Veiled-${crypto.randomBytes(6).toString('base64url')}!`;

function upsert({ email, name, profile }) {
  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  let id = existing ? existing.id : null;

  if (id && RESET) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);   // cascades
    id = null;
  } else if (id) {
    console.log(`  · ${email} exists — reusing it and resetting its password`);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }

  if (!id) {
    id = db.prepare(
      'INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)'
    ).run(email, hash, name, Date.now()).lastInsertRowid;
  }

  const data = { user_id: id, ...profile };
  const keys = Object.keys(data);
  db.prepare(
    `INSERT INTO dating_profiles (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})
     ON CONFLICT(user_id) DO UPDATE SET ${keys.filter((k) => k !== 'user_id').map((k) => `${k}=excluded.${k}`).join(', ')}`
  ).run(...keys.map((k) => data[k]));
  return id;
}

const a = upsert({
  email: A_EMAIL,
  name: 'Aisha',
  profile: {
    name: 'Aisha', age: 27, gender: 'Woman', city: 'London', distance: 3,
    job: 'Teacher', veil: 'Niqab', sect: 'Sunni', prayer_level: 'Always prays',
    intention: 'Marriage within a year',
    bio: 'Review account. Teacher, reader, trying to be consistent with Fajr.',
    // Women set one aside; it stays withheld until she reveals it to a
    // specific match, which is the feature worth showing a reviewer.
    unveiled_photo: '/uploads/review-placeholder.jpg',
    photo_veiled: 1,
    online: 1,
  },
});

const b = upsert({
  email: B_EMAIL,
  name: 'Yusuf',
  profile: {
    name: 'Yusuf', age: 29, gender: 'Man', city: 'London', distance: 4,
    job: 'Engineer', sect: 'Sunni', prayer_level: 'Always prays',
    intention: 'Marriage within a year',
    bio: 'Review account. Engineer, football on Sundays, looking to settle.',
    online: 1,
  },
});

// Match them both ways, so neither has to swipe to reach the other.
const like = db.prepare(
  "INSERT OR IGNORE INTO dating_swipes (user_id, target_id, action, created_at) VALUES (?, ?, 'like', ?)"
);
like.run(a, b, Date.now());
like.run(b, a, Date.now());

const [ua, ub] = [Math.min(a, b), Math.max(a, b)];
let match = db.prepare('SELECT id FROM dating_matches WHERE user_a = ? AND user_b = ?').get(ua, ub);
if (!match) {
  match = { id: db.prepare('INSERT INTO dating_matches (user_a, user_b, created_at) VALUES (?, ?, ?)')
    .run(ua, ub, Date.now()).lastInsertRowid };
}
const matchId = match.id;

// A couple of messages, so the conversation is not a blank screen.
if (!db.prepare('SELECT COUNT(*) n FROM dating_messages WHERE match_id = ?').get(matchId).n) {
  const put = db.prepare(
    "INSERT INTO dating_messages (match_id, sender_id, body, kind, created_at) VALUES (?, ?, ?, 'text', ?)"
  );
  put.run(matchId, a, 'Salaam — your matchmaker introduced us.', Date.now() - 600000);
  put.run(matchId, b, 'Wa alaykum salaam. How has your week been?', Date.now() - 540000);
}

console.log('\n─── Paste into App Store Connect → App Review Information ───\n');
console.log(`  Account A: ${A_EMAIL} / ${password}`);
console.log(`  Account B: ${B_EMAIL} / ${password}`);
console.log('\n  Matched, with a conversation already in it. Sign in as A on one');
console.log('  device and B on another to review calling — a call cannot be');
console.log('  demonstrated on a single device.\n');
console.log('  The password is shown once and stored only as a hash.\n');
