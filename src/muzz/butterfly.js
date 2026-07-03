// ─── AI Butterfly matching engine ───────────────────────────────────
// The headline feature: instead of swiping, an AI "butterfly" learns
// your profile + feedback and automatically surfaces your best matches,
// each with a human-readable reason for *why* it chose them.

import { PEOPLE } from './data';

const overlap = (a = [], b = []) => a.filter((x) => b.includes(x)).length;

// Score one candidate against "me". Returns { score 0-100, reasons[] }.
export function scoreMatch(me, person, feedback = {}) {
  let score = 50;
  const reasons = [];

  // Shared interests — strongest signal
  const sharedInterests = (me.interests || []).filter((i) => person.interests.includes(i));
  if (sharedInterests.length) {
    score += sharedInterests.length * 7;
    reasons.push(
      `You both love ${sharedInterests.slice(0, 2).join(' & ').toLowerCase()}`
    );
  }

  // Shared values
  const sharedValues = (me.values || []).filter((v) => person.values.includes(v));
  if (sharedValues.length) {
    score += sharedValues.length * 6;
    reasons.push(`Aligned on being ${sharedValues[0].toLowerCase()}`);
  }

  // Intention alignment — critical for a marriage-minded app
  if (me.intention && person.intention === me.intention) {
    score += 12;
    reasons.push(`Both here for ${person.intention.toLowerCase()}`);
  } else if (
    (me.intention === 'Marriage' && person.intention === 'Long-term') ||
    (me.intention === 'Long-term' && person.intention === 'Marriage')
  ) {
    score += 5;
  }

  // Deen compatibility — sect, prayer level, halal practice
  if (me.sect && person.sect && me.sect !== 'Prefer not to say' && person.sect === me.sect) {
    score += 8;
    reasons.push(`Both ${person.sect}`);
  }
  if (me.prayerLevel && person.prayerLevel) {
    const levels = ['Never prays', 'Sometimes prays', 'Usually prays', 'Always prays'];
    const a = levels.indexOf(me.prayerLevel), b = levels.indexOf(person.prayerLevel);
    if (a >= 0 && b >= 0) {
      const gap = Math.abs(a - b);
      if (gap === 0) { score += 7; reasons.push(`Matched in practice — ${person.prayerLevel.toLowerCase()}`); }
      else if (gap === 1) score += 3;
      else score -= 4;
    }
  }
  if (me.halalDiet === 'Always halal' && person.halalDiet === 'Always halal') { score += 3; }

  // Proximity
  if (person.distance <= 5) { score += 8; reasons.push(`Only ${person.distance} miles away`); }
  else if (person.distance <= 12) { score += 4; reasons.push(`Close by in ${person.city}`); }
  else { score -= 3; }

  // Verified profiles feel safer
  if (person.verified) { score += 4; }

  // Shared languages
  const sharedLang = (me.languages || []).filter((l) => person.languages.includes(l) && l !== 'English');
  if (sharedLang.length) { score += 5; reasons.push(`You both speak ${sharedLang[0]}`); }

  // Learned feedback: the butterfly remembers what you liked / passed
  const fb = feedback[person.id];
  if (fb === 'liked') score += 25;
  if (fb === 'passed') score -= 40;

  // Subtle deterministic chemistry jitter so results aren't flat
  let seed = 0;
  const k = (me.id || 'me') + person.id;
  for (let i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) >>> 0;
  score += (seed % 11) - 3;

  score = Math.max(2, Math.min(99, Math.round(score)));

  if (!reasons.length) reasons.push(`A fresh face the butterfly thinks you'll click with`);

  return { score, reasons };
}

// Rank everyone and return sorted matches with scores + reasons.
export function rankMatches(me, feedback = {}, pool = PEOPLE) {
  return pool
    .filter((p) => feedback[p.id] !== 'passed')
    .map((p) => ({ person: p, ...scoreMatch(me, p, feedback) }))
    .sort((a, b) => b.score - a.score);
}

// The butterfly's daily pick — top unseen, high-confidence match.
export function dailyPick(me, feedback = {}, seenIds = []) {
  const ranked = rankMatches(me, feedback).filter(
    (m) => !seenIds.includes(m.person.id) && feedback[m.person.id] !== 'liked'
  );
  return ranked[0] || null;
}

// Compatibility label from a score.
export function compatLabel(score) {
  if (score >= 88) return 'Exceptional match';
  if (score >= 75) return 'Strong match';
  if (score >= 60) return 'Promising';
  return 'Worth a look';
}

// A short, warm line the butterfly "says" when revealing a match.
const OPENERS = [
  'I fluttered across the city and stopped here.',
  'Trust me on this one — I have a good feeling.',
  'Out of everyone today, this one stood out.',
  'I think your story and theirs could rhyme.',
  'My wings tingled. That usually means something.',
];
export function butterflyLine(score) {
  let i = Math.floor(score) % OPENERS.length;
  return OPENERS[i];
}
