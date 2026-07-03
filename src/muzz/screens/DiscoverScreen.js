import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withSpring,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE, gradVariantFor } from '../theme';
import { useMuzz, getPerson } from '../store';
import { PEOPLE } from '../data';
import { rankMatches } from '../butterfly';
import { PhotoTile, Verified, GButton } from '../components/ui';
import Stories from '../components/Stories';
import Butterfly from '../components/Butterfly';
import * as H from '../haptics';

const matchesFilters = (p, f) => {
  if (!f) return true;
  if (p.distance > f.maxDistance) return false;
  if (p.age < f.ageMin || p.age > f.ageMax) return false;
  if (f.sect !== 'Any' && p.sect !== f.sect) return false;
  if (f.prayerLevel !== 'Any' && p.prayerLevel !== f.prayerLevel) return false;
  if (f.ethnicity !== 'Any' && p.ethnicity !== f.ethnicity) return false;
  if (f.verifiedOnly && !p.verified) return false;
  return true;
};

const { width, height } = Dimensions.get('window');
const CARD_W = width - SPACE.lg * 2;

// Muzz-style discovery: a full-screen card stack with circular action
// buttons. The AI butterfly pre-sorts the deck by compatibility, so the
// best match is always on top — swiping is optional, not required.
export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const muzz = useMuzz();
  const {
    me, feedback, matches, butterflyAuto, filters, superLikes, boostUntil,
    likePerson, passPerson, undoSwipe, likesRemaining, useInstantChat, activateBoost, update,
  } = muzz;
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lastSwiped, setLastSwiped] = useState(null);
  const [superTarget, setSuperTarget] = useState(null);
  const [superNote, setSuperNote] = useState('');
  const [showBoost, setShowBoost] = useState(false);
  const [now, setNow] = useState(Date.now());

  const boostActive = boostUntil > now;
  useEffect(() => {
    if (!boostActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [boostActive]);

  const stack = useMemo(
    () => rankMatches(me, feedback).filter(
      (m) => feedback[m.person.id] !== 'liked' && !matches.includes(m.person.id)
        && matchesFilters(m.person, filters)
    ),
    [me, feedback, matches, filters]
  );
  const top = stack[0];
  const next = stack[1];

  const onlinePeople = useMemo(
    () => PEOPLE.filter((p) => p.online && !matches.includes(p.id)).slice(0, 8),
    [matches]
  );

  const sendSuperLike = () => {
    if (!superTarget) return;
    if (!me.gold && superLikes <= 0) { setSuperTarget(null); navigation.navigate('MuzzGold'); return; }
    const t = superTarget;
    if (!me.gold) update((s) => ({ ...s, superLikes: Math.max(0, s.superLikes - 1) }));
    likePerson(t.id, { mutual: true });
    setSuperTarget(null);
    setSuperNote('');
    H.success();
    navigation.navigate('MuzzMatchReveal', { personId: t.id, score: 99, superLike: true });
  };

  const doBoost = () => {
    activateBoost();
    setShowBoost(false);
    H.success();
  };
  const boostLeft = boostActive ? Math.ceil((boostUntil - now) / 60000) : 0;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const commit = useCallback((dir, personId, score) => {
    setLastSwiped(personId);
    setPhotoIdx(0);
    if (dir > 0) {
      likePerson(personId, { mutual: true });
      navigation.navigate('MuzzMatchReveal', { personId, score });
    } else {
      passPerson(personId);
    }
    tx.value = 0;
    ty.value = 0;
  }, [likePerson, passPerson, navigation]);

  // Called when a drag ends: decide fling vs spring-back, with the
  // like-limit gate applied before committing a right swipe.
  const finishDrag = useCallback((translationX, velocityX) => {
    const shouldFling = Math.abs(translationX) > width * 0.28 || Math.abs(velocityX) > 900;
    const dir = translationX > 0 ? 1 : -1;
    if (!shouldFling || !top) {
      tx.value = withSpring(0, { damping: 16, stiffness: 160 });
      ty.value = withSpring(0, { damping: 16, stiffness: 160 });
      return;
    }
    if (dir > 0 && likesRemaining() <= 0) {
      tx.value = withSpring(0, { damping: 16, stiffness: 160 });
      ty.value = withSpring(0, { damping: 16, stiffness: 160 });
      H.warn();
      navigation.navigate('MuzzGold');
      return;
    }
    H.press();
    const { id } = top.person;
    const score = top.score;
    tx.value = withTiming(dir * width * 1.4, { duration: 240, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(commit)(dir, id, score);
    });
  }, [top, likesRemaining, commit, navigation]);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-18, 18])
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.12;
    })
    .onEnd((e) => {
      runOnJS(finishDrag)(e.translationX, e.velocityX);
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
    if (!top) return;
    if (dir > 0 && likesRemaining() <= 0) {
      H.warn();
      navigation.navigate('MuzzGold');
      return;
    }
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

  const remaining = likesRemaining();

  return (
    <View style={styles.container}>
      {/* Muzz-style header: lowercase serif wordmark + actions */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.wordmark}>butterfly</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzButterflyPicks'); }} style={styles.aiBtn}>
            <Ionicons name="sparkles" size={15} color={M.butterfly} />
            <Text style={styles.aiBtnText}>AI picks</Text>
          </Pressable>
          <Pressable onPress={() => { H.tap(); setShowBoost(true); }} style={styles.iconBtn}>
            <Ionicons name={boostActive ? 'flash' : 'flash-outline'} size={23} color={boostActive ? M.primary : M.text} />
          </Pressable>
          <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzFilters'); }} style={styles.iconBtn}>
            <Ionicons name="options-outline" size={24} color={M.text} />
          </Pressable>
        </View>
      </View>

      {/* Stories / moments rail */}
      <Stories people={onlinePeople} me={me} />

      {boostActive ? (
        <Animated.View entering={FadeInUp} style={styles.boostBanner}>
          <Ionicons name="flash" size={14} color="#fff" />
          <Text style={styles.boostText}>You're boosted — top of the deck for {boostLeft} min</Text>
        </Animated.View>
      ) : butterflyAuto && top ? (
        <View style={styles.autoChip}>
          <Ionicons name="sparkles" size={12} color={M.butterfly} />
          <Text style={styles.autoChipText}>Sorted by your butterfly — top pick {top.score}% compatible</Text>
        </View>
      ) : null}

      {/* Card stack */}
      <View style={styles.deck}>
        {!top ? (
          <Animated.View entering={FadeIn} style={styles.empty}>
            <Butterfly size={120} />
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptySub}>New people join every day. Your butterfly will keep searching for you.</Text>
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
                  <Text style={[styles.stampText, { color: '#2ECC71' }]}>LIKE</Text>
                </Animated.View>
                <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]} pointerEvents="none">
                  <Text style={[styles.stampText, { color: '#FF5A5F' }]}>NOPE</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </>
        )}
      </View>

      {/* Muzz-style circular action buttons: rewind · pass · super · instant · like */}
      {top && (
        <View style={styles.actions}>
          <Pressable onPress={rewind} style={({ pressed }) => [styles.actBtn, styles.rewindBtn, !lastSwiped && { opacity: 0.4 }, pressed && styles.pressed]}>
            <Ionicons name="arrow-undo" size={20} color={M.gold} />
          </Pressable>
          <Pressable onPress={() => swipe(-1)} style={({ pressed }) => [styles.actBtn, styles.passBtn, pressed && styles.pressed]}>
            <Ionicons name="close" size={30} color="#B9B6C3" />
          </Pressable>
          <Pressable onPress={() => { H.press(); setSuperTarget(top.person); }} style={({ pressed }) => [styles.actBtn, styles.superBtn, pressed && styles.pressed]}>
            <Ionicons name="star" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={instant} style={({ pressed }) => [styles.actBtn, styles.instantBtn, pressed && styles.pressed]}>
            <Ionicons name="flash" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={() => swipe(1)} style={({ pressed }) => [styles.actBtn, styles.likeBtn, pressed && styles.pressed]}>
            <Ionicons name="heart" size={30} color="#fff" />
          </Pressable>
        </View>
      )}
      {top && (
        <Text style={styles.likesLeft}>
          {me.gold ? 'Unlimited likes · Gold' : `${remaining} likes · ${superLikes} super likes left`}
        </Text>
      )}

      {/* Super Like note sheet */}
      <Modal visible={!!superTarget} transparent animationType="fade" onRequestClose={() => setSuperTarget(null)}>
        <Pressable style={styles.sheetBg} onPress={() => setSuperTarget(null)}>
          <Animated.View entering={FadeInUp} style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.superIcon}><Ionicons name="star" size={28} color="#fff" /></View>
            <Text style={styles.sheetTitle}>Super Like {superTarget?.name}</Text>
            <Text style={styles.sheetSub}>Stand out from the crowd — Super Likes are 3x more likely to match. Add a note to say why.</Text>
            <TextInput
              value={superNote} onChangeText={setSuperNote}
              placeholder={`Hey ${superTarget?.name || ''}, your profile caught my eye because…`}
              placeholderTextColor={M.textMuted} multiline style={styles.sheetInput}
            />
            <GButton label="Send Super Like" icon="star" gradient={[M.blue, '#2C6FD6']} onPress={sendSuperLike} style={{ alignSelf: 'stretch' }} />
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
    </View>
  );
}

function Card({ m, photoIdx = 0 }) {
  const p = m.person;
  const photoCount = p.photos?.length || 3;
  return (
    <PhotoTile
      seed={p.id} name={p.name} rounded={RADIUS.xl} style={styles.card}
      uri={p.photos?.[photoIdx]}
      gradient={gradVariantFor(p.id, photoIdx)} silhouette={300}
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
      {p.online && (
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online now</Text>
        </View>
      )}
      <View style={styles.aiBadge}>
        <Ionicons name="sparkles" size={11} color="#fff" />
        <Text style={styles.aiBadgeText}>{m.score}%</Text>
      </View>
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
  deck: { flex: 1, marginHorizontal: SPACE.lg, marginBottom: 6 },
  cardWrap: { ...StyleSheet.absoluteFillObject },
  card: { flex: 1, ...SHADOW.card },
  pager: {
    position: 'absolute', top: 8, left: 14, right: 14,
    flexDirection: 'row', gap: 5,
  },
  pagerSeg: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  pagerSegOn: { backgroundColor: '#fff' },
  onlinePill: {
    position: 'absolute', top: 20, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(13,10,18,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: M.online },
  onlineText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  aiBadge: {
    position: 'absolute', top: 20, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139,92,246,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill,
  },
  aiBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  cardInfo: { position: 'absolute', left: 18, right: 18, bottom: 18 },
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
  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    paddingTop: 10, paddingBottom: 2,
  },
  actBtn: { alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  pressed: { transform: [{ scale: 0.88 }] },
  rewindBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', borderWidth: 1, borderColor: M.border },
  passBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', borderWidth: 1, borderColor: M.border },
  superBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: M.blue, ...SHADOW.card },
  instantBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: M.gold, ...SHADOW.card },
  likeBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: M.primary, ...SHADOW.primary },
  likesLeft: { ...TYPE.caption, color: M.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 8 },
  boostBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill,
    backgroundColor: M.primary, marginBottom: 6,
  },
  boostText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
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
  likeStamp: { left: 22, borderColor: '#2ECC71', transform: [{ rotate: '-14deg' }] },
  nopeStamp: { right: 22, borderColor: '#FF5A5F', transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
});
