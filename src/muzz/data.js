// ─── Veiled seed data ───────────────────────────────────────────────
// The twist: every sister on Veiled wears hijab or niqab. Profiles
// carry a veil style, and photos are "veiled" (frosted) by default —
// she unveils them per match, on her terms. Photos render as
// initial-on-gradient placeholders (see Avatar / PhotoTile components).

export const VEILS = ['Hijab', 'Niqab'];

export const INTERESTS = [
  'Modest fashion', 'Qur’an', 'Coffee', 'Reading', 'Fitness', 'Cooking',
  'Foodie', 'Photography', 'Hiking', 'Art', 'Calligraphy', 'Poetry',
  'Charity work', 'Family', 'Languages', 'Travelling', 'Abaya styling',
  'Tea lover', 'Nature', 'Tech', 'Gaming', 'Startups', 'Movies',
  'Yoga', 'Astronomy', 'Painting', 'Baking', 'Gardening', 'Sisters’ halaqa',
  'Archery',
];

export const VALUES = [
  'Family-oriented', 'Practising', 'Modest', 'Ambitious',
  'Spiritual', 'Career-driven', 'Homebody', 'Romantic', 'Funny',
  'Honest', 'Loyal', 'Patient',
];

export const PROMPTS = [
  'What deen means to me',
  'The way to win my heart is',
  'Our first meeting (with wali present)',
  'I geek out on',
  'Green flags I look for',
  'My simple pleasures',
  'A du’a I never leave',
  'Together we could',
];

export const INTENTIONS = [
  'Ready for nikah', 'Marriage within a year', 'Marriage, taking my time', 'Getting to know',
];

// Religious profile fields — core to Veiled's matching
export const SECTS = ['Sunni', 'Shia', 'Other', 'Prefer not to say'];
export const PRAYER_LEVELS = ['Always prays', 'Usually prays', 'Sometimes prays', 'Learning to pray', 'Prefer not to say'];
export const HALAL_DIET = ['Always halal', 'Mostly halal', 'Sometimes', 'No'];
export const ETHNICITIES = [
  'Arab', 'South Asian', 'Turkish', 'African', 'Persian', 'South East Asian',
  'White / Caucasian', 'Mixed', 'Other',
];

// Passport: discover practising sisters/brothers in any of these cities —
// invaluable when you're open to relocating for the right marriage.
export const PASSPORT_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol',
  'Dubai', 'Istanbul', 'Cairo', 'Kuala Lumpur',
  'Toronto', 'New York', 'Sydney',
];

// ── Veil notes ───────────────────────────────────────────────────────
// A short line a sister chooses for her card. Hers to pick, reword or
// leave blank — the app never assigns one behind her back, because a
// card that speaks in her voice had better be her voice.
export const VEIL_NOTES = [
  'Unveil me إن شاء الله',
  'You could be my naseeb.',
  'I am waiting for you.',
  'Ya Allah bring us together.',
  'Am I the woman of your dreams?',
  '🌹',
  'Where will you take me for our honeymoon?',
  'You are so handsome!',
  'May Allah bless us with children.',
  'May Allah make you a good husband for me.',
  'Lol this is so much better than that other app.',
  'Half your deen is one message away.',
  'Bring your wali, I\'ll bring mine.',
  'Patience is a green flag 🤍',
  'Ask me anything — I answer honestly.',
  'My du\'a has your name in it.',
  'Say bismillah and swipe.',
  'Looking for a best friend, not a pen pal.',
  'I make excellent karak. That\'s the whole pitch.',
  'Serious only, ya akhi.',
  'Could you be the one I\'ve been praying for?',
  'I hope Allah wrote you for me.',
  'Fajr together one day, إن شاء الله',
  'You had me at salaam.',
  'Tell me something real.',
  'I am not here to waste anyone\'s time.',
  'Somewhere between shy and forward 🤍',
  'My mother already likes you.',
  'Rings before things.',
  'Nikah, then everything else.',
  'Do you snore? Asking for my future self.',
  'I promise I\'m worth the wait.',
  'A quiet home, a loud kitchen.',
  'Be the reason I say alhamdulillah tonight.',
  'Barakah over butterflies.',
];

// A suggestion to start her off with — she can shuffle or replace it.
export const randomVeilNote = () => VEIL_NOTES[Math.floor(Math.random() * VEIL_NOTES.length)];

// The line shown on a card. Hers if she wrote one; otherwise one of the
// set, picked from her id so it's different profile to profile and the
// same every time you see her — a line that changed on each render
// would read as noise.
export const veilNoteFor = (id, custom) => {
  const own = (custom || '').trim();
  if (own) return own;
  let h = 0;
  const k = String(id || '');
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return VEIL_NOTES[h % VEIL_NOTES.length];
};

// ── Written sample profiles (development only) ───────────────────────
// These people are invented. They exist to build and demo the UI
// against, and they are only ever loaded when EXPO_PUBLIC_DEMO_MODE=1
// with no backend configured (see config.js). Real members come from
// the API — never from this file.
//
// veil: 'Hijab' | 'Niqab' — every profile has one; it's the point.
// photoVeiled: photos stay frosted until she unveils for a match.
export const SAMPLE_PEOPLE = [
  {
    id: 'p1', name: 'Layla', age: 26, city: 'London', distance: 3,
    job: 'UX Designer', verified: true, online: true,
    intention: 'Marriage within a year',
    veil: 'Hijab', photoVeiled: false,
    interests: ['Modest fashion', 'Coffee', 'Art', 'Photography', 'Qur’an'],
    values: ['Family-oriented', 'Ambitious', 'Romantic'],
    bio: 'Designer by day, ceramics enthusiast by night. My hijab is my crown. Looking for someone serious about building a home rooted in deen.',
    prompts: [
      { q: 'Our first meeting (with wali present)', a: 'A walk through a gallery then dessert somewhere cosy — baba two tables away.' },
      { q: 'I geek out on', a: 'Typography, obscure coffee brewing methods, and hijab-brand drops.' },
    ],
    sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Arab', halalDiet: 'Always halal',
    height: `5'6"`, languages: ['English', 'Arabic'],
    friendTakes: [
      { by: 'Amina', rel: 'Best friend', kind: 'text', text: 'Layla remembers everything you tell her — your exam, your mum\'s surgery, all of it. Whoever marries her is winning.' },
      { by: 'Umm Layla', rel: 'Mother', kind: 'voice', secs: 14 },
    ],
  },
  {
    id: 'p2', name: 'Amara', age: 24, city: 'London', distance: 7,
    job: 'Junior Doctor', verified: true, online: false,
    intention: 'Marriage, taking my time',
    veil: 'Hijab', photoVeiled: true,
    interests: ['Fitness', 'Reading', 'Foodie', 'Family', 'Languages'],
    values: ['Career-driven', 'Honest', 'Funny'],
    bio: 'Probably reading three books at once between ward shifts. My photos unveil when I say bismillah on a match — patience is a green flag.',
    prompts: [
      { q: 'The way to win my heart is', a: 'Bring dates (the fruit) and make me laugh. That simple.' },
      { q: 'A du’a I never leave', a: 'The one for my patients before every shift.' },
    ],
    sect: 'Sunni', prayerLevel: 'Sometimes prays', ethnicity: 'African', halalDiet: 'Mostly halal',
    height: `5'4"`, languages: ['English', 'French'],
  },
  {
    id: 'p3', name: 'Sana', age: 28, city: 'Manchester', distance: 12,
    job: 'Architect', verified: false, online: true,
    intention: 'Ready for nikah',
    veil: 'Hijab', photoVeiled: false,
    interests: ['Hiking', 'Photography', 'Tea lover', 'Nature', 'Qur’an'],
    values: ['Spiritual', 'Ambitious', 'Loyal'],
    bio: 'I design buildings and chase sunsets in a waterproof hijab. Mountains over beaches, always. Seeking a partner in deen and in adventure.',
    prompts: [
      { q: 'Together we could', a: 'Hike the Lake District then argue about the best chai.' },
      { q: 'What deen means to me', a: 'Sujood with a view from the summit. Nothing compares.' },
    ],
    sect: 'Sunni', prayerLevel: 'Always prays', ethnicity: 'South Asian', halalDiet: 'Always halal',
    height: `5'7"`, languages: ['English', 'Urdu'],
    compatQuestion: 'What does an ordinary Tuesday look like in the home you want to build?',
    friendTakes: [
      { by: 'Hafsa', rel: 'Hiking buddy', kind: 'text', text: 'She will genuinely wake you for fajr on a mountain and make it feel like a gift. 10/10.' },
    ],
  },
  {
    id: 'p4', name: 'Yasmin', age: 25, city: 'London', distance: 2,
    job: 'Marketing Lead', verified: true, online: true,
    intention: 'Marriage, taking my time',
    veil: 'Hijab', photoVeiled: false,
    interests: ['Foodie', 'Travelling', 'Modest fashion', 'Abaya styling', 'Coffee'],
    values: ['Ambitious', 'Funny', 'Modest'],
    bio: 'Spreadsheets by day, abaya-styling reels by night. I will out-eat you at halal brunch and I am not sorry.',
    prompts: [
      { q: 'My simple pleasures', a: 'Friday khutbah notes, then a perfectly organised brunch.' },
      { q: 'Green flags I look for', a: 'Kindness to waiters, calls his mum, prays fajr.' },
    ],
    sect: 'Other', prayerLevel: 'Sometimes prays', ethnicity: 'Turkish', halalDiet: 'Mostly halal',
    height: `5'5"`, languages: ['English', 'Turkish'],
  },
  {
    id: 'p5', name: 'Noor', age: 27, city: 'Birmingham', distance: 18,
    job: 'Pharmacist', verified: true, online: false,
    intention: 'Ready for nikah',
    veil: 'Niqab', photoVeiled: true,
    interests: ['Cooking', 'Calligraphy', 'Family', 'Qur’an', 'Poetry'],
    values: ['Practising', 'Family-oriented', 'Modest'],
    bio: 'Niqabi, alhamdulillah — you’ll know my heart before my face. I find peace in calligraphy and fresh bread. Seeking a calm, kind soul to grow with.',
    prompts: [
      { q: 'What deen means to me', a: 'My niqab is between me and Allah; my character is what I show the world.' },
      { q: 'The way to win my heart is', a: 'Genuine conversation, respect for my wali, and a shared love of poetry.' },
    ],
    sect: 'Shia', prayerLevel: 'Always prays', ethnicity: 'Persian', halalDiet: 'Always halal',
    height: `5'3"`, languages: ['English', 'Arabic', 'Farsi'],
    friendTakes: [
      { by: 'Fatima', rel: 'Sister', kind: 'text', text: 'Noor\'s calligraphy is beautiful, but her character is more so. She is the calm in our family.' },
      { by: 'Br. Hamza', rel: 'Brother & wali', kind: 'voice', secs: 11 },
    ],
  },
  {
    id: 'p6', name: 'Hana', age: 23, city: 'London', distance: 5,
    job: 'Software Engineer', verified: false, online: true,
    intention: 'Getting to know',
    veil: 'Hijab', photoVeiled: true,
    interests: ['Gaming', 'Tech', 'Startups', 'Movies', 'Coffee'],
    values: ['Ambitious', 'Funny', 'Honest'],
    bio: 'I build apps and break them. 50% caffeine, 100% hijabi. Looking for a co-op partner for life (and Mario Kart).',
    prompts: [
      { q: 'I geek out on', a: 'Clean code, mechanical keyboards, and indie games.' },
      { q: 'Together we could', a: 'Build a halal startup or at least a really good blanket fort.' },
    ],
    sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Mixed', halalDiet: 'Mostly halal',
    height: `5'6"`, languages: ['English'],
    compatQuestion: 'How would you want us to handle a disagreement neither of us can win?',
  },
  {
    id: 'p7', name: 'Mariam', age: 29, city: 'Leeds', distance: 22,
    job: 'Teacher', verified: true, online: false,
    intention: 'Ready for nikah',
    veil: 'Niqab', photoVeiled: true,
    interests: ['Reading', 'Charity work', 'Family', 'Tea lover', 'Qur’an'],
    values: ['Family-oriented', 'Spiritual', 'Loyal'],
    bio: 'Year 4 teacher with infinite patience (mostly). Niqabi for six years and never looked back. Big believer in small kindnesses and big love.',
    prompts: [
      { q: 'A du’a I never leave', a: 'For my students, every morning before the bell.' },
      { q: 'My simple pleasures', a: 'A good book, rain on the window, and a strong cup of chai.' },
    ],
    sect: 'Sunni', prayerLevel: 'Always prays', ethnicity: 'Arab', halalDiet: 'Always halal',
    height: `5'5"`, languages: ['English', 'Arabic'],
  },
  {
    id: 'p8', name: 'Zara', age: 26, city: 'London', distance: 4,
    job: 'Physiotherapist', verified: true, online: true,
    intention: 'Marriage, taking my time',
    veil: 'Hijab', photoVeiled: false,
    interests: ['Fitness', 'Yoga', 'Foodie', 'Travelling', 'Archery'],
    values: ['Ambitious', 'Honest', 'Funny'],
    bio: 'I fix people for a living and lift weights in a sports hijab for fun. Sunnah sports enthusiast — ask me about archery.',
    prompts: [
      { q: 'Green flags I look for', a: 'Goes to the gym AND to fajr. Balance.' },
      { q: 'Our first meeting (with wali present)', a: 'Archery range with my brother, then the best burger in town.' },
    ],
    sect: 'Sunni', prayerLevel: 'Sometimes prays', ethnicity: 'Mixed', halalDiet: 'Mostly halal',
    height: `5'8"`, languages: ['English', 'Spanish'],
  },
  {
    id: 'p9', name: 'Eman', age: 25, city: 'London', distance: 9,
    job: 'Journalist', verified: false, online: false,
    intention: 'Marriage, taking my time',
    veil: 'Hijab', photoVeiled: true,
    interests: ['Reading', 'Poetry', 'Travelling', 'Art', 'Languages'],
    values: ['Romantic', 'Honest', 'Patient'],
    bio: 'I chase stories and good coffee. My hijab has its own passport stamps. Ask me about the man who collects 4,000 spoons.',
    prompts: [
      { q: 'I geek out on', a: 'Longform journalism and Oxford commas.' },
      { q: 'Together we could', a: 'Road-trip the coast with a nasheed-heavy playlist.' },
    ],
    sect: 'Prefer not to say', prayerLevel: 'Sometimes prays', ethnicity: 'Arab', halalDiet: 'Sometimes',
    height: `5'5"`, languages: ['English', 'Italian'],
    compatQuestion: 'What is something you changed your mind about, and what changed it?',
  },
  {
    id: 'p10', name: 'Aaliyah', age: 27, city: 'Bristol', distance: 26,
    job: 'Dentist', verified: true, online: true,
    intention: 'Ready for nikah',
    veil: 'Niqab', photoVeiled: true,
    interests: ['Cooking', 'Family', 'Fitness', 'Qur’an', 'Baking'],
    values: ['Family-oriented', 'Practising', 'Funny'],
    bio: 'Yes I will look at your teeth. Niqabi dentist — the irony is not lost on me. Weekend baker seeking my partner in deen and dinner.',
    prompts: [
      { q: 'The way to win my heart is', a: 'Eat my cooking, mean the compliment, and floss.' },
      { q: 'What deen means to me', a: 'Free dental camps back home every summer, for His sake.' },
    ],
    sect: 'Sunni', prayerLevel: 'Always prays', ethnicity: 'South Asian', halalDiet: 'Always halal',
    height: `5'4"`, languages: ['English', 'Gujarati'],
    friendTakes: [
      { by: 'Khadija', rel: 'Cousin', kind: 'voice', secs: 9 },
    ],
  },
];

// ── Veiled Social: sample feed posts (development only) ──────────────
// Written by the same invented people above, and loaded under the same
// condition. A shipping build starts with an empty feed.
const hr = 3600000;
export const SAMPLE_POSTS = [
  {
    id: 's1', authorId: 'p3', authorName: 'Sana', verified: false,
    text: 'Caught the most insane sunrise on the Helvellyn ridge this morning. Fajr with a view — 4am alarm absolutely worth it ☀️🏔️',
    tag: 'Adventure', likes: 142, comments: 23, liked: false, ts: Date.now() - hr * 1,
    image: ['#7A7A7E', '#3A3A3C'],
  },
  {
    id: 's2', authorId: 'p5', authorName: 'Noor', verified: true,
    text: 'Spent the afternoon on a new calligraphy piece — Surah An-Nur. There is something so grounding about ink and patience. ✍️',
    tag: 'Art', likes: 308, comments: 41, liked: true, ts: Date.now() - hr * 3,
    image: ['#5A5A5E', '#242426'],
  },
  {
    id: 's3', authorId: 'p8', authorName: 'Zara', verified: true,
    text: 'PSA: sports hijabs that actually stay put during burpees exist and I have found them. Ask me anything. 🎯',
    tag: 'Life', likes: 521, comments: 88, liked: false, ts: Date.now() - hr * 6,
    image: null,
  },
  {
    id: 's4', authorId: 'p4', authorName: 'Yasmin', verified: true,
    text: 'Halal brunch reviewed: the shakshuka was elite, the queue was not. 7/10 would still queue again. 🍳',
    tag: 'Foodie', likes: 199, comments: 34, liked: false, ts: Date.now() - hr * 10,
    image: ['#8A8A8E', '#3E3E40'],
  },
  {
    id: 's5', authorId: 'p7', authorName: 'Mariam', verified: true,
    text: 'My Year 4s wrote letters to their future selves today and I am NOT crying under this niqab, you are. The hope in these kids 🥹',
    tag: 'Life', likes: 874, comments: 119, liked: true, ts: Date.now() - hr * 20,
    image: null,
  },
];


// ── Default "me" profile ────────────────────────────────────────────
export const DEFAULT_ME = {
  id: 'me', name: '', age: 27, gender: 'Man', city: 'London',
  job: '', bio: '', height: `5'10"`,
  interests: [], values: [], intention: 'Ready for nikah',
  languages: ['English'],
  prompts: [],
  photos: [],
  friendTakes: [],
  sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Other', halalDiet: 'Mostly halal',
  veil: null,            // set when a sister creates her profile: 'Hijab' | 'Niqab'
  photoVeiled: true,     // sisters' photos start veiled by default
  // Compatibility Question: one question anyone who wants to like me has
  // to answer first. null = not set.
  compatQuestion: null,
  // The Veil: the one unveiled photo a sister sets aside. It is shown to
  // nobody until she unveils it for a specific match.
  unveiledPhoto: null,
  // The line on her card, in her own words. null = she said nothing.
  cardNote: null,
  waliEnabled: false,
  photoPrivacy: false,
  selfieVerified: false,
  butterflyTrained: false,
  gold: false,
};
