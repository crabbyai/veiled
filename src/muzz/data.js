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

// ── Discoverable sisters ─────────────────────────────────────────────
// veil: 'Hijab' | 'Niqab' — every profile has one; it's the point.
// photoVeiled: photos stay frosted until she unveils for a match.
export const PEOPLE = [
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
  },
];

// ── Veiled Social: seed feed posts ───────────────────────────────────
const hr = 3600000;
export const SOCIAL_SEED = [
  {
    id: 's1', authorId: 'p3', authorName: 'Sana', verified: false,
    text: 'Caught the most insane sunrise on the Helvellyn ridge this morning. Fajr with a view — 4am alarm absolutely worth it ☀️🏔️',
    tag: 'Adventure', likes: 142, comments: 23, liked: false, ts: Date.now() - hr * 1,
    image: ['#EFD27C', '#C99A2C'],
  },
  {
    id: 's2', authorId: 'p5', authorName: 'Noor', verified: true,
    text: 'Spent the afternoon on a new calligraphy piece — Surah An-Nur. There is something so grounding about ink and patience. ✍️',
    tag: 'Art', likes: 308, comments: 41, liked: true, ts: Date.now() - hr * 3,
    image: ['#A78BFA', '#7C3AED'],
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
    image: ['#F472B6', '#BE185D'],
  },
  {
    id: 's5', authorId: 'p7', authorName: 'Mariam', verified: true,
    text: 'My Year 4s wrote letters to their future selves today and I am NOT crying under this niqab, you are. The hope in these kids 🥹',
    tag: 'Life', likes: 874, comments: 119, liked: true, ts: Date.now() - hr * 20,
    image: null,
  },
];

export const COMMENT_SEED = [
  { id: 'c1', name: 'Layla', text: 'This is stunning masha’Allah 😍', ts: Date.now() - hr * 0.5 },
  { id: 'c2', name: 'Hana', text: 'Okay now I want to go!', ts: Date.now() - hr * 0.3 },
];

// ── Default "me" profile ────────────────────────────────────────────
export const DEFAULT_ME = {
  id: 'me', name: '', age: 27, gender: 'Man', city: 'London',
  job: '', bio: '', height: `5'10"`,
  interests: [], values: [], intention: 'Ready for nikah',
  languages: ['English'],
  prompts: [],
  photos: [],
  sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Other', halalDiet: 'Mostly halal',
  veil: null,            // set when a sister creates her profile: 'Hijab' | 'Niqab'
  photoVeiled: true,     // sisters' photos start veiled by default
  waliEnabled: false,
  photoPrivacy: false,
  selfieVerified: false,
  butterflyTrained: false,
  gold: false,
};
