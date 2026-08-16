import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Modal, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withSpring,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE, gradVariantFor } from '../theme';
import { useMuzz, getPerson } from '../store';
import { rankMatches } from '../butterfly';
import { veilNoteFor } from '../data';
import { SIMULATED_FEATURES } from '../config';
import { PhotoTile, Verified, GButton, VeilBadge } from '../components/ui';
import { AnswerSheet } from '../components/CompatQuestion';
import Stories from '../components/Stories';
import { VeiledMark } from '../components/VeiledMark';
import { RoseGrow, PetalFall, RoseMark } from '../components/RoseBloom';
import PrayerBar from '../components/PrayerBar';
import * as H from '../haptics';

// An unset filter must never exclude anyone: treat missing/'Any' as no
// filter, so a partially-populated `filters` object can't empty the deck.
const active = (v) => v != null && v !== 'Any' && v !== '';

const matchesFilters = (p, f) => {
  if (!f) return true;
  // Passport: when a city is chosen, discover there and ignore distance.
  if (active(f.passportCity)) { if ((p.city || '') !== f.passportCity) return false; }
  else if (active(f.maxDistance) && p.distance > f.maxDistance) return false;
  if (active(f.ageMin) && p.age < f.ageMin) return false;
  if (active(f.ageMax) && p.age > f.ageMax) return false;
  if (active(f.veil) && p.veil !== f.veil) return false;
  if (active(f.sect) && p.sect !== f.sect) return false;
  if (active(f.prayerLevel) && p.prayerLevel !== f.prayerLevel) return false;
  if (active(f.ethnicity) && p.ethnicity !== f.ethnicity) return false;
  if (f.verifiedOnly && !p.verified) return false;
  return true;
};

const { width, height } = Dimensions.get('window');
const CARD_W = width - SPACE.lg * 2;

// Whether the card is showing her face or standing in for it. The rose
// animation and the card note both key off this.
const isFaceless = (p, idx = 0) => !!p.photoVeiled || !(p.photos && p.photos[idx]);

// The rose is drawn over a photo here, so the line has to be the light
// one — its usual near-black would vanish into a dark card.
const DECK_INK = '#FFF1E8';
const DECK_FILL = '#B3243F';

// Muzz-style discovery: a full-screen card stack with circular action
// buttons. The AI butterfly pre-sorts the deck by compatibility, so the
// best match is always on top — swiping is optional, not required.
export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const muzz = useMuzz();
  const {
    me, feedback, matches, butterflyAuto, filters, superLikes, boostUntil,
    likePerson, passPerson, undoSwipe, likesRemaining, useInstantChat, activateBoost, update,
    needsAnswer, people, loadingPeople, peopleError, refreshPeople, demoMode,
    pendingMatch, clearPendingMatch, sendRose, roses,
  } = muzz;

  // A match the server confirmed after the fact — she liked you while
  // you were swiping, so the like didn't look mutual when you sent it.
  useEffect(() => {
    if (!pendingMatch) return;
    const personId = pendingMatch;
    clearPendingMatch();
    navigation.navigate('MuzzMatchReveal', { personId, score: 90 });
  }, [pendingMatch]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lastSwiped, setLastSwiped] = useState(null);
  const [superTarget, setSuperTarget] = useState(null);
  const [superNote, setSuperNote] = useState('');
  // A like from the deck held back until her question is answered:
  // { person, kind }.
  const [answering, setAnswering] = useState(null);
  const [showBoost, setShowBoost] = useState(false);
  const [now, setNow] = useState(Date.now());
  // A Rose in flight: the animation plays over her card, and the Rose is
  // only sent when it finishes — so she's still on screen to receive it.
  const [bloom, setBloom] = useState(null);
  const [deckSize, setDeckSize] = useState({ w: CARD_W, h: height * 0.7 });

  const boostActive = boostUntil > now;
  useEffect(() => {
    if (!boostActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [boostActive]);

  const stack = useMemo(
    () => rankMatches(me, feedback, people).filter(
      (m) => feedback[m.person.id] !== 'liked' && !matches.includes(m.person.id)
        && matchesFilters(m.person, filters)
    ),
    [me, feedback, matches, filters, people]
  );
  const top = stack[0];
  const next = stack[1];

  const onlinePeople = useMemo(
    () => people.filter((p) => p.online && !matches.includes(p.id)).slice(0, 8),
    [people, matches]
  );

  // Top Picks: your highest-compatibility candidates, highlighted. Gold
  // sees them all; free members see a couple and a locked count.
  const topPicks = useMemo(
    () => stack.slice(0, 8).map((m) => m.person),
    [stack]
  );
  const freePicks = 2;

  // Swipe Surge: a real spike in activity — a count of who is actually
  // online right now, so the banner stays hidden when nobody is.
  const activeNow = useMemo(() => people.filter((p) => p.online).length, [people]);
  const surging = activeNow >= 4;

  // The standout action from the deck is a Rose — so it spends a Rose,
  // through the same path as Roses everywhere else. Every Rose, however
  // it was sent, runs the gates here and then blooms on her card.
  const beginRose = useCallback((person, { comment = null, answer = null } = {}) => {
    if (!person || bloom) return;
    if (!me.gold && (roses || 0) <= 0) { H.warn(); navigation.navigate('MuzzGold'); return; }
    // Her question gates a Rose too, and is checked before it is spent.
    if (!answer && needsAnswer(person.id)) { H.tap(); setAnswering({ person, kind: 'rose', comment }); return; }
    H.press();
    setBloom({ person, comment, answer, faceless: isFaceless(person, person.id === top?.person?.id ? photoIdx : 0) });
  }, [bloom, me.gold, roses, needsAnswer, navigation, top, photoIdx]);

  // The bloom finished — send it for real and let the deck move on.
  const finishRose = useCallback(() => {
    const b = bloom;
    setBloom(null);
    if (!b) return;
    const { ok, matched } = sendRose(b.person.id, {
      comment: b.comment || null, contentType: 'profile', contentRef: 'profile', answer: b.answer,
    });
    if (!ok) return;
    setLastSwiped(b.person.id);
    setPhotoIdx(0);
    H.success();
    if (matched) navigation.navigate('MuzzMatchReveal', { personId: b.person.id, score: 99, rose: true });
  }, [bloom, sendRose, navigation]);

  const sendDeckRose = () => {
    if (!superTarget) return;
    const t = superTarget;
    const note = superNote.trim() || null;
    setSuperTarget(null);
    setSuperNote('');
    beginRose(t, { comment: note });
  };

  const doBoost = () => {
    activateBoost();
    setShowBoost(false);
    H.success();
  };
  const boostLeft = boostActive ? Math.ceil((boostUntil - now) / 60000) : 0;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  // A like only opens the match screen when it actually matched — that
  // is, when she had already liked you. Otherwise the like goes to her
  // and the deck moves on.
  const commit = useCallback((dir, personId, score, answer = null) => {
    setLastSwiped(personId);
    setPhotoIdx(0);
    if (dir > 0) {
      const matched = likePerson(personId, { answer });
      if (matched) navigation.navigate('MuzzMatchReveal', { personId, score });
    } else {
      passPerson(personId);
    }
    tx.value = 0;
    ty.value = 0;
  }, [likePerson, passPerson, navigation]);

  // She set a Compatibility Question and hasn't liked him: hold the card
  // and ask. Returns true when the like was intercepted.
  const askFirst = useCallback((person, kind = 'like') => {
    if (!needsAnswer(person.id)) return false;
    tx.value = withSpring(0, { damping: 16, stiffness: 160 });
    ty.value = withSpring(0, { damping: 16, stiffness: 160 });
    H.tap();
    setAnswering({ person, kind });
    return true;
  }, [needsAnswer]);

  // Answer written — run the like it was holding.
  const onAnswer = useCallback((text) => {
    const pending = answering;
    setAnswering(null);
    if (!pending) return;
    const { person, kind } = pending;
    if (kind === 'rose') {
      beginRose(person, { comment: pending.comment || null, answer: text });
      return;
    }
    const entry = stack.find((m) => m.person.id === person.id);
    commit(1, person.id, entry ? entry.score : 90, text);
  }, [answering, stack, commit, beginRose]);

  // Called when a drag ends: decide fling vs spring-back, with the
  // like-limit gate applied before committing a right swipe.
  const finishDrag = useCallback((translationX, velocityX, translationY, velocityY) => {
    const springBack = () => {
      tx.value = withSpring(0, { damping: 16, stiffness: 160 });
      ty.value = withSpring(0, { damping: 16, stiffness: 160 });
    };
    // Up is a Rose. The card springs back rather than flying off, so she
    // is still there for the rose to open beside.
    if (bloom) { springBack(); return; }
    const flungUp = translationY < -height * 0.14 || velocityY < -1000;
    if (top && flungUp && Math.abs(translationY) > Math.abs(translationX)) {
      springBack();
      beginRose(top.person);
      return;
    }
    const shouldFling = Math.abs(translationX) > width * 0.28 || Math.abs(velocityX) > 900;
    const dir = translationX > 0 ? 1 : -1;
    if (!shouldFling || !top) {
      springBack();
      return;
    }
    if (dir > 0 && likesRemaining() <= 0) {
      tx.value = withSpring(0, { damping: 16, stiffness: 160 });
      ty.value = withSpring(0, { damping: 16, stiffness: 160 });
      H.warn();
      navigation.navigate('MuzzGold');
      return;
    }
    if (dir > 0 && askFirst(top.person)) return;
    H.press();
    const { id } = top.person;
    const score = top.score;
    tx.value = withTiming(dir * width * 1.4, { duration: 240, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(commit)(dir, id, score);
    });
  }, [top, likesRemaining, commit, navigation, askFirst, beginRose, bloom]);

  // Both axes are live: sideways is like/pass, up is a Rose. A drag that
  // is mostly vertical follows your finger properly instead of being
  // damped, so the up-swipe feels like one.
  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .activeOffsetY([-16, 24])
    .onUpdate((e) => {
      const upward = e.translationY < 0 && Math.abs(e.translationY) > Math.abs(e.translationX);
      tx.value = upward ? e.translationX * 0.3 : e.translationX;
      ty.value = upward ? e.translationY : e.translationY * 0.12;
    })
    .onEnd((e) => {
      runOnJS(finishDrag)(e.translationX, e.velocityX, e.translationY, e.velocityY);
    });

  const rewind = () => {
    if (!lastSwiped) return;
    if (!me.gold) {
      H.warn();
      navigation.navigate('MuzzGold');
      return;
    }
    H.press();
    undoSwipe(lastSwiped);
    setLastSwiped(null);
  };

  const swipe = (dir) => {
    if (!top || bloom) return;
    if (dir > 0 && likesRemaining() <= 0) {
      H.warn();
      navigation.navigate('MuzzGold');
      return;
    }
    if (dir > 0 && askFirst(top.person)) return;
    H.press();
    const { id } = top.person;
    const score = top.score;
    tx.value = withTiming(dir * width * 1.3, { duration: 280, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(commit)(dir, id, score);
    });
  };

  const instant = () => {
    if (!top) return;
    if (useInstantChat(top.person.id)) {
      H.success();
      navigation.navigate('MuzzChat', { personId: top.person.id });
    } else {
      H.warn();
      navigation.navigate('MuzzGold');
    }
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-width, 0, width], [-11, 0, 11])}deg` },
    ],
  }));
  const nextStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.abs(tx.value) / width);
    return { transform: [{ scale: 0.94 + p * 0.06 }, { translateY: 14 - p * 14 }] };
  });
  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, width * 0.18], [0, 1], 'clamp'),
  }));
  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-width * 0.18, 0], [1, 0], 'clamp'),
  }));
  // Tells you what the up-swipe is about to do before you let go.
  const roseStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [-height * 0.13, -24], [1, 0], 'clamp'),
  }));

  const remaining = likesRemaining();

  return (
    <View style={styles.container}>
      {/* Muzz-style header: lowercase serif wordmark + actions */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.wordmark}>veiled</Text>
        <View style={styles.headerRight}>
          {SIMULATED_FEATURES && (
            <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzVoice'); }} style={styles.aiBtn}>
              <Ionicons name="mic" size={15} color={M.butterfly} />
              <Text style={styles.aiBtnText}>Voice</Text>
            </Pressable>
          )}
          <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzButterflyPicks'); }} style={styles.aiBtn}>
            <Ionicons name="sparkles" size={15} color={M.butterfly} />
            <Text style={styles.aiBtnText}>AI picks</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Standouts" onPress={() => { H.tap(); navigation.navigate('MuzzStandouts'); }} style={styles.iconBtn}>
            <Ionicons name="rose-outline" size={23} color={M.rose} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Boost my profile" onPress={() => { H.tap(); setShowBoost(true); }} style={styles.iconBtn}>
            <Ionicons name={boostActive ? 'flash' : 'flash-outline'} size={23} color={boostActive ? M.primary : M.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => { H.tap(); navigation.navigate('MuzzFilters'); }} style={styles.iconBtn}>
            <Ionicons name="options-outline" size={24} color={M.text} />
          </Pressable>
        </View>
      </View>

      {/* Demo builds say so, on screen, always. Sample profiles must
          never be mistaken for members. */}
      {demoMode && (
        <View style={styles.demoBar}>
          <Ionicons name="construct-outline" size={13} color={M.text} />
          <Text style={styles.demoBarText}>Demo build — these profiles are samples, not real members</Text>
        </View>
      )}

      {/* The deck is the screen. Everything that used to sit here —
          a stories rail, a surge banner, a Top Picks row that was just
          the same deck shrunk down, a Standouts strip, prayer times —
          pushed the card into the bottom third. Those live behind the
          header buttons now. */}
      {/* Next salah — small, and worth keeping in view. Tapping it
          opens the tasbih. */}
      <PrayerBar onPress={() => navigation.navigate('MuzzDhikr')} />

      {boostActive && (
        <Animated.View entering={FadeInUp} style={styles.boostBanner}>
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={styles.boostText}>You're boosted — top of the deck for {boostLeft} min</Text>
        </Animated.View>
      )}

      {/* Card stack */}
      <View
        style={styles.deck}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setDeckSize((s) => (s.w === w && s.h === h ? s : { w, h }));
        }}
      >
        {!top ? (
          <Animated.View entering={FadeIn} style={styles.empty}>
            <VeiledMark size={130} />
            {/* Say which of these it actually is. "You're all caught up"
                over an empty deck that failed to load is a lie. */}
            {loadingPeople ? (
              <>
                <Text style={styles.emptyTitle}>Finding people near you</Text>
                <Text style={styles.emptySub}>One moment — your matchmaker is looking.</Text>
              </>
            ) : peopleError ? (
              <>
                <Text style={styles.emptyTitle}>Can't reach Veiled</Text>
                <Text style={styles.emptySub}>Check your connection and try again.</Text>
                <Pressable onPress={() => { H.tap(); refreshPeople(); }} style={styles.retry}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </>
            ) : people.length === 0 ? (
              <>
                <Text style={styles.emptyTitle}>No one here yet</Text>
                <Text style={styles.emptySub}>Veiled is new in your area. Complete your profile and you'll be among the first people see.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>You're all caught up</Text>
                <Text style={styles.emptySub}>You've seen everyone matching your filters. Widen them, or check back as people join.</Text>
                <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzFilters'); }} style={styles.retry}>
                  <Text style={styles.retryText}>Adjust filters</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        ) : (
          <>
            {next && (
              <Animated.View style={[styles.cardWrap, nextStyle]} pointerEvents="none">
                <Card m={next} />
              </Animated.View>
            )}
            <GestureDetector gesture={pan}>
              <Animated.View key={top.person.id} style={[styles.cardWrap, cardStyle]}>
                <Card m={top} photoIdx={photoIdx} />
                {/* photo pager tap zones: left = prev photo, right = next, centre = profile */}
                <View style={StyleSheet.absoluteFill}>
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    <Pressable style={{ flex: 1 }} onPress={() => { H.select(); setPhotoIdx((i) => Math.max(0, i - 1)); }} />
                    <Pressable style={{ flex: 1.2 }} onPress={() => { H.tap(); navigation.navigate('MuzzProfileDetail', { personId: top.person.id }); }} />
                    <Pressable style={{ flex: 1 }} onPress={() => { H.select(); setPhotoIdx((i) => Math.min((top.person.photos?.length || 3) - 1, i + 1)); }} />
                  </View>
                </View>
                {/* swipe stamps */}
                <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]} pointerEvents="none">
                  <Text style={[styles.stampText, { color: '#111111' }]}>LIKE</Text>
                </Animated.View>
                <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]} pointerEvents="none">
                  <Text style={[styles.stampText, { color: '#9A9AA0' }]}>NOPE</Text>
                </Animated.View>
                <Animated.View style={[styles.roseStamp, roseStampStyle]} pointerEvents="none">
                  <Ionicons name="rose" size={20} color="#fff" />
                  <Text style={styles.roseStampText}>ROSE</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </>
        )}

        {/* The Rose, opening on her card. Veiled cards get the whole
            plant beside her; a card showing her face gets petals, so
            nothing is drawn over it. */}
        {bloom ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {bloom.faceless ? (
              <RoseGrow style={styles.bloomBeside} ink={DECK_INK} fill={DECK_FILL} onDone={finishRose} />
            ) : (
              <PetalFall width={deckSize.w} height={deckSize.h} ink={DECK_INK} fill={DECK_FILL} onDone={finishRose} />
            )}
          </View>
        ) : null}
      </View>

      {/* Actions float over the bottom of the card, with the likes
          counter tucked under them, so the photo keeps the whole
          screen instead of sharing it with a toolbar. */}
      {top && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Rewind last swipe" onPress={rewind} style={({ pressed }) => [styles.actBtn, styles.rewindBtn, !lastSwiped && { opacity: 0.4 }, pressed && styles.pressed]}>
              <Ionicons name="arrow-undo" size={20} color={M.gold} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Pass" onPress={() => swipe(-1)} style={({ pressed }) => [styles.actBtn, styles.passBtn, pressed && styles.pressed]}>
              <Ionicons name="close" size={30} color="#B9B6C3" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Send a Rose" onPress={() => { H.press(); setSuperTarget(top.person); }} style={({ pressed }) => [styles.actBtn, styles.roseBtn, pressed && styles.pressed]}>
              <Ionicons name="rose" size={24} color="#fff" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Instant chat" onPress={instant} style={({ pressed }) => [styles.actBtn, styles.instantBtn, pressed && styles.pressed]}>
              <Ionicons name="flash" size={22} color={M.textOnPrimary} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Like" onPress={() => swipe(1)} style={({ pressed }) => [styles.actBtn, styles.likeBtn, pressed && styles.pressed]}>
              <Ionicons name="heart" size={30} color={M.textOnPrimary} />
            </Pressable>
          </View>
          <Text style={styles.likesLeft}>
            {me.gold
              ? 'Unlimited likes · Gold'
              : `${remaining} ${remaining === 1 ? 'like' : 'likes'} · ${roses || 0} ${(roses || 0) === 1 ? 'rose' : 'roses'} left`}
          </Text>
        </View>
      )}

      {/* Super Like note sheet */}
      <Modal visible={!!superTarget} transparent animationType="fade" onRequestClose={() => setSuperTarget(null)}>
        <Pressable style={styles.sheetBg} onPress={() => setSuperTarget(null)}>
          <Animated.View entering={FadeInUp} style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <RoseMark size={92} />
            <Text style={styles.sheetTitle}>Send {superTarget?.name} a Rose</Text>
            <Text style={styles.sheetSub}>A Rose reaches her first and says you mean it. Add a note if you'd like.</Text>
            <TextInput
              value={superNote} onChangeText={setSuperNote}
              placeholder={`Hey ${superTarget?.name || ''}, your profile caught my eye because…`}
              placeholderTextColor={M.textMuted} multiline style={styles.sheetInput}
            />
            <GButton label="Send a Rose" icon="rose" gradient={[M.rose, M.roseDeep]} onPress={sendDeckRose} style={{ alignSelf: 'stretch' }} />
            <Pressable onPress={() => setSuperTarget(null)} style={{ marginTop: 12 }}><Text style={styles.sheetCancel}>Maybe later</Text></Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Boost sheet */}
      <Modal visible={showBoost} transparent animationType="fade" onRequestClose={() => setShowBoost(false)}>
        <Pressable style={styles.sheetBg} onPress={() => setShowBoost(false)}>
          <Animated.View entering={FadeInUp} style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={[styles.superIcon, { backgroundColor: M.primary }]}><Ionicons name="flash" size={28} color="#fff" /></View>
            <Text style={styles.sheetTitle}>{boostActive ? `Boosted for ${boostLeft} more min` : 'Boost your profile'}</Text>
            <Text style={styles.sheetSub}>Be one of the top profiles in your area for 30 minutes and get seen by up to 10x more people.</Text>
            {!boostActive && (
              <GButton label={`Boost now · ${me.gold ? 'Free with Gold' : '1 boost'}`} icon="flash" onPress={doBoost} style={{ alignSelf: 'stretch' }} />
            )}
            <Pressable onPress={() => setShowBoost(false)} style={{ marginTop: 12 }}><Text style={styles.sheetCancel}>Close</Text></Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Her Compatibility Question, holding the like until it's answered */}
      <AnswerSheet
        visible={!!answering}
        question={answering ? answering.person.compatQuestion : null}
        name={answering ? answering.person.name : ''}
        onClose={() => setAnswering(null)}
        onSend={onAnswer}
      />
    </View>
  );
}

function Card({ m, photoIdx = 0 }) {
  const p = m.person;
  const photoCount = p.photos?.length || 3;
  const faceless = isFaceless(p, photoIdx);
  return (
    <PhotoTile
      seed={p.id} name={p.name} rounded={RADIUS.xl} style={styles.card}
      uri={p.photos?.[photoIdx]}
      gradient={gradVariantFor(p.id, photoIdx)} figure={p.photoVeiled ? null : p.veil}
      pattern
      veiled={!!p.photoVeiled}
      veilLabel={`${p.name} keeps her photos veiled\nShe can unveil them when you match`}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'transparent', 'transparent', 'rgba(13,10,18,0.88)']}
        style={StyleSheet.absoluteFill}
      />
      {/* photo pager dots */}
      <View style={styles.pager}>
        {[...Array(Math.min(5, photoCount))].map((_, i) => (
          <View key={i} style={[styles.pagerSeg, i === photoIdx && styles.pagerSegOn]} />
        ))}
      </View>
      <View style={styles.topLeftCol}>
        <VeilBadge veil={p.veil} />
        {p.online && (
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online now</Text>
          </View>
        )}
      </View>
      <View style={styles.aiBadge}>
        <Ionicons name="sparkles" size={11} color="#fff" />
        <Text style={styles.aiBadgeText}>{m.score}%</Text>
      </View>
      {/* A line on the cards with no photo showing — hers if she wrote
          one, otherwise one of the set, chosen from her id. Sits above
          her head, tail pointing down at her. */}
      {faceless ? (
        <View style={styles.noteWrap} pointerEvents="none">
          <View style={styles.noteBubble}>
            <Text style={styles.noteText}>{veilNoteFor(p.id, p.cardNote)}</Text>
          </View>
          <View style={styles.noteTail} />
        </View>
      ) : null}

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{p.name}, {p.age}</Text>
          {p.verified && <View style={{ marginLeft: 8 }}><Verified size={18} /></View>}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="briefcase" size={13} color="rgba(255,255,255,0.92)" />
          <Text style={styles.metaText}>{p.job}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location" size={13} color="rgba(255,255,255,0.92)" />
          <Text style={styles.metaText}>{p.distance} miles away · {p.city}</Text>
        </View>
        <View style={styles.tagRow}>
          {[p.sect, p.prayerLevel, p.intention].filter(Boolean).map((t) => (
            <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
          ))}
        </View>
        {/* Say so up front — a like that suddenly asks for an essay is a
            worse experience than one you could see coming. */}
        {p.compatQuestion ? (
          <View style={styles.qRow}>
            <Ionicons name="help-circle" size={13} color="#fff" />
            <Text style={styles.qRowText} numberOfLines={1}>Asks a question before a like</Text>
          </View>
        ) : null}
      </View>
    </PhotoTile>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingBottom: 4,
  },
  wordmark: {
    fontSize: 30, fontWeight: '800', color: M.primary, letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: M.butterflySoft, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  aiBtnText: { color: M.butterfly, fontWeight: '800', fontSize: 13 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  autoChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.pill, backgroundColor: M.butterflySoft, marginBottom: 6,
  },
  autoChipText: { color: M.butterfly, fontWeight: '700', fontSize: 11.5 },
  deck: { flex: 1, marginHorizontal: SPACE.md, marginTop: 4, marginBottom: 4 },
  cardWrap: { ...StyleSheet.absoluteFillObject },
  card: { flex: 1, ...SHADOW.card },
  pager: {
    position: 'absolute', top: 8, left: 14, right: 14,
    flexDirection: 'row', gap: 5,
  },
  pagerSeg: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  pagerSegOn: { backgroundColor: '#fff' },
  topLeftCol: { position: 'absolute', top: 20, left: 14, alignItems: 'flex-start', gap: 6 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(13,10,18,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: M.online },
  onlineText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  surge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACE.lg, marginTop: 6,
    backgroundColor: M.primarySoft, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 8,
  },
  surgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: M.online },
  surgeText: { flex: 1, color: M.text, fontWeight: '700', fontSize: 12.5 },
  picksWrap: { marginTop: 10 },
  picksHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACE.lg, marginBottom: 8 },
  picksTitle: { ...TYPE.h3, fontSize: 15, flex: 0 },
  picksGold: { color: M.gold, fontWeight: '900', fontSize: 10, marginLeft: 4 },
  pick: { width: 76, height: 100, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: M.bgSoft },
  pickLock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pickName: { color: '#fff', fontWeight: '800', fontSize: 12, padding: 6 },
  standoutsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACE.lg, marginTop: 10, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, paddingHorizontal: 14, paddingVertical: 10 },
  standoutsText: { flex: 1, color: M.text, fontWeight: '700', fontSize: 12.5 },
  aiBadge: {
    position: 'absolute', top: 20, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(17,17,17,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill,
  },
  aiBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  // Clears the floating action row, which now sits over the card.
  cardInfo: { position: 'absolute', left: 18, right: 18, bottom: 104 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  metaText: { color: 'rgba(255,255,255,0.92)', fontWeight: '600', fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: RADIUS.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  tagText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  qRowText: { color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 12 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  actBtn: { alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  pressed: { transform: [{ scale: 0.88 }] },
  rewindBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: M.bgElevated, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)' },
  passBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: M.bgElevated, borderWidth: 1, borderColor: M.border },
  roseBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: M.rose, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', ...SHADOW.card },
  // A share of the card's height, not a fixed offset: her head sits at
  // the same fraction down the card whatever the screen, so the tail
  // meets it on a small phone and a large one alike.
  noteWrap: { position: 'absolute', left: 16, right: 16, top: '26%', alignItems: 'center' },
  noteBubble: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, maxWidth: '92%', ...SHADOW.card },
  noteText: { color: '#141018', fontSize: 15.5, fontWeight: '700', lineHeight: 21, textAlign: 'center' },
  noteTail: { width: 14, height: 14, marginTop: -7, backgroundColor: 'rgba(255,255,255,0.95)', transform: [{ rotate: '45deg' }] },
  instantBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: M.gold, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', ...SHADOW.card },
  likeBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: M.primary, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.95)', ...SHADOW.primary },
  likesLeft: { ...TYPE.caption, color: '#FFFFFF', textAlign: 'center', marginTop: 8, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  boostBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill,
    backgroundColor: M.primary, marginBottom: 6,
  },
  boostText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
  retry: { marginTop: 20, backgroundColor: M.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.pill },
  retryText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 15 },
  demoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: M.warnSoft || '#FFF4E5', paddingVertical: 7 },
  demoBarText: { color: M.text, fontWeight: '800', fontSize: 12 },
  emptyTitle: { ...TYPE.h1, marginTop: 14 },
  emptySub: { ...TYPE.soft, textAlign: 'center', marginTop: 8, fontSize: 15, lineHeight: 21 },
  sheetBg: { flex: 1, backgroundColor: M.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: M.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: SPACE.xl, paddingTop: 24, alignItems: 'center',
  },
  superIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: M.blue, alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  sheetTitle: { ...TYPE.h2, marginTop: 14, textAlign: 'center' },
  sheetSub: { ...TYPE.soft, textAlign: 'center', marginTop: 6, marginBottom: 16, fontSize: 14, lineHeight: 20 },
  sheetInput: {
    alignSelf: 'stretch', backgroundColor: M.bgInput, borderRadius: RADIUS.md,
    padding: 14, fontSize: 15, color: M.text, minHeight: 78, textAlignVertical: 'top', marginBottom: 16,
  },
  sheetCancel: { ...TYPE.body, color: M.textSoft, fontWeight: '700' },
  stamp: {
    position: 'absolute', top: 36, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  likeStamp: { left: 22, borderColor: '#111111', transform: [{ rotate: '-14deg' }] },
  nopeStamp: { right: 22, borderColor: '#9A9AA0', transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  roseStamp: {
    position: 'absolute', top: '44%', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: M.rose, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: RADIUS.pill, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', ...SHADOW.card,
  },
  roseStampText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1.5 },
  // The empty side of a veiled card. The drawing anchors to the bottom
  // of this box, which puts the flower head level with her face.
  bloomBeside: { position: 'absolute', right: 12, top: '12%', height: '58%', width: 132 },
});
