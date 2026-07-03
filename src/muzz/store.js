import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ME, SOCIAL_SEED, PEOPLE } from './data';
import * as api from './api';
import * as realtime from './realtime';
import { registerForPush, localNotify } from './notifications';

const KEY = '@muzz_state_v1';

const MuzzContext = createContext(null);
export const useMuzz = () => useContext(MuzzContext);

const initialState = {
  me: DEFAULT_ME,
  onboarded: false,
  feedback: {},        // { personId: 'liked' | 'passed' }
  matches: [],         // personIds that became matches
  likedYou: ['p2', 'p6', 'p9'], // people who liked you (for Likes tab)
  seen: [],            // butterfly-presented ids
  chats: {},           // { personId: [{id, text, sender, ts, read}] }
  posts: SOCIAL_SEED,
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
    sect: 'Any',
    prayerLevel: 'Any',
    ethnicity: 'Any',
    verifiedOnly: false,
  },
  // Free-tier limits (mirrors real Muzz: 5 likes / 12h, 1 instant chat / day)
  likeWindowStart: 0,
  likesInWindow: 0,
  instantChatDay: '',
  instantChatsUsed: 0,
};

export const FREE_LIKES_PER_WINDOW = 5;
export const LIKE_WINDOW_MS = 12 * 3600000;
export const FREE_INSTANT_CHATS_PER_DAY = 1;

export function MuzzProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setState((s) => ({ ...s, ...saved, me: { ...DEFAULT_ME, ...(saved.me || {}) } }));
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  // Connect the realtime channel once hydrated (no-op without a backend).
  useEffect(() => {
    if (!hydrated || !state.onboarded) return;
    realtime.connect({
      onMessage: (personId, text) => {
        const msg = { id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`, text, sender: 'them', ts: Date.now(), read: false };
        setState((s) => {
          const next = { ...s, chats: { ...s.chats, [personId]: [...(s.chats[personId] || []), msg] } };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
        localNotify('New message', text.slice(0, 100));
      },
      onMatch: (personId) => {
        setState((s) => {
          if (s.matches.includes(personId)) return s;
          const next = { ...s, matches: [...s.matches, personId], chats: s.chats[personId] ? s.chats : { ...s.chats, [personId]: [] } };
          AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      },
    });
    registerForPush();
    return () => realtime.disconnect();
  }, [hydrated, state.onboarded]);

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

  const completeOnboarding = useCallback((mePatch) => {
    update((s) => ({ ...s, onboarded: true, me: { ...s.me, ...mePatch, butterflyTrained: true } }));
    api.mirror(() => api.saveProfile({ ...DEFAULT_ME, ...mePatch }));
  }, [update]);

  const likePerson = useCallback((personId, { mutual = true } = {}) => {
    update((s) => {
      const feedback = { ...s.feedback, [personId]: 'liked' };
      const becameMatch = mutual && !s.matches.includes(personId);
      const matches = becameMatch ? [...s.matches, personId] : s.matches;
      const chats = becameMatch && !s.chats[personId]
        ? { ...s.chats, [personId]: [] }
        : s.chats;
      const seen = s.seen.includes(personId) ? s.seen : [...s.seen, personId];
      // Track the rolling 12h like window (free tier)
      const now = Date.now();
      const windowExpired = now - s.likeWindowStart > LIKE_WINDOW_MS;
      const likeWindowStart = windowExpired ? now : s.likeWindowStart;
      const likesInWindow = windowExpired ? 1 : s.likesInWindow + 1;
      return { ...s, feedback, matches, chats, seen, likeWindowStart, likesInWindow };
    });
    api.mirror(() => api.swipe(personId, 'like'));
  }, [update]);

  // Likes remaining in the current 12h window (Infinity on Gold)
  const likesRemaining = useCallback(() => {
    if (state.me.gold) return Infinity;
    if (Date.now() - state.likeWindowStart > LIKE_WINDOW_MS) return FREE_LIKES_PER_WINDOW;
    return Math.max(0, FREE_LIKES_PER_WINDOW - state.likesInWindow);
  }, [state.me.gold, state.likeWindowStart, state.likesInWindow]);

  // Instant Chat: skip matching, open a chat directly. 1 free per day.
  const useInstantChat = useCallback((personId) => {
    const today = new Date().toDateString();
    let allowed = false;
    update((s) => {
      const used = s.instantChatDay === today ? s.instantChatsUsed : 0;
      allowed = s.me.gold || used < FREE_INSTANT_CHATS_PER_DAY;
      if (!allowed) return s;
      return {
        ...s,
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

  // Rewind (Gold): undo the last like/pass so the card returns to the deck
  const undoSwipe = useCallback((personId) => {
    update((s) => {
      const feedback = { ...s.feedback };
      delete feedback[personId];
      return {
        ...s,
        feedback,
        matches: s.matches.filter((id) => id !== personId),
        seen: s.seen.filter((id) => id !== personId),
      };
    });
  }, [update]);

  const markSeen = useCallback((personId) => {
    update((s) => (s.seen.includes(personId) ? s : { ...s, seen: [...s.seen, personId], lastPickTs: Date.now() }));
  }, [update]);

  const sendMessage = useCallback((personId, text, sender = 'me') => {
    const msg = { id: `m${Date.now()}${Math.random().toString(36).slice(2, 6)}`, text, sender, ts: Date.now(), read: sender === 'me' };
    update((s) => ({
      ...s,
      chats: { ...s.chats, [personId]: [...(s.chats[personId] || []), msg] },
    }));
    if (sender === 'me') {
      api.mirror(async () => {
        const { matches: serverMatches } = await api.matches();
        const m = serverMatches.find((x) => api.toLocalId(x.person.id) === personId);
        if (m) await api.sendMessage(m.matchId, text);
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

  const togglePostLike = useCallback((postId) => {
    update((s) => {
      const cur = s.postLikes[postId];
      return { ...s, postLikes: { ...s.postLikes, [postId]: cur ? 0 : 1 } };
    });
  }, [update]);

  const addPost = useCallback((post) => {
    update((s) => ({ ...s, posts: [post, ...s.posts] }));
    api.mirror(() => api.createPost(post.text, post.tag, post.id));
  }, [update]);

  const resetAll = useCallback(() => persist(initialState), [persist]);

  const value = useMemo(() => ({
    ...state, hydrated,
    setMe, completeOnboarding, likePerson, passPerson, undoSwipe, markSeen,
    sendMessage, togglePostLike, addPost, update, resetAll,
    likesRemaining, useInstantChat,
    addPhoto, removePhoto, setFilters, reactToMessage, activateBoost, blockPerson,
  }), [state, hydrated, setMe, completeOnboarding, likePerson, passPerson, undoSwipe, markSeen, sendMessage, togglePostLike, addPost, update, resetAll, likesRemaining, useInstantChat, addPhoto, removePhoto, setFilters, reactToMessage, activateBoost, blockPerson]);

  return <MuzzContext.Provider value={value}>{children}</MuzzContext.Provider>;
}

export const getPerson = (id) => PEOPLE.find((p) => p.id === id);
