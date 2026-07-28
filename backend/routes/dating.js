const express = require('express');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { emitToUser, isOnline, onlineCount } = require('../realtime');
const { saveToken, sendPush } = require('../push');

const router = express.Router();

// ── Photo uploads ─────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname) || '.jpg'}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only jpg, png, webp images allowed'), ok);
  },
});

const photosFor = (userId) =>
  db.prepare('SELECT id, url, position FROM dating_photos WHERE user_id = ? ORDER BY position ASC, id ASC').all(userId);

// Coerce an incoming id (server int, or a mapped string) to an integer.
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
};

// SQL fragment: candidate `p.user_id` is hidden if a block exists in
// EITHER direction with the viewer, or the candidate has paused their
// profile (Snooze). Append `me, me` to the params for the block checks.
const NOT_BLOCKED = `
  AND COALESCE(p.paused, 0) = 0
  AND p.user_id NOT IN (SELECT blocked_id FROM dating_blocks WHERE user_id = ?)
  AND p.user_id NOT IN (SELECT user_id FROM dating_blocks WHERE blocked_id = ?)`;

// True if either user has blocked the other — gates matching & messaging.
const isBlockedPair = (a, b) =>
  !!db.prepare(
    'SELECT 1 FROM dating_blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)'
  ).get(a, b, b, a);

const FREE_LIKES_PER_WINDOW = 5;
const LIKE_WINDOW_MS = 12 * 3600000;
const FREE_INSTANT_CHATS_PER_DAY = 1;

// ── Helpers ──────────────────────────────────────────────────────────

// The Veil: a viewer only receives photo URLs once the owner has
// unveiled for their match (or never veiled them in the first place).
const hasUnveiledFor = (ownerId, viewerId) => {
  if (!viewerId || ownerId === viewerId) return true;
  const m = findMatch(ownerId, viewerId);
  if (!m) return false;
  return m.user_a === ownerId ? !!m.unveiled_a : !!m.unveiled_b;
};

const parseProfile = (row, viewerId = null) => {
  if (!row) return null;
  const veiledFromViewer = !!row.photo_veiled && !hasUnveiledFor(row.user_id, viewerId);
  return {
    id: row.user_id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    city: row.city,
    distance: row.distance,
    job: row.job,
    bio: row.bio,
    height: row.height,
    intention: row.intention,
    veil: row.veil,
    photoVeiled: !!row.photo_veiled,
    unveiledForYou: !!row.photo_veiled && !veiledFromViewer && row.user_id !== viewerId,
    paused: !!row.paused,
    sect: row.sect,
    prayerLevel: row.prayer_level,
    ethnicity: row.ethnicity,
    halalDiet: row.halal_diet,
    interests: JSON.parse(row.interests || '[]'),
    values: JSON.parse(row.values || '[]'),
    languages: JSON.parse(row.languages || '["English"]'),
    prompts: JSON.parse(row.prompts || '[]'),
    friendTakes: JSON.parse(row.friend_takes || '[]'),
    waliEnabled: !!row.wali_enabled,
    photoPrivacy: !!row.photo_privacy,
    verified: !!row.selfie_verified,
    gold: !!row.is_gold,
    online: !!row.online || isOnline(row.user_id),
    photos: veiledFromViewer ? [] : photosFor(row.user_id).map((p) => p.url),
  };
};

const getProfile = (userId, viewerId = null) =>
  parseProfile(db.prepare('SELECT * FROM dating_profiles WHERE user_id = ?').get(userId), viewerId);

// Server-side butterfly scoring — mirror of src/muzz/butterfly.js
function scoreMatch(me, person) {
  let score = 50;
  const reasons = [];

  const sharedInterests = (me.interests || []).filter((i) => (person.interests || []).includes(i));
  if (sharedInterests.length) {
    score += sharedInterests.length * 7;
    reasons.push(`You both love ${sharedInterests.slice(0, 2).join(' & ').toLowerCase()}`);
  }
  const sharedValues = (me.values || []).filter((v) => (person.values || []).includes(v));
  if (sharedValues.length) {
    score += sharedValues.length * 6;
    reasons.push(`Aligned on being ${sharedValues[0].toLowerCase()}`);
  }
  if (me.intention && person.intention === me.intention) {
    score += 12;
    reasons.push(`Both of you: ${person.intention.toLowerCase()}`);
  } else if (
    (me.intention === 'Ready for nikah' && person.intention === 'Marriage within a year') ||
    (me.intention === 'Marriage within a year' && person.intention === 'Ready for nikah')
  ) {
    score += 5;
  }
  if (me.sect && person.sect && me.sect !== 'Prefer not to say' && person.sect === me.sect) {
    score += 8;
    reasons.push(`Both ${person.sect}`);
  }
  const levels = ['Learning to pray', 'Sometimes prays', 'Usually prays', 'Always prays'];
  const a = levels.indexOf(me.prayerLevel), b = levels.indexOf(person.prayerLevel);
  if (a >= 0 && b >= 0) {
    const gap = Math.abs(a - b);
    if (gap === 0) { score += 7; reasons.push(`Matched in practice — ${person.prayerLevel.toLowerCase()}`); }
    else if (gap === 1) score += 3;
    else score -= 4;
  }
  if (me.halalDiet === 'Always halal' && person.halalDiet === 'Always halal') score += 3;
  if (person.distance <= 5) { score += 8; reasons.push(`Only ${person.distance} miles away`); }
  else if (person.distance <= 12) { score += 4; reasons.push(`Close by in ${person.city}`); }
  else score -= 3;
  if (person.verified) score += 4;
  const sharedLang = (me.languages || []).filter((l) => (person.languages || []).includes(l) && l !== 'English');
  if (sharedLang.length) { score += 5; reasons.push(`You both speak ${sharedLang[0]}`); }

  let seed = 0;
  const k = String(me.id) + ':' + String(person.id);
  for (let i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) >>> 0;
  score += (seed % 11) - 3;

  score = Math.max(2, Math.min(99, Math.round(score)));
  if (!reasons.length) reasons.push(`A fresh face the butterfly thinks you'll click with`);
  return { score, reasons };
}

const getLimits = (userId) => {
  let row = db.prepare('SELECT * FROM dating_limits WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO dating_limits (user_id) VALUES (?)').run(userId);
    row = db.prepare('SELECT * FROM dating_limits WHERE user_id = ?').get(userId);
  }
  return row;
};

const likesRemaining = (userId, isGold) => {
  if (isGold) return Infinity;
  const lim = getLimits(userId);
  if (Date.now() - lim.like_window_start > LIKE_WINDOW_MS) return FREE_LIKES_PER_WINDOW;
  return Math.max(0, FREE_LIKES_PER_WINDOW - lim.likes_in_window);
};

function findMatch(a, b) {
  return db.prepare(
    'SELECT * FROM dating_matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)'
  ).get(a, b, b, a);
}

const createMatch = (a, b, source = 'like') => {
  const existing = findMatch(a, b);
  if (existing) return existing;
  const r = db.prepare('INSERT INTO dating_matches (user_a, user_b, source) VALUES (?, ?, ?)').run(a, b, source);
  const match = db.prepare('SELECT * FROM dating_matches WHERE id = ?').get(r.lastInsertRowid);
  // Live + push notify both parties
  const pa = getProfile(a, b), pb = getProfile(b, a);
  emitToUser(a, 'match:new', { matchId: match.id, person: pb });
  emitToUser(b, 'match:new', { matchId: match.id, person: pa });
  if (pa && pb) {
    sendPush(a, "It's a match! 💜", `You and ${pb.name} liked each other — say salaam`, { matchId: match.id });
    sendPush(b, "It's a match! 💜", `You and ${pa.name} liked each other — say salaam`, { matchId: match.id });
  }
  return match;
};

// ── Profile ──────────────────────────────────────────────────────────

// GET /api/dating/profile — my dating profile
router.get('/profile', authenticate, (req, res) => {
  try {
    const profile = getProfile(req.userId);
    if (!profile) return res.status(404).json({ error: 'No dating profile yet' });
    res.json({ profile, likesRemaining: likesRemaining(req.userId, profile.gold) === Infinity ? -1 : likesRemaining(req.userId, profile.gold) });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/dating/profile — create or update my dating profile
router.put('/profile', authenticate, (req, res) => {
  try {
    const p = req.body || {};
    if (!p.name || !p.age || !p.gender) {
      return res.status(400).json({ error: 'name, age and gender are required' });
    }
    // Veiled is a community of hijabi & niqabi sisters: a woman's profile
    // must carry a veil style.
    if (p.gender === 'Woman' && !['Hijab', 'Niqab'].includes(p.veil)) {
      return res.status(400).json({ error: 'Sisters on Veiled wear hijab or niqab — veil must be "Hijab" or "Niqab"' });
    }
    db.prepare(`
      INSERT INTO dating_profiles
        (user_id, name, age, gender, city, distance, job, bio, height, intention,
         veil, photo_veiled,
         sect, prayer_level, ethnicity, halal_diet, interests, "values", languages,
         prompts, friend_takes, wali_enabled, photo_privacy, selfie_verified, is_gold, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name=excluded.name, age=excluded.age, gender=excluded.gender,
        city=excluded.city, distance=excluded.distance, job=excluded.job,
        bio=excluded.bio, height=excluded.height, intention=excluded.intention,
        veil=excluded.veil, photo_veiled=excluded.photo_veiled,
        sect=excluded.sect, prayer_level=excluded.prayer_level,
        ethnicity=excluded.ethnicity, halal_diet=excluded.halal_diet,
        interests=excluded.interests, "values"=excluded."values",
        languages=excluded.languages, prompts=excluded.prompts,
        friend_takes=excluded.friend_takes,
        wali_enabled=excluded.wali_enabled, photo_privacy=excluded.photo_privacy,
        selfie_verified=excluded.selfie_verified, is_gold=excluded.is_gold,
        updated_at=excluded.updated_at
    `).run(
      req.userId, p.name, p.age, p.gender, p.city || '', p.distance || 0,
      p.job || '', p.bio || '', p.height || '', p.intention || 'Ready for nikah',
      p.veil || null, p.photoVeiled ? 1 : 0,
      p.sect || 'Prefer not to say', p.prayerLevel || 'Prefer not to say',
      p.ethnicity || 'Other', p.halalDiet || 'Mostly halal',
      JSON.stringify(p.interests || []), JSON.stringify(p.values || []),
      JSON.stringify(p.languages || ['English']), JSON.stringify(p.prompts || []),
      JSON.stringify(p.friendTakes || []),
      p.waliEnabled ? 1 : 0, p.photoPrivacy ? 1 : 0,
      p.selfieVerified ? 1 : 0, p.gold ? 1 : 0, Date.now()
    );
    res.json({ profile: getProfile(req.userId) });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/profile/pause { paused } — Snooze: hide me from
// discovery while keeping my matches and chats. Toggles the flag.
router.post('/profile/pause', authenticate, (req, res) => {
  try {
    const paused = req.body && (req.body.paused === true || req.body.paused === 1) ? 1 : 0;
    const r = db.prepare('UPDATE dating_profiles SET paused = ?, updated_at = ? WHERE user_id = ?')
      .run(paused, Date.now(), req.userId);
    if (!r.changes) return res.status(400).json({ error: 'Create your profile first' });
    res.json({ ok: true, paused: !!paused });
  } catch (err) {
    console.error('Pause error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/profile/share — mint (or reuse) a read-only share
// link to my profile. Photos stay veiled; nice for sharing with a wali.
router.post('/profile/share', authenticate, (req, res) => {
  try {
    const prof = db.prepare('SELECT user_id FROM dating_profiles WHERE user_id = ?').get(req.userId);
    if (!prof) return res.status(400).json({ error: 'Create your profile first' });
    let row = db.prepare('SELECT token FROM dating_profile_shares WHERE user_id = ?').get(req.userId);
    if (!row) {
      const token = uuidv4().replace(/-/g, '');
      db.prepare('INSERT INTO dating_profile_shares (token, user_id) VALUES (?, ?)').run(token, req.userId);
      row = { token };
    }
    res.status(201).json({ ok: true, token: row.token, path: `/p/${row.token}` });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/p/:token — public read-only profile card (no photos).
router.get('/p/:token', (req, res) => {
  try {
    const share = db.prepare('SELECT user_id FROM dating_profile_shares WHERE token = ?').get(req.params.token);
    if (!share) return res.status(404).json({ error: 'Profile not found' });
    const row = db.prepare('SELECT * FROM dating_profiles WHERE user_id = ?').get(share.user_id);
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    const p = parseProfile(row, null);
    // Veil-respecting: never expose photos through a share link.
    res.json({
      name: p.name, age: p.age, city: p.city, job: p.job, veil: p.veil,
      bio: p.bio, intention: p.intention, height: p.height,
      sect: p.sect, prayerLevel: p.prayerLevel, ethnicity: p.ethnicity,
      interests: p.interests, values: p.values, languages: p.languages,
      prompts: p.prompts, verified: p.verified,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Discovery & butterfly ────────────────────────────────────────────

// GET /api/dating/discover — candidates ranked by butterfly compatibility.
// Optional query filters: ?veil=Hijab|Niqab
router.get('/discover', authenticate, (req, res) => {
  try {
    const me = getProfile(req.userId);
    if (!me) return res.status(400).json({ error: 'Create your profile first' });

    // ── Smart Filters (server-authoritative) + Passport ──────────────
    // Every filter is applied in SQL so the deck is correct even before
    // the client re-filters. `city` is Passport: discover in any city,
    // which relaxes the distance filter (you're looking further afield).
    const q = req.query;
    const isAny = (v) => !v || v === 'Any';
    const clauses = [];
    const params = [req.userId, me.gender, req.userId, req.userId, req.userId];

    const ageMin = toInt(q.ageMin), ageMax = toInt(q.ageMax);
    if (ageMin) { clauses.push('AND p.age >= ?'); params.push(ageMin); }
    if (ageMax) { clauses.push('AND p.age <= ?'); params.push(ageMax); }
    if (!isAny(q.veil)) { clauses.push('AND p.veil = ?'); params.push(q.veil); }
    if (!isAny(q.sect)) { clauses.push('AND p.sect = ?'); params.push(q.sect); }
    if (!isAny(q.prayerLevel)) { clauses.push('AND p.prayer_level = ?'); params.push(q.prayerLevel); }
    if (!isAny(q.ethnicity)) { clauses.push('AND p.ethnicity = ?'); params.push(q.ethnicity); }
    if (q.verifiedOnly === 'true' || q.verifiedOnly === '1') { clauses.push('AND p.selfie_verified = 1'); }

    const passportCity = (q.city && String(q.city).trim()) || null;
    if (passportCity) {
      clauses.push('AND p.city = ? COLLATE NOCASE');
      params.push(passportCity);
    } else {
      const maxDistance = toInt(q.maxDistance);
      if (maxDistance) { clauses.push('AND p.distance <= ?'); params.push(maxDistance); }
    }

    const rows = db.prepare(`
      SELECT p.* FROM dating_profiles p
      WHERE p.user_id != ?
        AND p.gender != ?
        AND p.user_id NOT IN (SELECT target_id FROM dating_swipes WHERE user_id = ?)
        ${NOT_BLOCKED}
        ${clauses.join('\n        ')}
    `).all(...params);

    const ranked = rows
      .map((r) => parseProfile(r, req.userId))
      .map((person) => ({ person, ...scoreMatch(me, person) }))
      .sort((x, y) => y.score - x.score);
    const lim = getLimits(req.userId);
    res.json({
      candidates: ranked,
      passport: passportCity,
      appliedFilters: {
        ageMin: ageMin || null, ageMax: ageMax || null,
        maxDistance: passportCity ? null : (toInt(q.maxDistance) || null),
        veil: isAny(q.veil) ? null : q.veil,
        sect: isAny(q.sect) ? null : q.sect,
        prayerLevel: isAny(q.prayerLevel) ? null : q.prayerLevel,
        ethnicity: isAny(q.ethnicity) ? null : q.ethnicity,
        verifiedOnly: q.verifiedOnly === 'true' || q.verifiedOnly === '1',
        city: passportCity,
      },
      likesRemaining: me.gold ? -1 : likesRemaining(req.userId, false),
      boostActive: lim.boost_until > Date.now(),
      boostUntil: lim.boost_until,
      superLikes: me.gold ? -1 : lim.super_likes,
    });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/top-picks — a curated set of your highest-compatibility
// candidates, refreshed daily. Gold sees the full set unblurred; free
// members see a couple and a locked count (the Gold teaser).
router.get('/top-picks', authenticate, (req, res) => {
  try {
    const me = getProfile(req.userId);
    if (!me) return res.status(400).json({ error: 'Create your profile first' });
    const rows = db.prepare(`
      SELECT p.* FROM dating_profiles p
      WHERE p.user_id != ? AND p.gender != ?
        AND p.user_id NOT IN (SELECT target_id FROM dating_swipes WHERE user_id = ?)
        ${NOT_BLOCKED}
    `).all(req.userId, me.gender, req.userId, req.userId, req.userId);

    // Deterministic "daily" shuffle so the set is stable within a day but
    // rotates day to day, then take the strongest compatibility scores.
    const day = Math.floor(Date.now() / 86400000);
    const ranked = rows
      .map((r) => parseProfile(r, req.userId))
      .map((person) => {
        const s = scoreMatch(me, person);
        let seed = day + person.id;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return { person, ...s, _r: s.score * 100 + (seed % 100) };
      })
      .sort((x, y) => y._r - x._r)
      .slice(0, 10)
      .map(({ _r, ...rest }) => rest);

    const freeVisible = 2;
    res.json({
      picks: me.gold ? ranked : ranked.slice(0, freeVisible),
      lockedCount: me.gold ? 0 : Math.max(0, ranked.length - freeVisible),
      total: ranked.length,
      gold: !!me.gold,
      refreshesInMs: 86400000 - (Date.now() % 86400000),
    });
  } catch (err) {
    console.error('Top picks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/surge — live activity signal (Swipe Surge). Reports how
// many members are online now so the client can show a surge banner.
router.get('/surge', authenticate, (req, res) => {
  try {
    const online = onlineCount();
    // "Active now" also counts profiles seen in the last 15 minutes.
    const recent = db.prepare(
      'SELECT COUNT(*) AS n FROM dating_profiles WHERE updated_at > ? AND user_id != ?'
    ).get(Date.now() - 15 * 60000, req.userId).n;
    const activeNow = Math.max(online, recent);
    res.json({ online, activeNow, surging: activeNow >= 5 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/butterfly/pick — the butterfly's current top pick
router.get('/butterfly/pick', authenticate, (req, res) => {
  try {
    const me = getProfile(req.userId);
    if (!me) return res.status(400).json({ error: 'Create your profile first' });
    const rows = db.prepare(`
      SELECT p.* FROM dating_profiles p
      WHERE p.user_id != ? AND p.gender != ?
        AND p.user_id NOT IN (SELECT target_id FROM dating_swipes WHERE user_id = ?)
        ${NOT_BLOCKED}
    `).all(req.userId, me.gender, req.userId, req.userId, req.userId);
    const ranked = rows.map((r) => parseProfile(r, req.userId)).map((person) => ({ person, ...scoreMatch(me, person) }))
      .sort((x, y) => y.score - x.score);
    if (!ranked.length) return res.json({ pick: null });
    res.json({ pick: ranked[0] });
  } catch (err) {
    console.error('Butterfly pick error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/swipe { targetId, action } → { match, matchId? }
router.post('/swipe', authenticate, (req, res) => {
  try {
    const { targetId, action } = req.body || {};
    if (!targetId || !['like', 'pass'].includes(action)) {
      return res.status(400).json({ error: 'targetId and action (like|pass) required' });
    }
    const me = getProfile(req.userId);
    if (!me) return res.status(400).json({ error: 'Create your profile first' });
    if (isBlockedPair(req.userId, toInt(targetId))) {
      return res.status(403).json({ error: 'Unavailable' });
    }

    if (action === 'like') {
      const remaining = likesRemaining(req.userId, me.gold);
      if (remaining <= 0) return res.status(429).json({ error: 'Like limit reached', upgradeRequired: true });
      if (!me.gold) {
        const lim = getLimits(req.userId);
        const expired = Date.now() - lim.like_window_start > LIKE_WINDOW_MS;
        db.prepare(
          'UPDATE dating_limits SET like_window_start = ?, likes_in_window = ? WHERE user_id = ?'
        ).run(expired ? Date.now() : lim.like_window_start, expired ? 1 : lim.likes_in_window + 1, req.userId);
      }
    }

    db.prepare(`
      INSERT INTO dating_swipes (user_id, target_id, action) VALUES (?, ?, ?)
      ON CONFLICT(user_id, target_id) DO UPDATE SET action = excluded.action, created_at = excluded.created_at
    `).run(req.userId, targetId, action);

    let match = null;
    if (action === 'like') {
      const theirLike = db.prepare(
        "SELECT 1 FROM dating_swipes WHERE user_id = ? AND target_id = ? AND action = 'like'"
      ).get(targetId, req.userId);
      const targetIsBot = db.prepare('SELECT is_bot FROM dating_profiles WHERE user_id = ?').get(targetId);
      // Bots always like back so the demo flow works end-to-end
      if (theirLike || (targetIsBot && targetIsBot.is_bot)) {
        match = createMatch(req.userId, targetId, 'like');
      }
    }
    res.json({ match: !!match, matchId: match ? match.id : null });
  } catch (err) {
    console.error('Swipe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/rewind — undo my most recent swipe (Rewind). The card
// returns to the deck; a match that formed from it is undone only if no
// messages were exchanged yet. Optionally pass { targetId } to rewind a
// specific person instead of the most recent swipe.
router.post('/rewind', authenticate, (req, res) => {
  try {
    const { targetId } = req.body || {};
    const last = targetId
      ? db.prepare('SELECT * FROM dating_swipes WHERE user_id = ? AND target_id = ?').get(req.userId, toInt(targetId))
      : db.prepare('SELECT * FROM dating_swipes WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.userId);
    if (!last) return res.json({ ok: false, error: 'Nothing to rewind' });

    db.prepare('DELETE FROM dating_swipes WHERE id = ?').run(last.id);

    // Undo a freshly-formed match (no conversation started yet).
    const m = findMatch(req.userId, last.target_id);
    if (m) {
      const hasMsg = db.prepare('SELECT 1 FROM dating_messages WHERE match_id = ? LIMIT 1').get(m.id);
      if (!hasMsg) {
        db.prepare('DELETE FROM dating_matches WHERE id = ?').run(m.id);
        emitToUser(last.target_id, 'rewind', { userId: req.userId });
      }
    }
    // Refund one like credit if the rewound swipe was a like this window.
    if (last.action === 'like') {
      const lim = getLimits(req.userId);
      if (Date.now() - lim.like_window_start <= LIKE_WINDOW_MS && lim.likes_in_window > 0) {
        db.prepare('UPDATE dating_limits SET likes_in_window = likes_in_window - 1 WHERE user_id = ?').run(req.userId);
      }
    }
    res.json({ ok: true, targetId: last.target_id, action: last.action });
  } catch (err) {
    console.error('Rewind error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/instant-chat { targetId } → opens a chat without matching
router.post('/instant-chat', authenticate, (req, res) => {
  try {
    const { targetId } = req.body || {};
    if (!targetId) return res.status(400).json({ error: 'targetId required' });
    const me = getProfile(req.userId);
    if (!me) return res.status(400).json({ error: 'Create your profile first' });
    if (isBlockedPair(req.userId, toInt(targetId))) {
      return res.status(403).json({ error: 'Unavailable' });
    }

    const today = new Date().toDateString();
    const lim = getLimits(req.userId);
    const used = lim.instant_chat_day === today ? lim.instant_chats_used : 0;
    if (!me.gold && used >= FREE_INSTANT_CHATS_PER_DAY) {
      return res.status(429).json({ error: 'Daily Instant Chat used', upgradeRequired: true });
    }
    db.prepare(
      'UPDATE dating_limits SET instant_chat_day = ?, instant_chats_used = ? WHERE user_id = ?'
    ).run(today, used + 1, req.userId);
    const match = createMatch(req.userId, targetId, 'instant');
    res.json({ match: true, matchId: match.id });
  } catch (err) {
    console.error('Instant chat error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/likes-you — people who liked me (Gold sees them; free gets count)
router.get('/likes-you', authenticate, (req, res) => {
  try {
    const me = getProfile(req.userId);
    const rows = db.prepare(`
      SELECT p.* FROM dating_swipes s
      JOIN dating_profiles p ON p.user_id = s.user_id
      WHERE s.target_id = ? AND s.action = 'like'
        AND s.user_id NOT IN (
          SELECT CASE WHEN user_a = ? THEN user_b ELSE user_a END
          FROM dating_matches WHERE user_a = ? OR user_b = ?
        )
        ${NOT_BLOCKED}
    `).all(req.userId, req.userId, req.userId, req.userId, req.userId, req.userId);
    const people = rows.map((r) => parseProfile(r, req.userId));
    res.json({
      count: people.length,
      people: me && me.gold ? people : people.map((p) => ({ id: p.id, name: p.name, veil: p.veil, verified: p.verified })),
    });
  } catch (err) {
    console.error('Likes-you error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Matches & chat ───────────────────────────────────────────────────

// GET /api/dating/matches
router.get('/matches', authenticate, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM dating_matches WHERE user_a = ? OR user_b = ? ORDER BY created_at DESC'
    ).all(req.userId, req.userId);
    const matches = rows.map((m) => {
      const otherId = m.user_a === req.userId ? m.user_b : m.user_a;
      const last = db.prepare(
        'SELECT * FROM dating_messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(m.id);
      const unread = db.prepare(
        'SELECT COUNT(*) AS n FROM dating_messages WHERE match_id = ? AND sender_id != ? AND read_at IS NULL'
      ).get(m.id, req.userId).n;
      return {
        matchId: m.id,
        createdAt: m.created_at,
        source: m.source,
        person: getProfile(otherId, req.userId),
        // The Veil, per match: has each side unveiled their photos?
        unveiledByThem: m.user_a === otherId ? !!m.unveiled_a : !!m.unveiled_b,
        unveiledByMe: m.user_a === req.userId ? !!m.unveiled_a : !!m.unveiled_b,
        lastMessage: last ? { body: last.body, senderId: last.sender_id, ts: last.created_at } : null,
        unread,
      };
    }).filter((m) => m.person);
    res.json({ matches });
  } catch (err) {
    console.error('Matches error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/matches/:id/unveil — unveil my photos for this match.
// The signature Veiled action: she stays veiled to everyone else, but
// chooses to lift the veil for this one person. Emits a live event.
router.post('/matches/:id/unveil', authenticate, (req, res) => {
  try {
    const m = db.prepare('SELECT * FROM dating_matches WHERE id = ?').get(req.params.id);
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) {
      return res.status(404).json({ error: 'Match not found' });
    }
    const col = m.user_a === req.userId ? 'unveiled_a' : 'unveiled_b';
    db.prepare(`UPDATE dating_matches SET ${col} = 1 WHERE id = ?`).run(m.id);
    const otherId = m.user_a === req.userId ? m.user_b : m.user_a;
    const meProfile = getProfile(req.userId, otherId);
    emitToUser(otherId, 'unveil', { matchId: m.id, person: meProfile });
    if (!isOnline(otherId) && meProfile) {
      sendPush(otherId, 'She unveiled 🤍', `${meProfile.name} unveiled her photos for you`, { matchId: m.id });
    }
    res.json({ ok: true, unveiled: true });
  } catch (err) {
    console.error('Unveil error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/matches/:id/unmatch — end a match (and delete its
// messages) without blocking. Both sides simply stop seeing the chat.
router.post('/matches/:id/unmatch', authenticate, (req, res) => {
  try {
    const m = db.prepare('SELECT * FROM dating_matches WHERE id = ?').get(req.params.id);
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) {
      return res.status(404).json({ error: 'Match not found' });
    }
    const otherId = m.user_a === req.userId ? m.user_b : m.user_a;
    // ON DELETE CASCADE removes the messages with the match.
    db.prepare('DELETE FROM dating_matches WHERE id = ?').run(m.id);
    emitToUser(otherId, 'unmatch', { matchId: m.id, by: req.userId });
    res.json({ ok: true });
  } catch (err) {
    console.error('Unmatch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/matches/:id/messages
router.get('/matches/:id/messages', authenticate, (req, res) => {
  try {
    const m = db.prepare('SELECT * FROM dating_matches WHERE id = ?').get(req.params.id);
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) {
      return res.status(404).json({ error: 'Match not found' });
    }
    db.prepare(
      'UPDATE dating_messages SET read_at = ? WHERE match_id = ? AND sender_id != ? AND read_at IS NULL'
    ).run(Date.now(), m.id, req.userId);
    // Paginate newest-first, then return ascending so the client can
    // scroll back through history. The cursor is the message id (not the
    // timestamp) so rows written in the same millisecond still page
    // cleanly: ?before=<id>&limit=<n> (max 100).
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit) || 50));
    const before = req.query.before ? toInt(req.query.before) : null;
    const rows = before
      ? db.prepare(
          'SELECT id, sender_id AS senderId, body, read_at AS readAt, created_at AS ts FROM dating_messages WHERE match_id = ? AND id < ? ORDER BY id DESC LIMIT ?'
        ).all(m.id, before, limit)
      : db.prepare(
          'SELECT id, sender_id AS senderId, body, read_at AS readAt, created_at AS ts FROM dating_messages WHERE match_id = ? ORDER BY id DESC LIMIT ?'
        ).all(m.id, limit);
    const messages = rows.reverse();
    res.json({ messages, hasMore: rows.length === limit });
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/matches/:id/messages { body }
router.post('/matches/:id/messages', authenticate, (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body required' });
    const text = body.trim().slice(0, 2000);
    const m = db.prepare('SELECT * FROM dating_matches WHERE id = ?').get(req.params.id);
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) {
      return res.status(404).json({ error: 'Match not found' });
    }
    const otherId = m.user_a === req.userId ? m.user_b : m.user_a;
    if (isBlockedPair(req.userId, otherId)) {
      return res.status(403).json({ error: 'This conversation is no longer available' });
    }
    const r = db.prepare(
      'INSERT INTO dating_messages (match_id, sender_id, body) VALUES (?, ?, ?)'
    ).run(m.id, req.userId, text);
    const message = { id: r.lastInsertRowid, senderId: req.userId, body: text, ts: Date.now() };
    // Signals: a genuine reply in a conversation earns credit (deduped
    // per match), rewarding real back-and-forth over drive-by likes.
    recordSignal(req.userId, 'reply', m.id);
    // Live-deliver to the other participant; push if they're offline
    emitToUser(otherId, 'message:new', { matchId: m.id, message });
    if (!isOnline(otherId)) {
      const sender = getProfile(req.userId, otherId);
      sendPush(otherId, sender ? sender.name : 'New message', text.slice(0, 120), { matchId: m.id });
    }
    res.status(201).json({ message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Social feed ──────────────────────────────────────────────────────

// GET /api/dating/social/posts
router.get('/social/posts', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT po.*, pr.name AS author_name, pr.veil AS author_veil, pr.selfie_verified AS author_verified,
        (SELECT COUNT(*) FROM dating_post_likes WHERE post_id = po.id) AS likes,
        (SELECT COUNT(*) FROM dating_post_comments WHERE post_id = po.id) AS comments,
        EXISTS(SELECT 1 FROM dating_post_likes WHERE post_id = po.id AND user_id = ?) AS liked
      FROM dating_posts po
      JOIN dating_profiles pr ON pr.user_id = po.user_id
      ORDER BY po.created_at DESC LIMIT 100
    `).all(req.userId);
    res.json({
      posts: rows.map((r) => ({
        id: r.id, authorId: r.user_id, authorName: r.author_name, authorVeil: r.author_veil,
        verified: !!r.author_verified, text: r.body, tag: r.tag,
        imageSeed: r.image_seed, likes: r.likes, comments: r.comments,
        liked: !!r.liked, ts: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/social/posts { body, tag, imageSeed }
router.post('/social/posts', authenticate, (req, res) => {
  try {
    const { body, tag, imageSeed } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Post body required' });
    const r = db.prepare(
      'INSERT INTO dating_posts (user_id, body, tag, image_seed) VALUES (?, ?, ?, ?)'
    ).run(req.userId, body.trim(), tag || 'Life', imageSeed || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/social/posts/:id/like — toggle
router.post('/social/posts/:id/like', authenticate, (req, res) => {
  try {
    const existing = db.prepare(
      'SELECT 1 FROM dating_post_likes WHERE post_id = ? AND user_id = ?'
    ).get(req.params.id, req.userId);
    if (existing) {
      db.prepare('DELETE FROM dating_post_likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.userId);
    } else {
      db.prepare('INSERT INTO dating_post_likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.userId);
    }
    res.json({ liked: !existing });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET/POST /api/dating/social/posts/:id/comments
router.get('/social/posts/:id/comments', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.id, c.body, c.created_at AS ts, p.name
      FROM dating_post_comments c JOIN dating_profiles p ON p.user_id = c.user_id
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json({ comments: rows });
  } catch (err) {
    console.error('Comments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/social/posts/:id/comments', authenticate, (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body required' });
    const r = db.prepare(
      'INSERT INTO dating_post_comments (post_id, user_id, body) VALUES (?, ?, ?)'
    ).run(req.params.id, req.userId, body.trim());
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Photos ───────────────────────────────────────────────────────────

// POST /api/dating/photos — multipart "image" → adds a profile photo
router.post('/photos', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required' });
    const url = `/uploads/${req.file.filename}`;
    const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM dating_photos WHERE user_id = ?').get(req.userId).p;
    const r = db.prepare('INSERT INTO dating_photos (user_id, url, position) VALUES (?, ?, ?)').run(req.userId, url, pos);
    res.status(201).json({ id: r.lastInsertRowid, url, photos: photosFor(req.userId) });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/dating/photos/:id
router.delete('/photos/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM dating_photos WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ photos: photosFor(req.userId) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Message reactions ────────────────────────────────────────────────

// POST /api/dating/messages/:id/react { emoji }  (empty emoji clears)
router.post('/messages/:id/react', authenticate, (req, res) => {
  try {
    const { emoji } = req.body || {};
    const msg = db.prepare('SELECT * FROM dating_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const m = db.prepare('SELECT * FROM dating_matches WHERE id = ?').get(msg.match_id);
    if (!m || (m.user_a !== req.userId && m.user_b !== req.userId)) {
      return res.status(403).json({ error: 'Not your conversation' });
    }
    if (!emoji) {
      db.prepare('DELETE FROM dating_reactions WHERE message_id = ? AND user_id = ?').run(req.params.id, req.userId);
    } else {
      db.prepare(`
        INSERT INTO dating_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)
        ON CONFLICT(message_id, user_id) DO UPDATE SET emoji = excluded.emoji
      `).run(req.params.id, req.userId, emoji);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Boost · Super Like ───────────────────────────────────────────────

// POST /api/dating/boost — activate a 30-minute boost
router.post('/boost', authenticate, (req, res) => {
  try {
    const until = Date.now() + 30 * 60000;
    getLimits(req.userId);
    db.prepare('UPDATE dating_limits SET boost_until = ? WHERE user_id = ?').run(until, req.userId);
    res.json({ boostUntil: until });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/super-like { targetId, note }
router.post('/super-like', authenticate, (req, res) => {
  try {
    const { targetId, note } = req.body || {};
    if (!targetId) return res.status(400).json({ error: 'targetId required' });
    const me = getProfile(req.userId);
    const lim = getLimits(req.userId);
    if (!me.gold && lim.super_likes <= 0) {
      return res.status(429).json({ error: 'Out of Super Likes', upgradeRequired: true });
    }
    if (!me.gold) {
      db.prepare('UPDATE dating_limits SET super_likes = super_likes - 1 WHERE user_id = ?').run(req.userId);
    }
    db.prepare(`
      INSERT INTO dating_swipes (user_id, target_id, action, is_super, note) VALUES (?, ?, 'like', 1, ?)
      ON CONFLICT(user_id, target_id) DO UPDATE SET action = 'like', is_super = 1, note = excluded.note
    `).run(req.userId, targetId, note || null);
    // Super likes are very likely to match in the demo (bots always match)
    const targetIsBot = db.prepare('SELECT is_bot FROM dating_profiles WHERE user_id = ?').get(targetId);
    const theirLike = db.prepare("SELECT 1 FROM dating_swipes WHERE user_id = ? AND target_id = ? AND action = 'like'").get(targetId, req.userId);
    let match = null;
    if (theirLike || (targetIsBot && targetIsBot.is_bot)) match = createMatch(req.userId, targetId, 'super');
    res.json({ match: !!match, matchId: match ? match.id : null, superLikesLeft: me.gold ? -1 : Math.max(0, lim.super_likes - 1) });
  } catch (err) {
    console.error('Super like error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Push tokens ──────────────────────────────────────────────────────

// POST /api/dating/push-token { token, platform }
router.post('/push-token', authenticate, (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    saveToken(req.userId, token, platform || 'unknown');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Safety: block & report ───────────────────────────────────────────

const REPORT_REASONS = new Set([
  'inappropriate', 'harassment', 'fake', 'spam', 'nudity', 'underage', 'scam', 'other',
]);
const REPORT_KINDS = new Set(['profile', 'message', 'post', 'photo']);

// POST /api/dating/report { targetId, kind, refId, reason, detail }
// Files a moderation report against a user or a specific piece of content.
router.post('/report', authenticate, (req, res) => {
  try {
    const { targetId, kind = 'profile', refId = null, reason = 'other', detail = null } = req.body || {};
    if (!targetId && !refId) return res.status(400).json({ error: 'targetId or refId required' });
    const k = REPORT_KINDS.has(kind) ? kind : 'profile';
    const r = REPORT_REASONS.has(reason) ? reason : 'other';
    const tId = targetId ? toInt(targetId) : null;
    const info = db.prepare(`
      INSERT INTO dating_reports (reporter_id, target_id, kind, ref_id, reason, detail)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.userId, tId, k, refId ? toInt(refId) : null, r, detail ? String(detail).slice(0, 1000) : null);
    res.status(201).json({ ok: true, reportId: info.lastInsertRowid });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Friend's Take: vouch invites ─────────────────────────────────────
// A member generates a shareable link; a friend or family member opens
// it and submits a short vouch (with an optional voice note) — no
// account needed. Vouches attach to the member's profile.

const publicTake = (row) => ({
  author: row.author, relationship: row.relationship, text: row.text,
  voiceUrl: row.voiceUrl || null, createdAt: row.createdAt,
});

// POST /api/dating/friend-takes/invite { relationship? } — generate a link
router.post('/friend-takes/invite', authenticate, (req, res) => {
  try {
    const { relationship = null } = req.body || {};
    const token = uuidv4().replace(/-/g, '');
    const expires = Date.now() + 30 * 24 * 3600000; // 30 days
    db.prepare(`
      INSERT INTO dating_friend_take_invites (token, user_id, relationship, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, req.userId, relationship, expires);
    res.status(201).json({ ok: true, token, path: `/vouch/${token}`, expiresAt: expires });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dating/friend-takes/invite/:token — public preview (no auth)
// Shows the friend who they're vouching for, without exposing photos.
router.get('/friend-takes/invite/:token', (req, res) => {
  try {
    const inv = db.prepare('SELECT * FROM dating_friend_take_invites WHERE token = ?').get(req.params.token);
    if (!inv) return res.status(404).json({ error: 'Invite not found' });
    if (inv.expires_at && inv.expires_at < Date.now()) return res.status(410).json({ error: 'Invite expired' });
    if (inv.used_at) return res.status(410).json({ error: 'Invite already used' });
    const p = db.prepare('SELECT name, veil, city FROM dating_profiles WHERE user_id = ?').get(inv.user_id);
    if (!p) return res.status(404).json({ error: 'Profile not found' });
    res.json({ name: p.name, veil: p.veil, city: p.city, relationship: inv.relationship });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/friend-takes/invite/:token — submit a vouch (no auth)
// { author, relationship, text, voiceUrl? }
router.post('/friend-takes/invite/:token', (req, res) => {
  try {
    const inv = db.prepare('SELECT * FROM dating_friend_take_invites WHERE token = ?').get(req.params.token);
    if (!inv) return res.status(404).json({ error: 'Invite not found' });
    if (inv.expires_at && inv.expires_at < Date.now()) return res.status(410).json({ error: 'Invite expired' });
    if (inv.used_at) return res.status(410).json({ error: 'Invite already used' });

    const { author, relationship, text, voiceUrl } = req.body || {};
    const clean = (v, n) => (v == null ? '' : String(v).trim().slice(0, n));
    const take = {
      author: clean(author, 60) || 'A friend',
      relationship: clean(relationship || inv.relationship, 40) || 'Friend',
      text: clean(text, 500),
      voiceUrl: voiceUrl ? clean(voiceUrl, 500) : null,
      createdAt: Date.now(),
    };
    if (!take.text && !take.voiceUrl) return res.status(400).json({ error: 'A note or voice vouch is required' });

    const row = db.prepare('SELECT friend_takes FROM dating_profiles WHERE user_id = ?').get(inv.user_id);
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    const takes = JSON.parse(row.friend_takes || '[]');
    takes.push(take);
    db.prepare('UPDATE dating_profiles SET friend_takes = ?, updated_at = ? WHERE user_id = ?')
      .run(JSON.stringify(takes), Date.now(), inv.user_id);
    db.prepare('UPDATE dating_friend_take_invites SET used_at = ? WHERE token = ?').run(Date.now(), inv.token);

    emitToUser(inv.user_id, 'friendtake:new', { take: publicTake(take) });
    sendPush(inv.user_id, 'A new vouch 💬', `${take.author} shared a Friend's Take on your profile`, {});
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Vouch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Signals: reward genuine engagement ───────────────────────────────
// Reading a full profile earns 1 signal; replying in a match earns 2.
// The score drives a badge tier the app shows on your profile.

const SIGNAL_POINTS = { read: 1, reply: 2 };
const signalBadge = (score) =>
  score >= 60 ? 'Radiant' : score >= 30 ? 'Attentive' : score >= 10 ? 'Present' : 'New';

const signalsSummary = (userId) => {
  const rows = db.prepare(
    "SELECT kind, SUM(points) AS pts, COUNT(*) AS n FROM dating_signals WHERE user_id = ? GROUP BY kind"
  ).all(userId);
  let score = 0, reads = 0, replies = 0;
  for (const r of rows) {
    score += r.pts;
    if (r.kind === 'read') reads = r.n;
    else if (r.kind === 'reply') replies = r.n;
  }
  return { score, reads, replies, badge: signalBadge(score) };
};

const recordSignal = (userId, kind, refId) => {
  const points = SIGNAL_POINTS[kind] || 1;
  return db.prepare(`
    INSERT INTO dating_signals (user_id, kind, ref_id, points) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, kind, ref_id) DO NOTHING
  `).run(userId, kind, toInt(refId), points).changes > 0;
};

// GET /api/dating/signals — my signals score + badge
router.get('/signals', authenticate, (req, res) => {
  try {
    res.json(signalsSummary(req.userId));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/signals/read { profileId } — credit a genuine read
router.post('/signals/read', authenticate, (req, res) => {
  try {
    const { profileId } = req.body || {};
    if (!profileId) return res.status(400).json({ error: 'profileId required' });
    const pid = toInt(profileId);
    if (pid === req.userId) return res.json(signalsSummary(req.userId));
    const awarded = recordSignal(req.userId, 'read', pid);
    res.json({ ...signalsSummary(req.userId), awarded });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/signals/reply { matchId } — credit a real reply
router.post('/signals/reply', authenticate, (req, res) => {
  try {
    const { matchId } = req.body || {};
    if (!matchId) return res.status(400).json({ error: 'matchId required' });
    const awarded = recordSignal(req.userId, 'reply', toInt(matchId));
    res.json({ ...signalsSummary(req.userId), awarded });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dating/block { targetId, reason }
router.post('/block', authenticate, (req, res) => {
  try {
    const { targetId, reason } = req.body || {};
    if (!targetId) return res.status(400).json({ error: 'targetId required' });
    db.prepare(`
      INSERT INTO dating_blocks (user_id, blocked_id, reason) VALUES (?, ?, ?)
      ON CONFLICT(user_id, blocked_id) DO UPDATE SET reason = excluded.reason
    `).run(req.userId, targetId, reason || null);
    // Remove any match between the two
    db.prepare('DELETE FROM dating_matches WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)')
      .run(req.userId, targetId, targetId, req.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
