import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ME, SAMPLE_POSTS, SAMPLE_PEOPLE } from './data';
import { DEMO_MODE, HAS_BACKEND } from './config';
import * as api from './api';
import * as realtime from './realtime';
import { registerForPush, localNotify } from './notifications';
import * as purchases from './integrations/purchases';
import * as analytics from './integrations/analytics';
import * as errors from './integrations/errors';

const KEY = '@veiled_state_v1';

// Everyone the app currently knows about. Filled from the API, or from
// the written sample profiles when demo mode is on. Screens read it
// through getPerson() rather than importing the sample file, so a build
// without demo mode has no invented people in it at all.
let REGISTRY = DEMO_MODE ? SAMPLE_PEOPLE : [];
export const getPerson = (id) => REGISTRY.find((p) => p.id === id);
const setRegistry = (people) => { REGISTRY = people; };

// The Compatibility Question a person is asking, if any.
const questionFor = (personId) => {
  const p = getPerson(personId);
  return (p && p.compatQuestion) || null;
};

const MuzzContext = createContext(null);
export const useMuzz = () => useContext(MuzzContext);

const initialState = {
  me: DEFAULT_ME,
  onboarded: false,
  feedback: {},        // { personId: 'liked' | 'passed' }
  matches: [],         // personIds that became matches
  // People who liked you. Deliberately empty: this list sits behind the
  // Gold paywall, so seeding it with fabricated likes would be inventing
  // social proof to drive a purchase. Real likes arrive from the server
  // (and locally when someone you liked likes you back).
  likedYou: [],
  seen: [],            // butterfly-presented ids
  unveiled: {},        // { personId: true } — photos unveiled between us
  chaperones: {},      // { personId: { name } } — wali observing this chat
  rsvps: {},           // { eventId: true } — community events I'm attending
  signalsReads: [],    // personIds whose full profile I've read (Signals)
  weMet: {},           // { personId: { met, wentWell, ts } } — Hinge We Met
  muted: {},           // { personId: true } — muted conversations
  // Compatibility Question: answers I've written to other people's
  // questions, keyed by the person I answered.
  answersGiven: {},    // { personId: { question, text, ts } }
  // Answers written to MY question. Populated from the server; nothing is
  // seeded, so an empty list here means nobody has answered yet.
  answersReceived: [], // [{ personId, question, text, ts }]
  spent: {},           // { personId: 'rose' | 'super' } — so Rewind refunds
  chats: {},           // { personId: [{id, text, sender, ts, read}] }
  posts: DEMO_MODE ? SAMPLE_POSTS : [],
  postLikes: {},       // local like toggles for social posts
  butterflyAuto: true, // auto-match toggle
  superLikes: 3,
  roses: 1,
  boosts: 1,
  boostUntil: 0,
  lastPickTs: 0,
  reactions: {},   // { 'personId:msgId': '❤️' }
  filters: {
    maxDistance: 50,
    ageMin: 22,
    ageMax: 35,
    veil: 'Any',
    sect: 'Any',
    prayerLevel: 'Any',
    ethnicity: 'Any',
    verifiedOnly: false,
    passportCity: null,   // Passport: discover in any city (null = near me)
  },
  // Free-tier limits (mirrors real Muzz: 5 likes / 12h, 1 instant chat / day)
  likeWindowStart: 0,
  likesInWindow: 0,
  pendingMatch: null,     // a confirmed match the UI hasn't announced yet
  instantChatDay: '',
  instantChatsUsed: 0,
  // Compliments: an opener that goes straight to her chat, before a
  // match. One a day is free; more are earned (see dhikr) or bought.
  compliments: 0,
  // The tasbih. `sitting` is the run you're on right now; `banked` and
  // `dayPoints` are the slow part — progress toward a gift, which is
  // capped at a tenth a day so it can only ever be earned over time.
  dhikr: {
    total: 0,          // every dhikr ever counted here
    day: '',           // toDateString of dayCount / dayPoints
    dayCount: 0,
    dayPoints: 0,      // points earned today, never above DAILY_POINT_CAP
    banked: 0,         // points carried over from previous days
    sitting: 0,        // count in the current unbroken sitting
    sittingStart: 0,
    lastTs: 0,
    streak: 0,         // consecutive days with any dhikr
    lastDay: '',
    gift: null,        // an earned gift waiting to be chosen
    giftsEarned: 0,
  },
};

// How long start-up work gets before the app gives up waiting on it.
const STARTUP_TIMEOUT_MS = 4000;

export const FREE_LIKES_PER_WINDOW = 5;
export const LIKE_WINDOW_MS = 12 * 3600000;
export const FREE_INSTANT_CHATS_PER_DAY = 1;

// Merge saved state over the defaults. Nested objects (me, filters) are
// merged key-by-key, not replaced: an older install that predates a new
// key would otherwise load it as `undefined`. That mattered — a stale
// `filters` without `sect`/`prayerLevel`/`ethnicity` made every
// `f.x !== 'Any'` check true and silently emptied the whole deck.
function mergeSaved(defaults, saved) {
  if (!saved || typeof saved !== 'object') return defaults;
  return {
    ...defaults,
    ...saved,
    me: { ...DEFAULT_ME, ...(saved.me || {}) },
    filters: { ...defaults.filters, ...(saved.filters || {}) },
    dhikr: { ...defaults.dhikr, ...(saved.dhikr || {}) },
  };
}

// ── The tasbih ──────────────────────────────────────────────────────
// A sitting is an unbroken run of dhikr — used for the timer on screen.
export const SITTING_GAP_MS = 5 * 60000;

// Progress toward a gift is measured in points out of a hundred, and
// no more than a tenth of it can be earned in one day. A gift is
// therefore ten days of turning up at the very least — it cannot be
// rushed in an evening, however long you sit.
export const DHIKR_PER_POINT = 50;    // 50 dhikr earns one point
export const DAILY_POINT_CAP = 10;    // …and ten points is the day's lot
export const GIFT_POINTS = 100;       // 5,000 dhikr over 10 days or more
// Jumu'ah is the day for it, so it counts double — the cap is the same,
// it just takes half the dhikr to fill.
export const JUMUAH_BONUS = 2;

// Device-local Friday. The Islamic day turns at Maghrib, but a rule
// people can predict beats a rule that is technically righter, and the
// screen says plainly which day it means.
export const isJumuah = (d = new Date()) => d.getDay() === 5;
export const dhikrPerPoint = (d = new Date()) => DHIKR_PER_POINT / (isJumuah(d) ? JUMUAH_BONUS : 1);

// Everything the tasbih screen needs to describe where you are, derived
// in one place so the screen and the store can't disagree about it.
export function dhikrProgress(d) {
  const today = new Date().toDateString();
  const fresh = !d || d.day !== today;
  const perPoint = dhikrPerPoint();
  const dayCount = fresh ? 0 : d.dayCount || 0;
  const banked = ((d && d.banked) || 0) + (fresh ? (d && d.dayPoints) || 0 : 0);
  const dayPoints = Math.min(DAILY_POINT_CAP, Math.floor(dayCount / perPoint));
  const points = Math.min(GIFT_POINTS, banked + dayPoints);
  const capped = dayPoints >= DAILY_POINT_CAP;
  return {
    perPoint,
    dayCount,
    dayPoints,
    points,
    capped,
    // What today still has room for, and what's left overall.
    dayTarget: DAILY_POINT_CAP * perPoint,
    toNextPoint: capped ? 0 : perPoint - (dayCount % perPoint),
    daysLeft: Math.ceil((GIFT_POINTS - points) / DAILY_POINT_CAP),
  };
}

export function MuzzProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(HAS_BACKEND);
  const [peopleError, setPeopleError] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(HAS_BACKEND);
  const [postsError, setPostsError] = useState(null);
  // null = still checking for a stored session. Only meaningful when a
  // backend is configured; without one there is nothing to sign in to.
  const [authed, setAuthed] = useState(HAS_BACKEND ? null : true);

  // Nothing renders until both of these resolve, so neither is allowed
  // to hang. If device storage stalls, carry on with defaults: a signed
  // -out app someone can use beats a blank screen with no way forward.
  useEffect(() => {
    if (!HAS_BACKEND) return;
    let done = false;
    const settle = (v) => { if (!done) { done = true; setAuthed(v); } };
    const t = setTimeout(() => settle(false), STARTUP_TIMEOUT_MS);
    api.hasSession().then((v) => settle(!!v)).catch(() => settle(false))
      .finally(() => clearTimeout(t));
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let done = false;
    const settle = () => { if (!done) { done = true; setHydrated(true); } };
    const t = setTimeout(settle, STARTUP_TIMEOUT_MS);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setState((s) => mergeSaved(s, saved));
        }
      } catch {}
      clearTimeout(t);
      settle();
    })();
    return () => clearTimeout(t);
  }, []);

  // Connect the realtime channel once hydrated and signed in (no-op
  // without a backend).
  useEffect(() => {
    if (!hydrated || !state.onboarded || authed !== true) return;
    realtime.connect({
      onMessage: (personId, text, kind = 'text', meta = null) => {
        const msg = { id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`, text, kind, meta, sender: 'them', ts: Date.now(), read: false };
        setState((s) => {
          const next = { ...s, chats: { ...s.chats, [personId]: [...(s.chats[personId] || []), msg] } };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
        localNotify('New message', kind === 'image' ? '📷 Photo' : kind === 'audio' ? '🎤 Voice note' : text.slice(0, 100));
      },
      onMatch: (personId) => {
        setState((s) => {
          if (s.matches.includes(personId)) return s;
          const next = { ...s, matches: [...s.matches, personId], chats: s.chats[personId] ? s.chats : { ...s.chats, [personId]: [] }, pendingMatch: personId };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      },
    });
    registerForPush();
    refreshPeople();
    // Who already likes me has to be known before the first swipe: it's
    // what decides whether a like is a match, and Discover is the tab
    // the app opens on.
    refreshLikes();
    // Attach analytics + purchases identity, and tag crash reports.
    const uid = state.me?.id || 'me';
    analytics.identify(uid, { veil: state.me?.veil || null });
    errors.setUser(uid);
    purchases.init(uid).catch(() => {});
    return () => realtime.disconnect();
  }, [hydrated, state.onboarded, authed]);

  const persist = useCallback((next) => {
    setState(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback((patch) => {
    setState((s) => {
      const next = typeof patch === 'function' ? patch(s) : { ...s, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // ── Actions ────────────────────────────────────────────────────────
  const setMe = useCallback((patch) => update((s) => ({ ...s, me: { ...s.me, ...patch } })), [update]);

  // Record a match the server confirmed, if we didn't already know, and
  // queue it so the screen you're on can announce it. This is the case
  // where she likes you while you're mid-swipe: our copy of who likes us
  // was written before she did, so the like looked one-sided at the
  // moment you sent it.
  const confirmMatch = useCallback((personId) => {
    update((s) => (s.matches.includes(personId) ? s : {
      ...s,
      matches: [...s.matches, personId],
      chats: s.chats[personId] ? s.chats : { ...s.chats, [personId]: [] },
      pendingMatch: personId,
    }));
  }, [update]);

  const clearPendingMatch = useCallback(() => {
    update((s) => (s.pendingMatch ? { ...s, pendingMatch: null } : s));
  }, [update]);

  const completeOnboarding = useCallback((mePatch) => {
    update((s) => ({ ...s, onboarded: true, me: { ...s.me, ...mePatch, butterflyTrained: true } }));
    api.mirror(() => api.saveProfile({ ...DEFAULT_ME, ...mePatch }));
  }, [update]);

  // `comment` (Hinge): when you like a specific photo/prompt with a note,
  // it seeds the conversation as your opening message on match.
  // `answer`: her Compatibility Question, answered. The server refuses an
  // unanswered like on someone who set one — see needsAnswer() below.
  //
  // A like is only a like. It becomes a match when she has already liked
  // you — otherwise it sits with her until she decides, and the match
  // arrives over the realtime channel. Nothing here invents reciprocity.
  // Returns true when the like matched, so the caller knows whether to
  // show the match screen.
  const likePerson = useCallback((personId, { comment = null, contentType = null, contentRef = null, answer = null } = {}) => {
    let matched = false;
    update((s) => {
      const feedback = { ...s.feedback, [personId]: 'liked' };
      const sheLikedMe = s.likedYou.includes(personId);
      const becameMatch = sheLikedMe && !s.matches.includes(personId);
      matched = becameMatch || s.matches.includes(personId);
      const matches = becameMatch ? [...s.matches, personId] : s.matches;
      const opener = comment ? [{ id: `op${Date.now()}`, text: comment, sender: 'me', ts: Date.now(), read: false }] : [];
      const chats = becameMatch && !s.chats[personId]
        ? { ...s.chats, [personId]: opener }
        : s.chats;
      const seen = s.seen.includes(personId) ? s.seen : [...s.seen, personId];
      // Track the rolling 12h like window (free tier)
      const now = Date.now();
      const windowExpired = now - s.likeWindowStart > LIKE_WINDOW_MS;
      const likeWindowStart = windowExpired ? now : s.likeWindowStart;
      const likesInWindow = windowExpired ? 1 : s.likesInWindow + 1;
      const answersGiven = answer
        ? { ...(s.answersGiven || {}), [personId]: { question: questionFor(personId), text: answer, ts: now } }
        : s.answersGiven;
      return { ...s, feedback, matches, chats, seen, likeWindowStart, likesInWindow, answersGiven };
    });
    // The server is the authority on whether this matched — our copy of
    // who likes us can be a few minutes stale. If it says yes and we
    // thought otherwise, record the match; the realtime channel opens
    // the match screen.
    api.mirror(async () => {
      const res = await (comment
        ? api.likeWithComment(personId, { comment, contentType, contentRef, answer })
        : api.swipe(personId, 'like', { answer }));
      if (res && res.match) confirmMatch(personId);
    });
    return matched;
  }, [update, confirmMatch]);

  // Rose (Hinge): a standout like. Consumes a Rose; behaves like a like
  // with an optional comment, but flagged special. A Rose is still only
  // a like — it reaches her first, it doesn't decide for her. `matched`
  // reports whether she had already liked you.
  const sendRose = useCallback((personId, { comment = null, contentType = null, contentRef = null, answer = null } = {}) => {
    let ok = false;
    let matched = false;
    update((s) => {
      if (!s.me.gold && (s.roses || 0) <= 0) return s;
      ok = true;
      const feedback = { ...s.feedback, [personId]: 'liked' };
      const becameMatch = s.likedYou.includes(personId) && !s.matches.includes(personId);
      matched = becameMatch || s.matches.includes(personId);
      const matches = becameMatch ? [...s.matches, personId] : s.matches;
      const opener = comment ? [{ id: `op${Date.now()}`, text: comment, sender: 'me', ts: Date.now(), read: false }] : [];
      const chats = becameMatch && !s.chats[personId] ? { ...s.chats, [personId]: opener } : s.chats;
      const seen = s.seen.includes(personId) ? s.seen : [...s.seen, personId];
      return {
        ...s, feedback, matches, chats, seen,
        roses: s.me.gold ? s.roses : Math.max(0, (s.roses || 0) - 1),
        spent: { ...(s.spent || {}), [personId]: 'rose' },
        answersGiven: answer
          ? { ...(s.answersGiven || {}), [personId]: { question: questionFor(personId), text: answer, ts: Date.now() } }
          : s.answersGiven,
      };
    });
    if (ok) {
      api.mirror(async () => {
        const res = await api.rose(personId, { comment, contentType, contentRef, answer });
        if (res && res.match) confirmMatch(personId);
      });
    }
    return { ok, matched };
  }, [update, confirmMatch]);

  // ── Compatibility Question ─────────────────────────────────────────
  // Set (or clear, with null) the one question anyone who wants to like
  // me has to answer first.
  const setCompatQuestion = useCallback((text) => {
    const q = text == null ? null : String(text).trim().slice(0, 140) || null;
    update((s) => ({ ...s, me: { ...s.me, compatQuestion: q } }));
    api.mirror(async () => {
      const { profile } = await api.getMyProfile();
      await api.saveProfile({ ...profile, compatQuestion: q });
    });
  }, [update]);

  // ── Account ────────────────────────────────────────────────────────
  // Turn a server error into something worth reading. The API's own
  // message is usually the clearest thing we have ("Email already
  // registered"), so prefer it over anything invented here.
  const authError = (e) => {
    const msg = (e && e.message) || '';
    if (/network|fetch|failed/i.test(msg)) return "Can't reach Veiled. Check your connection and try again.";
    return msg || 'Something went wrong. Please try again.';
  };

  const signUp = useCallback(async (email, password) => {
    try {
      await api.register(email, password, null);
      setAuthed(true);
      return { ok: true };
    } catch (e) { return { ok: false, error: authError(e) }; }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      await api.login(email, password);
      setAuthed(true);
      // Pull the profile this account already has, so signing in on a
      // new device restores it instead of starting onboarding again.
      try {
        const { profile } = await api.getMyProfile();
        if (profile) update((s) => ({ ...s, onboarded: true, me: { ...s.me, ...profile } }));
      } catch {}
      return { ok: true };
    } catch (e) { return { ok: false, error: authError(e) }; }
  }, [update]);

  // Load discoverable members from the API. This is the only source of
  // people in a shipping build; without a backend the deck stays empty
  // rather than filling with invented profiles.
  const refreshPeople = useCallback(async () => {
    if (!HAS_BACKEND) { setRegistry(DEMO_MODE ? SAMPLE_PEOPLE : []); return; }
    setLoadingPeople(true);
    try {
      if (!(await api.isAvailable())) { setPeopleError('offline'); return; }
      const { candidates } = await api.discover(state.filters);
      const people = (candidates || []).map((c) => ({
        ...c.person,
        id: api.toLocalId(c.person.id),
        photos: (c.person.photos || []).map(api.mediaUrl),
      }));
      setRegistry(people);
      setPeopleError(null);
      update((s) => ({ ...s, peopleVersion: (s.peopleVersion || 0) + 1 }));
    } catch {
      setPeopleError('offline');
    } finally {
      setLoadingPeople(false);
    }
  }, [state.filters, update]);

  // Filters are applied server-side, so changing them reloads the deck.
  useEffect(() => {
    if (!hydrated || !state.onboarded || !HAS_BACKEND || authed !== true) return;
    const t = setTimeout(() => { refreshPeople(); }, 300);
    return () => clearTimeout(t);
  }, [hydrated, state.onboarded, state.filters, authed]);

  // Pull who likes me — and, for anyone who answered my Compatibility
  // Question, what they wrote. No-ops without a backend, which is why
  // answersReceived starts empty rather than seeded: an answer shown here
  // is one a real person actually wrote.
  const refreshLikes = useCallback(async () => {
    if (!api.isConfigured()) return;
    try {
      if (!(await api.isAvailable())) return;
      const { people } = await api.likesYou();
      if (!Array.isArray(people)) return;
      const likedYou = people.map((p) => api.toLocalId(p.id));
      const answersReceived = people
        .filter((p) => p.like && p.like.answer)
        .map((p) => ({
          personId: api.toLocalId(p.id),
          name: p.name,
          question: p.like.question || null,
          text: p.like.answer,
          rose: !!p.like.rose,
        }));
      update((s) => ({ ...s, likedYou, answersReceived }));
    } catch {}
  }, [update]);

  // True when I must answer her question before I can like her. Mirrors
  // the server's rule exactly: a question only gates people she hasn't
  // already liked. Once she likes me, the question has done its job.
  const needsAnswer = useCallback((personId) => {
    const person = getPerson(personId);
    const question = questionFor(personId);
    if (!question) return false;
    if (state.answersGiven && state.answersGiven[personId]) return false;
    const sheLikedMe = state.likedYou.includes(personId) || (person && person.likedYou);
    return !sheLikedMe;
  }, [state.answersGiven, state.likedYou]);

  // Mute a conversation (no notifications from this person).
  const toggleMute = useCallback((personId) => {
    update((s) => {
      const muted = { ...(s.muted || {}) };
      if (muted[personId]) delete muted[personId]; else muted[personId] = true;
      return { ...s, muted };
    });
  }, [update]);

  // We Met (Hinge): private post-date feedback, stored per person.
  const recordWeMet = useCallback((personId, met, wentWell = null) => {
    update((s) => ({ ...s, weMet: { ...(s.weMet || {}), [personId]: { met, wentWell, ts: Date.now() } } }));
    api.mirror(async () => {
      const { matches: sm } = await api.matches();
      const m = sm.find((x) => api.toLocalId(x.person.id) === personId);
      if (m) await api.weMet(m.matchId, met, wentWell);
    });
  }, [update]);

  // Likes remaining in the current 12h window (Infinity on Gold)
  const likesRemaining = useCallback(() => {
    if (state.me.gold) return Infinity;
    if (Date.now() - state.likeWindowStart > LIKE_WINDOW_MS) return FREE_LIKES_PER_WINDOW;
    return Math.max(0, FREE_LIKES_PER_WINDOW - state.likesInWindow);
  }, [state.me.gold, state.likeWindowStart, state.likesInWindow]);

  // Instant Chat: skip matching, open a chat directly. 1 free per day,
  // and any Compliments you've earned after that.
  const useInstantChat = useCallback((personId) => {
    const today = new Date().toDateString();
    let allowed = false;
    update((s) => {
      const used = s.instantChatDay === today ? s.instantChatsUsed : 0;
      const free = s.me.gold || used < FREE_INSTANT_CHATS_PER_DAY;
      const credit = !free && (s.compliments || 0) > 0;
      allowed = free || credit;
      if (!allowed) return s;
      return {
        ...s,
        compliments: credit ? s.compliments - 1 : s.compliments,
        instantChatDay: today,
        instantChatsUsed: used + 1,
        matches: s.matches.includes(personId) ? s.matches : [...s.matches, personId],
        chats: s.chats[personId] ? s.chats : { ...s.chats, [personId]: [] },
        seen: s.seen.includes(personId) ? s.seen : [...s.seen, personId],
      };
    });
    return allowed;
  }, [update]);

  const passPerson = useCallback((personId) => {
    update((s) => ({
      ...s,
      feedback: { ...s.feedback, [personId]: 'passed' },
      seen: s.seen.includes(personId) ? s.seen : [...s.seen, personId],
    }));
    api.mirror(() => api.swipe(personId, 'pass'));
  }, [update]);

  // Rewind (Gold): undo the last like/pass so the card returns to the deck.
  // Refunds whatever the swipe cost — a rewound Rose or Super Like must
  // come back, not be silently burned.
  const undoSwipe = useCallback((personId) => {
    update((s) => {
      const feedback = { ...s.feedback };
      delete feedback[personId];
      const spent = { ...(s.spent || {}) };
      const cost = spent[personId];
      delete spent[personId];
      // The answer went with the like, so it comes back with it too:
      // liking her again asks the question again.
      const answersGiven = { ...(s.answersGiven || {}) };
      delete answersGiven[personId];
      const gold = s.me.gold;
      return {
        ...s,
        feedback,
        spent,
        answersGiven,
        matches: s.matches.filter((id) => id !== personId),
        seen: s.seen.filter((id) => id !== personId),
        chats: cost ? Object.fromEntries(Object.entries(s.chats).filter(([id]) => id !== personId)) : s.chats,
        roses: !gold && cost === 'rose' ? (s.roses || 0) + 1 : s.roses,
        superLikes: !gold && cost === 'super' ? (s.superLikes || 0) + 1 : s.superLikes,
        likesInWindow: Math.max(0, (s.likesInWindow || 0) - 1),
      };
    });
    api.mirror(() => api.rewind(personId));
  }, [update]);

  const markSeen = useCallback((personId) => {
    update((s) => (s.seen.includes(personId) ? s : { ...s, seen: [...s.seen, personId], lastPickTs: Date.now() }));
  }, [update]);

  // `kind` is 'text', 'image' or 'audio'. For the media kinds `text` is
  // the uploaded file's path and `meta` carries what that kind needs —
  // a voice note's length, a photo's shape.
  const sendMessage = useCallback((personId, text, sender = 'me', { kind = 'text', meta = null } = {}) => {
    const msg = {
      id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      text, kind, meta, sender, ts: Date.now(), read: sender === 'me',
    };
    update((s) => ({
      ...s,
      chats: { ...s.chats, [personId]: [...(s.chats[personId] || []), msg] },
    }));
    if (sender === 'me') {
      api.mirror(async () => {
        const { matches: serverMatches } = await api.matches();
        const m = serverMatches.find((x) => api.toLocalId(x.person.id) === personId);
        if (m) await api.sendMessage(m.matchId, text, kind, meta);
      });
    }
    return msg;
  }, [update]);

  const addPhoto = useCallback((uri) => {
    update((s) => ({ ...s, me: { ...s.me, photos: [...(s.me.photos || []), uri] } }));
  }, [update]);

  const removePhoto = useCallback((uri) => {
    update((s) => ({ ...s, me: { ...s.me, photos: (s.me.photos || []).filter((p) => p !== uri) } }));
  }, [update]);

  const setFilters = useCallback((patch) => {
    update((s) => ({ ...s, filters: { ...s.filters, ...patch } }));
  }, [update]);

  const reactToMessage = useCallback((personId, msgId, emoji) => {
    const key = `${personId}:${msgId}`;
    update((s) => {
      const reactions = { ...s.reactions };
      if (!emoji || reactions[key] === emoji) delete reactions[key];
      else reactions[key] = emoji;
      return { ...s, reactions };
    });
    api.mirror(async () => {
      const { matches: sm } = await api.matches();
      const m = sm.find((x) => api.toLocalId(x.person.id) === personId);
      if (m) {
        const { messages } = await api.getMessages(m.matchId);
        const target = messages[messages.length - 1];
        if (target) await api.reactToMessage(target.id, emoji);
      }
    });
  }, [update]);

  // ── The Veil ───────────────────────────────────────────────────────
  // Where a match stands: has she unveiled, has he asked, has enough
  // happened for it to be fair to ask her. Returns null offline.
  const veilStateFor = useCallback(async (personId) => {
    if (!HAS_BACKEND) return null;
    try {
      const { matches: sm } = await api.matches();
      const m = sm.find((x) => api.toLocalId(x.person.id) === personId);
      if (!m) return null;
      return await api.veilState(m.matchId);
    } catch { return null; }
  }, []);

  // He asks; she decides. This only ever raises the question.
  const askToUnveil = useCallback(async (personId) => {
    if (!HAS_BACKEND) return { ok: false };
    try {
      const { matches: sm } = await api.matches();
      const m = sm.find((x) => api.toLocalId(x.person.id) === personId);
      if (!m) return { ok: false };
      await api.askUnveil(m.matchId);
      return { ok: true };
    } catch (e) { return { ok: false, error: (e && e.message) || 'Could not send that request.' }; }
  }, []);

  // The Veil, per match: unveil photos between me and this person. Mirrors
  // to the backend's /matches/:id/unveil when connected.
  const unveilFor = useCallback((personId) => {
    update((s) => ({ ...s, unveiled: { ...s.unveiled, [personId]: true } }));
    api.mirror(async () => {
      const { matches: sm } = await api.matches();
      const m = sm.find((x) => api.toLocalId(x.person.id) === personId);
      if (m) await api.unveil(m.matchId);
    });
  }, [update]);

  const isUnveiled = useCallback(
    (personId) => !!state.unveiled[personId],
    [state.unveiled]
  );

  // Signals: reward genuinely reading profiles (not skimming a deck).
  const markProfileRead = useCallback((personId) => {
    update((s) => (s.signalsReads.includes(personId) ? s : { ...s, signalsReads: [...s.signalsReads, personId] }));
    api.mirror(() => api.signalRead(personId));
  }, [update]);

  const toggleRsvp = useCallback((eventId) => {
    update((s) => {
      const rsvps = { ...s.rsvps };
      if (rsvps[eventId]) delete rsvps[eventId];
      else rsvps[eventId] = true;
      return { ...s, rsvps };
    });
  }, [update]);

  // Wali / chaperone oversight for a single conversation.
  const setChaperone = useCallback((personId, wali) => {
    update((s) => {
      const chaperones = { ...s.chaperones };
      if (wali) chaperones[personId] = wali;
      else delete chaperones[personId];
      return { ...s, chaperones };
    });
  }, [update]);

  // ── Dhikr ──────────────────────────────────────────────────────────
  // Count one (or a few). Returns true when this tap completed a gift,
  // so the screen can celebrate at the right moment.
  //
  // The count itself is never refused. Once the day's tenth is full the
  // tasbih keeps counting — it just stops moving the gift along. A
  // counter that locks you out of dhikr would have the whole thing
  // backwards.
  const addDhikr = useCallback((n = 1) => {
    const now = Date.now();
    const today = new Date().toDateString();
    let earned = false;
    update((s) => {
      const d = s.dhikr || initialState.dhikr;
      const broke = !d.lastTs || now - d.lastTs > SITTING_GAP_MS;
      const rolled = d.day !== today;

      // Yesterday's points are banked the first time you count today.
      const banked = (d.banked || 0) + (rolled ? d.dayPoints || 0 : 0);
      const dayCount = (rolled ? 0 : d.dayCount || 0) + n;
      const perPoint = dhikrPerPoint();
      const dayPoints = Math.min(DAILY_POINT_CAP, Math.floor(dayCount / perPoint));

      // A gift lands when the hundred is complete, and only one waits at
      // a time. The hundred is spent when it is earned, not when it is
      // claimed, so the next one starts from zero.
      const total = banked + dayPoints;
      const hit = total >= GIFT_POINTS && !d.gift;
      if (hit) earned = true;

      // A day's streak counts a day you turned up, not a target you hit.
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const streak = d.lastDay === today ? (d.streak || 1)
        : d.lastDay === yesterday ? (d.streak || 0) + 1
          : 1;

      return {
        ...s,
        dhikr: {
          ...d,
          total: (d.total || 0) + n,
          day: today,
          dayCount,
          dayPoints,
          banked: hit ? banked - GIFT_POINTS : banked,
          sitting: (broke ? 0 : d.sitting || 0) + n,
          sittingStart: broke ? now : d.sittingStart || now,
          lastTs: now,
          streak,
          lastDay: today,
          gift: hit ? { jumuah: isJumuah(), ts: now } : d.gift,
          giftsEarned: (d.giftsEarned || 0) + (hit ? 1 : 0),
        },
      };
    });
    return earned;
  }, [update]);

  // Start the tally again from zero. Only the sitting resets: the day's
  // count, your progress, the streak and the lifetime total are yours.
  const resetDhikr = useCallback(() => {
    update((s) => ({
      ...s,
      dhikr: { ...(s.dhikr || initialState.dhikr), sitting: 0, sittingStart: Date.now(), lastTs: Date.now() },
    }));
  }, [update]);

  // Take the earned gift as a Rose, a Compliment or a Boost.
  const claimDhikrGift = useCallback((kind) => {
    let ok = false;
    update((s) => {
      const d = s.dhikr || initialState.dhikr;
      if (!d.gift) return s;
      ok = true;
      return {
        ...s,
        roses: kind === 'rose' ? (s.roses || 0) + 1 : s.roses,
        boosts: kind === 'boost' ? (s.boosts || 0) + 1 : s.boosts,
        compliments: kind === 'compliment' ? (s.compliments || 0) + 1 : s.compliments,
        dhikr: { ...d, gift: null },
      };
    });
    return ok;
  }, [update]);

  const activateBoost = useCallback(() => {
    const until = Date.now() + 30 * 60000;
    update((s) => ({ ...s, boostUntil: until, boosts: Math.max(0, s.boosts - 1) }));
    api.mirror(() => api.boost());
    return until;
  }, [update]);

  const blockPerson = useCallback((personId, reason) => {
    update((s) => ({
      ...s,
      matches: s.matches.filter((id) => id !== personId),
      feedback: { ...s.feedback, [personId]: 'passed' },
      seen: s.seen.includes(personId) ? s.seen : [...s.seen, personId],
    }));
    api.mirror(() => api.block(personId, reason));
  }, [update]);

  // Unmatch: end a match without blocking — remove the match & its chat.
  const unmatchPerson = useCallback((personId) => {
    update((s) => {
      const chats = { ...s.chats }; delete chats[personId];
      return { ...s, matches: s.matches.filter((id) => id !== personId), chats };
    });
    api.mirror(async () => {
      const { matches: sm } = await api.matches();
      const m = sm.find((x) => api.toLocalId(x.person.id) === personId);
      if (m) await api.unmatch(m.matchId);
    });
  }, [update]);

  // Pause (Snooze): hide my profile from discovery, keep matches & chats.
  const pauseProfile = useCallback((paused) => {
    update((s) => ({ ...s, me: { ...s.me, paused: !!paused } }));
    api.mirror(() => api.pauseProfile(!!paused));
  }, [update]);

  // Safety: report to moderation. Reporting also removes them from view.
  const reportPerson = useCallback((personId, reason = 'other', detail = null) => {
    update((s) => ({
      ...s,
      matches: s.matches.filter((id) => id !== personId),
      feedback: { ...s.feedback, [personId]: 'passed' },
      seen: s.seen.includes(personId) ? s.seen : [...s.seen, personId],
    }));
    api.mirror(() => api.report(personId, { reason, detail }));
  }, [update]);

  // ── Social (community feed) ────────────────────────────────────────
  // Load the feed from the server. Posts are written by members, so
  // without a backend there is no feed — not a seeded one.
  const refreshPosts = useCallback(async () => {
    if (!HAS_BACKEND) return;
    setLoadingPosts(true);
    try {
      if (!(await api.isAvailable())) { setPostsError('offline'); return; }
      const { posts } = await api.getPosts();
      if (Array.isArray(posts)) {
        update((s) => ({
          ...s,
          posts,
          // The server knows what I've liked; trust it over local state.
          postLikes: posts.reduce((acc, p) => (p.liked ? { ...acc, [p.id]: 1 } : acc), {}),
        }));
        setPostsError(null);
      }
    } catch {
      setPostsError('offline');
    } finally {
      setLoadingPosts(false);
    }
  }, [update]);

  // Like/unlike, and keep the count honest by moving it with the toggle
  // rather than rendering `likes + (liked ? 1 : 0)` over a stale count.
  const togglePostLike = useCallback((postId) => {
    let nowLiked = false;
    update((s) => {
      nowLiked = !s.postLikes[postId];
      return {
        ...s,
        postLikes: { ...s.postLikes, [postId]: nowLiked ? 1 : 0 },
        posts: s.posts.map((p) => (p.id === postId
          ? { ...p, likes: Math.max(0, (p.likes || 0) + (nowLiked ? 1 : -1)), liked: nowLiked }
          : p)),
      };
    });
    api.mirror(() => api.likePost(postId));
  }, [update]);

  // Publish a post. Resolves { ok, error } — the composer waits on it
  // rather than closing and hoping, which is what made posting look
  // like it had hung.
  const addPost = useCallback(async ({ text, tag, imageUrl = null }) => {
    const body = String(text || '').trim();
    if (!body) return { ok: false, error: 'Write something first.' };
    if (!HAS_BACKEND) return { ok: false, error: "You're offline. Posts need a connection." };
    try {
      if (!(await api.isAvailable())) return { ok: false, error: "Can't reach Veiled. Check your connection." };
      await api.createPost(body, tag || 'Life', imageUrl);
      // Re-read the feed so the post carries the server's id and
      // timestamp — a locally invented id would double up on refresh.
      await refreshPosts();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Could not post. Please try again.' };
    }
  }, [refreshPosts]);

  // Comments live on the server too.
  const loadComments = useCallback(async (postId) => {
    if (!HAS_BACKEND) return [];
    try {
      const { comments } = await api.getComments(postId);
      return Array.isArray(comments) ? comments : [];
    } catch { return []; }
  }, []);

  const addComment = useCallback(async (postId, body) => {
    const text = String(body || '').trim();
    if (!text) return { ok: false };
    if (!HAS_BACKEND) return { ok: false, error: "You're offline." };
    try {
      await api.addComment(postId, text);
      update((s) => ({
        ...s,
        posts: s.posts.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p)),
      }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Could not send that comment.' };
    }
  }, [update]);

  // Log out: drop the session token and everything cached on the device.
  const resetAll = useCallback(() => {
    try { realtime.disconnect(); } catch {}
    api.logout().catch(() => {});
    setRegistry(DEMO_MODE ? SAMPLE_PEOPLE : []);
    if (HAS_BACKEND) setAuthed(false);
    persist(initialState);
  }, [persist]);

  // Permanently delete the account (App Store 5.1.1(v) requires this to be
  // doable in-app). Deletes server-side first, then wipes everything
  // stored on the device. Resolves { ok } so the UI can report failure
  // instead of pretending the data is gone.
  const deleteAccount = useCallback(async () => {
    let serverOk = true;
    if (api.isConfigured()) {
      try {
        if (await api.isAvailable()) await api.deleteAccount();
        else serverOk = false;
      } catch { serverOk = false; }
    }
    try { realtime.disconnect(); } catch {}
    await api.logout().catch(() => {});
    setRegistry(DEMO_MODE ? SAMPLE_PEOPLE : []);
    if (HAS_BACKEND) setAuthed(false);
    await persist(initialState);
    return { ok: serverOk };
  }, [persist]);

  const value = useMemo(() => ({
    ...state, hydrated,
    setMe, completeOnboarding, likePerson, passPerson, undoSwipe, markSeen,
    sendMessage, togglePostLike, addPost, update, resetAll, deleteAccount,
    likesRemaining, useInstantChat,
    addPhoto, removePhoto, setFilters, reactToMessage, activateBoost, blockPerson, reportPerson,
    unmatchPerson, pauseProfile, sendRose, recordWeMet, toggleMute,
    unveilFor, isUnveiled, veilStateFor, askToUnveil, setChaperone, toggleRsvp, markProfileRead,
    setCompatQuestion, needsAnswer, refreshLikes, clearPendingMatch,
    addDhikr, resetDhikr, claimDhikrGift,
    people: REGISTRY, refreshPeople, loadingPeople, peopleError, demoMode: DEMO_MODE, hasBackend: HAS_BACKEND,
    refreshPosts, loadingPosts, postsError, loadComments, addComment,
    authed, signIn, signUp,
  }), [state, hydrated, loadingPeople, peopleError, refreshPeople, authed, signIn, signUp, refreshPosts, loadingPosts, postsError, loadComments, addComment, setMe, completeOnboarding, likePerson, passPerson, undoSwipe, markSeen, sendMessage, togglePostLike, addPost, update, resetAll, deleteAccount, likesRemaining, useInstantChat, addPhoto, removePhoto, setFilters, reactToMessage, activateBoost, blockPerson, reportPerson, unmatchPerson, pauseProfile, sendRose, recordWeMet, toggleMute, unveilFor, isUnveiled, veilStateFor, askToUnveil, setChaperone, toggleRsvp, markProfileRead, setCompatQuestion, needsAnswer, refreshLikes, clearPendingMatch, addDhikr, resetDhikr, claimDhikrGift]);

  return <MuzzContext.Provider value={value}>{children}</MuzzContext.Provider>;
}

