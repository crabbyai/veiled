// Idempotent seed: creates bot users with Veiled profiles + social posts
// so the app has a populated community on a fresh database. Mirrors
// src/muzz/data.js — names must stay in sync (the client maps local seed
// ids to server ids by name).
const bcrypt = require('bcryptjs');
const db = require('./db');

const BOTS = [
  { name: 'Layla', age: 26, gender: 'Woman', veil: 'Hijab', photoVeiled: 0, city: 'London', distance: 3, job: 'UX Designer', verified: 1, online: 1, intention: 'Marriage within a year', sect: 'Sunni', prayer: 'Usually prays', ethnicity: 'Arab', halal: 'Always halal', interests: ['Modest fashion', 'Coffee', 'Art', 'Photography', 'Qur’an'], values: ['Family-oriented', 'Ambitious', 'Romantic'], bio: 'Designer by day, ceramics enthusiast by night. My hijab is my crown. Looking for someone serious about building a home rooted in deen.', height: `5'6"`, languages: ['English', 'Arabic'], prompts: [{ q: 'Our first meeting (with wali present)', a: 'A walk through a gallery then dessert somewhere cosy — baba two tables away.' }] },
  { name: 'Amara', age: 24, gender: 'Woman', veil: 'Hijab', photoVeiled: 1, city: 'London', distance: 7, job: 'Junior Doctor', verified: 1, online: 0, intention: 'Marriage, taking my time', sect: 'Sunni', prayer: 'Sometimes prays', ethnicity: 'African', halal: 'Mostly halal', interests: ['Fitness', 'Reading', 'Foodie', 'Family', 'Languages'], values: ['Career-driven', 'Honest', 'Funny'], bio: 'Probably reading three books at once between ward shifts. My photos unveil when I say bismillah on a match.', height: `5'4"`, languages: ['English', 'French'], prompts: [{ q: 'The way to win my heart is', a: 'Bring dates (the fruit) and make me laugh. That simple.' }] },
  { name: 'Sana', age: 28, gender: 'Woman', veil: 'Hijab', photoVeiled: 0, city: 'Manchester', distance: 12, job: 'Architect', verified: 0, online: 1, intention: 'Ready for nikah', sect: 'Sunni', prayer: 'Always prays', ethnicity: 'South Asian', halal: 'Always halal', interests: ['Hiking', 'Photography', 'Tea lover', 'Nature', 'Qur’an'], values: ['Spiritual', 'Ambitious', 'Loyal'], bio: 'I design buildings and chase sunsets in a waterproof hijab. Mountains over beaches, always.', height: `5'7"`, languages: ['English', 'Urdu'], prompts: [{ q: 'Together we could', a: 'Hike the Lake District then argue about the best chai.' }] },
  { name: 'Yasmin', age: 25, gender: 'Woman', veil: 'Hijab', photoVeiled: 0, city: 'London', distance: 2, job: 'Marketing Lead', verified: 1, online: 1, intention: 'Marriage, taking my time', sect: 'Other', prayer: 'Sometimes prays', ethnicity: 'Turkish', halal: 'Mostly halal', interests: ['Foodie', 'Travelling', 'Modest fashion', 'Abaya styling', 'Coffee'], values: ['Ambitious', 'Funny', 'Modest'], bio: 'Spreadsheets by day, abaya-styling reels by night.', height: `5'5"`, languages: ['English', 'Turkish'], prompts: [{ q: 'My simple pleasures', a: 'Friday khutbah notes, then a perfectly organised brunch.' }] },
  { name: 'Noor', age: 27, gender: 'Woman', veil: 'Niqab', photoVeiled: 1, city: 'Birmingham', distance: 18, job: 'Pharmacist', verified: 1, online: 0, intention: 'Ready for nikah', sect: 'Shia', prayer: 'Always prays', ethnicity: 'Persian', halal: 'Always halal', interests: ['Cooking', 'Calligraphy', 'Family', 'Qur’an', 'Poetry'], values: ['Practising', 'Family-oriented', 'Modest'], bio: 'Niqabi, alhamdulillah — you’ll know my heart before my face. I find peace in calligraphy and fresh bread.', height: `5'3"`, languages: ['English', 'Arabic', 'Farsi'], prompts: [{ q: 'What deen means to me', a: 'My niqab is between me and Allah; my character is what I show the world.' }] },
  { name: 'Hana', age: 23, gender: 'Woman', veil: 'Hijab', photoVeiled: 1, city: 'London', distance: 5, job: 'Software Engineer', verified: 0, online: 1, intention: 'Getting to know', sect: 'Sunni', prayer: 'Usually prays', ethnicity: 'Mixed', halal: 'Mostly halal', interests: ['Gaming', 'Tech', 'Startups', 'Movies', 'Coffee'], values: ['Ambitious', 'Funny', 'Honest'], bio: 'I build apps and break them. 50% caffeine, 100% hijabi.', height: `5'6"`, languages: ['English'], prompts: [{ q: 'I geek out on', a: 'Clean code, mechanical keyboards, and indie games.' }] },
  { name: 'Mariam', age: 29, gender: 'Woman', veil: 'Niqab', photoVeiled: 1, city: 'Leeds', distance: 22, job: 'Teacher', verified: 1, online: 0, intention: 'Ready for nikah', sect: 'Sunni', prayer: 'Always prays', ethnicity: 'Arab', halal: 'Always halal', interests: ['Reading', 'Charity work', 'Family', 'Tea lover', 'Qur’an'], values: ['Family-oriented', 'Spiritual', 'Loyal'], bio: 'Year 4 teacher with infinite patience (mostly). Niqabi for six years and never looked back.', height: `5'5"`, languages: ['English', 'Arabic'], prompts: [{ q: 'A du’a I never leave', a: 'For my students, every morning before the bell.' }] },
  { name: 'Zara', age: 26, gender: 'Woman', veil: 'Hijab', photoVeiled: 0, city: 'London', distance: 4, job: 'Physiotherapist', verified: 1, online: 1, intention: 'Marriage, taking my time', sect: 'Sunni', prayer: 'Sometimes prays', ethnicity: 'Mixed', halal: 'Mostly halal', interests: ['Fitness', 'Yoga', 'Foodie', 'Travelling', 'Archery'], values: ['Ambitious', 'Honest', 'Funny'], bio: 'I fix people for a living and lift weights in a sports hijab for fun. Sunnah sports enthusiast.', height: `5'8"`, languages: ['English', 'Spanish'], prompts: [{ q: 'Green flags I look for', a: 'Goes to the gym AND to fajr. Balance.' }] },
  { name: 'Eman', age: 25, gender: 'Woman', veil: 'Hijab', photoVeiled: 1, city: 'London', distance: 9, job: 'Journalist', verified: 0, online: 0, intention: 'Marriage, taking my time', sect: 'Prefer not to say', prayer: 'Sometimes prays', ethnicity: 'Arab', halal: 'Sometimes', interests: ['Reading', 'Poetry', 'Travelling', 'Art', 'Languages'], values: ['Romantic', 'Honest', 'Patient'], bio: 'I chase stories and good coffee. My hijab has its own passport stamps.', height: `5'5"`, languages: ['English', 'Italian'], prompts: [{ q: 'Together we could', a: 'Road-trip the coast with a nasheed-heavy playlist.' }] },
  { name: 'Aaliyah', age: 27, gender: 'Woman', veil: 'Niqab', photoVeiled: 1, city: 'Bristol', distance: 26, job: 'Dentist', verified: 1, online: 1, intention: 'Ready for nikah', sect: 'Sunni', prayer: 'Always prays', ethnicity: 'South Asian', halal: 'Always halal', interests: ['Cooking', 'Family', 'Fitness', 'Qur’an', 'Baking'], values: ['Family-oriented', 'Practising', 'Funny'], bio: 'Yes I will look at your teeth. Niqabi dentist — the irony is not lost on me. Weekend baker seeking my partner in deen and dinner.', height: `5'4"`, languages: ['English', 'Gujarati'], prompts: [{ q: 'The way to win my heart is', a: 'Eat my cooking, mean the compliment, and floss.' }] },
];

const POSTS = [
  { who: 'Sana', body: 'Caught the most insane sunrise on the Helvellyn ridge this morning. Fajr with a view — 4am alarm absolutely worth it ☀️🏔️', tag: 'Adventure', imageSeed: 'sunrise' },
  { who: 'Noor', body: 'Spent the afternoon on a new calligraphy piece — Surah An-Nur. There is something so grounding about ink and patience. ✍️', tag: 'Art', imageSeed: 'calligraphy' },
  { who: 'Zara', body: 'PSA: sports hijabs that actually stay put during burpees exist and I have found them. Ask me anything. 🎯', tag: 'Life', imageSeed: null },
  { who: 'Yasmin', body: 'Halal brunch reviewed: the shakshuka was elite, the queue was not. 7/10 would still queue again. 🍳', tag: 'Foodie', imageSeed: 'brunch' },
  { who: 'Mariam', body: 'My Year 4s wrote letters to their future selves today and I am NOT crying under this niqab, you are. The hope in these kids 🥹', tag: 'Life', imageSeed: null },
];

function seedDating() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM dating_profiles WHERE is_bot = 1').get().n;
  if (count >= BOTS.length) return;

  const hash = bcrypt.hashSync('demo-bot-password-' + Date.now(), 10);
  const ids = {};
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (email, password_hash, display_name) VALUES (?, ?, ?)');
  const getUser = db.prepare('SELECT id FROM users WHERE email = ?');
  const TAKES = {
    Layla: [
      { by: 'Amina', rel: 'Best friend', kind: 'text', text: 'Layla remembers everything you tell her. Whoever marries her is winning.' },
      { by: 'Umm Layla', rel: 'Mother', kind: 'voice', secs: 14 },
    ],
    Sana: [{ by: 'Hafsa', rel: 'Hiking buddy', kind: 'text', text: 'She will genuinely wake you for fajr on a mountain and make it feel like a gift.' }],
    Noor: [
      { by: 'Fatima', rel: 'Sister', kind: 'text', text: 'Noor’s calligraphy is beautiful, but her character is more so.' },
      { by: 'Br. Hamza', rel: 'Brother & wali', kind: 'voice', secs: 11 },
    ],
    Aaliyah: [{ by: 'Khadija', rel: 'Cousin', kind: 'voice', secs: 9 }],
  };

  const insertProfile = db.prepare(`
    INSERT OR REPLACE INTO dating_profiles
      (user_id, name, age, gender, veil, photo_veiled, city, distance, job, bio, height, intention,
       sect, prayer_level, ethnicity, halal_diet, interests, "values", languages,
       prompts, friend_takes, selfie_verified, is_bot, online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (const b of BOTS) {
    const email = `bot.${b.name.toLowerCase()}@veiled.demo`;
    insertUser.run(email, hash, b.name);
    const id = getUser.get(email).id;
    ids[b.name] = id;
    insertProfile.run(
      id, b.name, b.age, b.gender, b.veil, b.photoVeiled, b.city, b.distance, b.job, b.bio, b.height,
      b.intention, b.sect, b.prayer, b.ethnicity, b.halal,
      JSON.stringify(b.interests), JSON.stringify(b.values),
      JSON.stringify(b.languages), JSON.stringify(b.prompts),
      JSON.stringify(TAKES[b.name] || []), b.verified, b.online
    );
  }

  const postCount = db.prepare('SELECT COUNT(*) AS n FROM dating_posts').get().n;
  if (postCount === 0) {
    const insertPost = db.prepare('INSERT INTO dating_posts (user_id, body, tag, image_seed, created_at) VALUES (?, ?, ?, ?, ?)');
    let t = Date.now() - 3600000;
    for (const p of POSTS) {
      insertPost.run(ids[p.who], p.body, p.tag, p.imageSeed, t);
      t -= 4 * 3600000;
    }
  }
  console.log(`Seeded ${BOTS.length} Veiled profiles and ${POSTS.length} posts`);
}

module.exports = { seedDating };
