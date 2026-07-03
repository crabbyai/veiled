const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'veiled.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---- Schema ----

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  -- ── Veiled marriage app ────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS dating_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    city TEXT DEFAULT '',
    distance REAL DEFAULT 0,
    job TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    height TEXT DEFAULT '',
    intention TEXT DEFAULT 'Ready for nikah',
    veil TEXT,
    photo_veiled INTEGER DEFAULT 0,
    sect TEXT DEFAULT 'Prefer not to say',
    prayer_level TEXT DEFAULT 'Prefer not to say',
    ethnicity TEXT DEFAULT 'Other',
    halal_diet TEXT DEFAULT 'Mostly halal',
    interests TEXT DEFAULT '[]',
    "values" TEXT DEFAULT '[]',
    languages TEXT DEFAULT '["English"]',
    prompts TEXT DEFAULT '[]',
    wali_enabled INTEGER DEFAULT 0,
    photo_privacy INTEGER DEFAULT 0,
    selfie_verified INTEGER DEFAULT 0,
    is_gold INTEGER DEFAULT 0,
    is_bot INTEGER DEFAULT 0,
    online INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS dating_swipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('like','pass')),
    is_super INTEGER DEFAULT 0,
    note TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(user_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS dating_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'like',
    -- The Veil: whether each side has unveiled their photos for this match
    unveiled_a INTEGER DEFAULT 0,
    unveiled_b INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(user_a, user_b)
  );

  CREATE TABLE IF NOT EXISTS dating_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES dating_matches(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    kind TEXT DEFAULT 'text',
    read_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS dating_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    tag TEXT DEFAULT 'Life',
    image_seed TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS dating_post_likes (
    post_id INTEGER NOT NULL REFERENCES dating_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS dating_post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES dating_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS dating_limits (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    like_window_start INTEGER DEFAULT 0,
    likes_in_window INTEGER DEFAULT 0,
    instant_chat_day TEXT DEFAULT '',
    instant_chats_used INTEGER DEFAULT 0,
    boost_until INTEGER DEFAULT 0,
    super_likes INTEGER DEFAULT 3,
    roses INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS dating_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS dating_reactions (
    message_id INTEGER NOT NULL REFERENCES dating_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS dating_blocks (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, blocked_id)
  );

  CREATE INDEX IF NOT EXISTS idx_dating_swipes_user ON dating_swipes(user_id);
  CREATE INDEX IF NOT EXISTS idx_dating_swipes_target ON dating_swipes(target_id, action);
  CREATE INDEX IF NOT EXISTS idx_dating_matches_a ON dating_matches(user_a);
  CREATE INDEX IF NOT EXISTS idx_dating_matches_b ON dating_matches(user_b);
  CREATE INDEX IF NOT EXISTS idx_dating_messages_match ON dating_messages(match_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_dating_posts_date ON dating_posts(created_at);
  CREATE INDEX IF NOT EXISTS idx_dating_photos_user ON dating_photos(user_id, position);
`);

// ── Lightweight migrations for columns added after initial release ────
const cols = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
const ensure = (table, col, ddl) => {
  if (!cols(table).includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
};
ensure('dating_profiles', 'veil', 'veil TEXT');
ensure('dating_profiles', 'photo_veiled', 'photo_veiled INTEGER DEFAULT 0');
ensure('dating_matches', 'unveiled_a', 'unveiled_a INTEGER DEFAULT 0');
ensure('dating_matches', 'unveiled_b', 'unveiled_b INTEGER DEFAULT 0');

module.exports = db;
