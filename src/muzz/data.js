// ─── Mock data for the Muzz clone ──────────────────────────────────
// Profiles, prompts, interests, social posts. Photos are rendered as
// initial-on-gradient placeholders (see Avatar / PhotoTile components).

export const INTERESTS = [
  'Travelling', 'Coffee', 'Reading', 'Fitness', 'Cooking', 'Foodie',
  'Photography', 'Hiking', 'Movies', 'Art', 'Music', 'Startups',
  'Gaming', 'Fashion', 'Volunteering', 'Faith', 'Family', 'Languages',
  'Football', 'Yoga', 'Tea lover', 'Dogs', 'Cats', 'Calligraphy',
  'Astronomy', 'Poetry', 'Nature', 'Tech', 'Investing', 'Painting',
];

export const VALUES = [
  'Family-oriented', 'Ambitious', 'Practising', 'Adventurous',
  'Spiritual', 'Career-driven', 'Homebody', 'Romantic', 'Funny',
  'Honest', 'Loyal', 'Open-minded',
];

export const PROMPTS = [
  'A cause I care about',
  'The way to win me over is',
  'My ideal first date',
  'I geek out on',
  'Green flags I look for',
  'My simple pleasures',
  'A life goal of mine',
  'Together we could',
];

export const INTENTIONS = [
  'Marriage', 'Long-term', 'Still figuring it out', 'New friends',
];

// Religious profile fields — core to Muzz's matching
export const SECTS = ['Sunni', 'Shia', 'Other', 'Prefer not to say'];
export const PRAYER_LEVELS = ['Always prays', 'Usually prays', 'Sometimes prays', 'Never prays', 'Prefer not to say'];
export const HALAL_DIET = ['Always halal', 'Mostly halal', 'Sometimes', 'No'];
export const ETHNICITIES = [
  'Arab', 'South Asian', 'Turkish', 'African', 'Persian', 'South East Asian',
  'White / Caucasian', 'Mixed', 'Other',
];

// ── Discoverable people ──────────────────────────────────────────────
export const PEOPLE = [
  {
    id: 'p1', name: 'Layla', age: 26, city: 'London', distance: 3,
    job: 'UX Designer', verified: true, online: true,
    intention: 'Marriage',
    interests: ['Travelling', 'Coffee', 'Art', 'Photography', 'Faith'],
    values: ['Family-oriented', 'Ambitious', 'Romantic'],
    bio: 'Designer by day, ceramics enthusiast by night. Looking for someone to explore the city and build a future with.',
    prompts: [
      { q: 'My ideal first date', a: 'A walk through a gallery then dessert somewhere cosy.' },
      { q: 'I geek out on', a: 'Typography and obscure coffee brewing methods.' },
    ],
    sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Arab', halalDiet: 'Always halal',
    height: `5'6"`, languages: ['English', 'Arabic'],
  },
  {
    id: 'p2', name: 'Amara', age: 24, city: 'London', distance: 7,
    job: 'Junior Doctor', verified: true, online: false,
    intention: 'Long-term',
    interests: ['Fitness', 'Reading', 'Foodie', 'Family', 'Languages'],
    values: ['Career-driven', 'Honest', 'Funny'],
    bio: 'Probably reading three books at once. Will judge you by your taco order. Soft spot for golden retrievers.',
    prompts: [
      { q: 'The way to win me over is', a: 'Bring snacks and make me laugh. That simple.' },
      { q: 'A life goal of mine', a: 'To work with Doctors Without Borders one day.' },
    ],
    sect: 'Sunni', prayerLevel: 'Sometimes prays', ethnicity: 'African', halalDiet: 'Mostly halal',
    height: `5'4"`, languages: ['English', 'French'],
  },
  {
    id: 'p3', name: 'Sana', age: 28, city: 'Manchester', distance: 12,
    job: 'Architect', verified: false, online: true,
    intention: 'Marriage',
    interests: ['Hiking', 'Photography', 'Tea lover', 'Nature', 'Faith'],
    values: ['Spiritual', 'Adventurous', 'Loyal'],
    bio: 'I design buildings and chase sunsets. Mountains over beaches, always. Looking for a partner in adventure and in faith.',
    prompts: [
      { q: 'Together we could', a: 'Hike the Lake District then argue about the best tea.' },
      { q: 'A cause I care about', a: 'Sustainable cities and green architecture.' },
    ],
    sect: 'Sunni', prayerLevel: 'Always prays', ethnicity: 'South Asian', halalDiet: 'Always halal',
    height: `5'7"`, languages: ['English', 'Urdu'],
  },
  {
    id: 'p4', name: 'Yasmin', age: 25, city: 'London', distance: 2,
    job: 'Marketing Lead', verified: true, online: true,
    intention: 'Long-term',
    interests: ['Foodie', 'Travelling', 'Music', 'Fashion', 'Coffee'],
    values: ['Ambitious', 'Funny', 'Open-minded'],
    bio: 'Spreadsheet by day, playlist curator by night. I will out-eat you at brunch and I am not sorry.',
    prompts: [
      { q: 'My simple pleasures', a: 'Friday night takeaway and a perfectly organised playlist.' },
      { q: 'Green flags I look for', a: 'Kindness to waiters and replies to texts.' },
    ],
    sect: 'Other', prayerLevel: 'Sometimes prays', ethnicity: 'Turkish', halalDiet: 'Mostly halal',
    height: `5'5"`, languages: ['English', 'Turkish'],
  },
  {
    id: 'p5', name: 'Noor', age: 27, city: 'Birmingham', distance: 18,
    job: 'Pharmacist', verified: true, online: false,
    intention: 'Marriage',
    interests: ['Cooking', 'Calligraphy', 'Family', 'Faith', 'Poetry'],
    values: ['Practising', 'Family-oriented', 'Romantic'],
    bio: 'I find peace in calligraphy and the smell of fresh bread. Seeking a calm, kind soul to grow with, inshallah.',
    prompts: [
      { q: 'A cause I care about', a: 'Teaching kids art at the local community centre.' },
      { q: 'The way to win me over is', a: 'Genuine conversation and a shared love of poetry.' },
    ],
    sect: 'Shia', prayerLevel: 'Always prays', ethnicity: 'Persian', halalDiet: 'Always halal',
    height: `5'3"`, languages: ['English', 'Arabic', 'Farsi'],
  },
  {
    id: 'p6', name: 'Hana', age: 23, city: 'London', distance: 5,
    job: 'Software Engineer', verified: false, online: true,
    intention: 'Still figuring it out',
    interests: ['Gaming', 'Tech', 'Startups', 'Movies', 'Coffee'],
    values: ['Ambitious', 'Funny', 'Open-minded'],
    bio: 'I build apps and break them. 50% caffeine. Looking for a co-op partner for life (and Mario Kart).',
    prompts: [
      { q: 'I geek out on', a: 'Clean code, mechanical keyboards, and indie games.' },
      { q: 'Together we could', a: 'Build a startup or at least a really good blanket fort.' },
    ],
    sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Mixed', halalDiet: 'Mostly halal',
    height: `5'6"`, languages: ['English'],
  },
  {
    id: 'p7', name: 'Mariam', age: 29, city: 'Leeds', distance: 22,
    job: 'Teacher', verified: true, online: false,
    intention: 'Marriage',
    interests: ['Reading', 'Volunteering', 'Family', 'Tea lover', 'Faith'],
    values: ['Family-oriented', 'Spiritual', 'Loyal'],
    bio: 'Year 4 teacher with infinite patience (mostly). Big believer in small kindnesses and big love.',
    prompts: [
      { q: 'A life goal of mine', a: 'To open a free weekend school for kids in my area.' },
      { q: 'My simple pleasures', a: 'A good book, rain on the window, and a strong cup of chai.' },
    ],
    sect: 'Sunni', prayerLevel: 'Always prays', ethnicity: 'Arab', halalDiet: 'Always halal',
    height: `5'5"`, languages: ['English', 'Arabic'],
  },
  {
    id: 'p8', name: 'Zara', age: 26, city: 'London', distance: 4,
    job: 'Physiotherapist', verified: true, online: true,
    intention: 'Long-term',
    interests: ['Fitness', 'Yoga', 'Foodie', 'Travelling', 'Dogs'],
    values: ['Adventurous', 'Honest', 'Ambitious'],
    bio: 'I fix people for a living and lift weights for fun. Dog mum to a very dramatic cockapoo named Biscuit.',
    prompts: [
      { q: 'Green flags I look for', a: 'Goes to the gym AND for dessert after. Balance.' },
      { q: 'My ideal first date', a: 'Bouldering then the best burger in town.' },
    ],
    sect: 'Sunni', prayerLevel: 'Sometimes prays', ethnicity: 'Mixed', halalDiet: 'Mostly halal',
    height: `5'8"`, languages: ['English', 'Spanish'],
  },
  {
    id: 'p9', name: 'Eman', age: 25, city: 'London', distance: 9,
    job: 'Journalist', verified: false, online: false,
    intention: 'Long-term',
    interests: ['Reading', 'Poetry', 'Travelling', 'Music', 'Art'],
    values: ['Open-minded', 'Romantic', 'Honest'],
    bio: 'I chase stories and good coffee. Ask me about the time I interviewed a man who collects 4,000 spoons.',
    prompts: [
      { q: 'I geek out on', a: 'True crime podcasts and Oxford commas.' },
      { q: 'Together we could', a: 'Road-trip the coast with a questionable playlist.' },
    ],
    sect: 'Prefer not to say', prayerLevel: 'Sometimes prays', ethnicity: 'Arab', halalDiet: 'Sometimes',
    height: `5'5"`, languages: ['English', 'Italian'],
  },
  {
    id: 'p10', name: 'Aaliyah', age: 27, city: 'Bristol', distance: 26,
    job: 'Dentist', verified: true, online: true,
    intention: 'Marriage',
    interests: ['Cooking', 'Family', 'Fitness', 'Faith', 'Foodie'],
    values: ['Family-oriented', 'Practising', 'Funny'],
    bio: 'Yes I will look at your teeth. Weekend baker, weekday flosser-evangelist. Seeking my partner in deen and dinner.',
    prompts: [
      { q: 'The way to win me over is', a: 'Eat my cooking and mean the compliment.' },
      { q: 'A cause I care about', a: 'Free dental camps back home every summer.' },
    ],
    sect: 'Sunni', prayerLevel: 'Always prays', ethnicity: 'South Asian', halalDiet: 'Always halal',
    height: `5'4"`, languages: ['English', 'Gujarati'],
  },
];

// ── Muzz Social: seed feed posts ─────────────────────────────────────
const hr = 3600000;
export const SOCIAL_SEED = [
  {
    id: 's1', authorId: 'p3', authorName: 'Sana', verified: false,
    text: 'Caught the most insane sunrise on the Helvellyn ridge this morning. 4am alarm absolutely worth it ☀️🏔️',
    tag: 'Adventure', likes: 142, comments: 23, liked: false, ts: Date.now() - hr * 1,
    image: ['#FDBB2D', '#F5325B'],
  },
  {
    id: 's2', authorId: 'p5', authorName: 'Noor', verified: true,
    text: 'Spent the afternoon on a new calligraphy piece. There is something so grounding about ink and patience. ✍️',
    tag: 'Art', likes: 308, comments: 41, liked: true, ts: Date.now() - hr * 3,
    image: ['#A78BFA', '#7C3AED'],
  },
  {
    id: 's3', authorId: 'p8', authorName: 'Zara', verified: true,
    text: 'PSA: Biscuit the cockapoo has decided 6am is the new wake-up time. Send help (and treats). 🐶',
    tag: 'Life', likes: 521, comments: 88, liked: false, ts: Date.now() - hr * 6,
    image: null,
  },
  {
    id: 's4', authorId: 'p4', authorName: 'Yasmin', verified: true,
    text: 'Brunch reviewed: the shakshuka was elite, the queue was not. 7/10 would still queue again. 🍳',
    tag: 'Foodie', likes: 199, comments: 34, liked: false, ts: Date.now() - hr * 10,
    image: ['#FB923C', '#EA580C'],
  },
  {
    id: 's5', authorId: 'p7', authorName: 'Mariam', verified: true,
    text: 'My Year 4s wrote letters to their future selves today and I am NOT crying, you are. The hope in these kids 🥹',
    tag: 'Life', likes: 874, comments: 119, liked: true, ts: Date.now() - hr * 20,
    image: null,
  },
];

export const COMMENT_SEED = [
  { id: 'c1', name: 'Layla', text: 'This is stunning 😍', ts: Date.now() - hr * 0.5 },
  { id: 'c2', name: 'Hana', text: 'Okay now I want to go!', ts: Date.now() - hr * 0.3 },
];

// ── Default "me" profile ────────────────────────────────────────────
export const DEFAULT_ME = {
  id: 'me', name: '', age: 27, gender: 'Man', city: 'London',
  job: '', bio: '', height: `5'10"`,
  interests: [], values: [], intention: 'Marriage',
  languages: ['English'],
  prompts: [],
  photos: [],
  sect: 'Sunni', prayerLevel: 'Usually prays', ethnicity: 'Other', halalDiet: 'Mostly halal',
  waliEnabled: false,
  photoPrivacy: false,
  selfieVerified: false,
  butterflyTrained: false,
  gold: false,
};
