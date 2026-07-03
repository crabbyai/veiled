import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, FadeOut, ZoomIn, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing, interpolate,
} from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { dailyPick, rankMatches, compatLabel, butterflyLine } from '../butterfly';
import { GButton, PhotoTile, Verified, Avatar, Chip } from '../components/ui';
import Butterfly from '../components/Butterfly';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

export default function ButterflyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const muzz = useMuzz();
  const {
    me, feedback, seen, butterflyAuto, likePerson, passPerson, markSeen, update,
    superLikes, likesRemaining, useInstantChat,
  } = muzz;

  const [phase, setPhase] = useState('idle'); // idle | searching | reveal
  const [pick, setPick] = useState(null);

  const ranked = useMemo(() => rankMatches(me, feedback), [me, feedback]);
  const queueCount = useMemo(
    () => ranked.filter((m) => !seen.includes(m.person.id) && feedback[m.person.id] !== 'liked').length,
    [ranked, seen, feedback]
  );

  const fly = useCallback(() => {
    H.press();
    setPhase('searching');
    const next = dailyPick(me, feedback, seen);
    setTimeout(() => {
      if (next) {
        setPick(next);
        setPhase('reveal');
        markSeen(next.person.id);
        H.success();
      } else {
        setPhase('idle');
        H.warn();
      }
    }, 2300);
  }, [me, feedback, seen, markSeen]);

  const onLike = (superLike = false) => {
    if (!pick) return;
    if (likesRemaining() <= 0) {
      H.warn();
      navigation.navigate('MuzzGold');
      return;
    }
    likePerson(pick.person.id, { mutual: true });
    if (superLike && superLikes > 0) update((s) => ({ ...s, superLikes: s.superLikes - 1 }));
    H.success();
    navigation.navigate('MuzzMatchReveal', { personId: pick.person.id, score: pick.score });
    setPhase('idle');
    setPick(null);
  };

  const onInstantChat = () => {
    if (!pick) return;
    if (useInstantChat(pick.person.id)) {
      H.success();
      navigation.navigate('MuzzChat', { personId: pick.person.id });
      setPhase('idle');
      setPick(null);
    } else {
      H.warn();
      navigation.navigate('MuzzGold');
    }
  };

  const onPass = () => {
    if (!pick) return;
    passPerson(pick.person.id);
    H.tap();
    setPhase('idle');
    setPick(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FBF7FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color={M.text} />
            </Pressable>
          )}
          <View>
            <Text style={styles.brand}>Butterfly picks</Text>
            <Text style={styles.subBrand}>Your AI matchmaker</Text>
          </View>
        </View>
        <Pressable onPress={() => navigation.navigate('MuzzGold')} style={styles.goldBtn}>
          <Ionicons name="diamond" size={14} color={M.gold} />
          <Text style={styles.goldText}>Gold</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {phase === 'idle' && (
          <Animated.View entering={FadeIn} style={styles.stage}>
            <FloatBackdrop />
            <Butterfly size={150} />
            <Text style={styles.stageTitle}>
              {queueCount > 0 ? `${queueCount} matches waiting` : 'All caught up'}
            </Text>
            <Text style={styles.stageSub}>
              {queueCount > 0
                ? `I've been flying around ${me.city || 'the city'} and found people I think you'll love. Want to meet the best one?`
                : `I've shown you my top picks for now. Check back soon — I'm always searching.`}
            </Text>

            {/* auto-match toggle */}
            <Pressable
              onPress={() => { H.select(); update((s) => ({ ...s, butterflyAuto: !s.butterflyAuto })); }}
              style={styles.autoRow}
            >
              <View style={styles.autoLeft}>
                <Ionicons name="infinite" size={18} color={M.butterfly} />
                <Text style={styles.autoText}>Auto-match</Text>
              </View>
              <View style={[styles.toggle, butterflyAuto && styles.toggleOn]}>
                <View style={[styles.knob, butterflyAuto && styles.knobOn]} />
              </View>
            </Pressable>

            <GButton
              label={queueCount > 0 ? 'Let the butterfly fly' : 'Search again'}
              icon="sparkles"
              gradient={GRAD.butterfly}
              onPress={fly}
              style={{ alignSelf: 'stretch', marginTop: 18 }}
              disabled={queueCount === 0}
            />
            <Pressable onPress={() => navigation.navigate('MuzzExplore')} style={{ marginTop: 14 }}>
              <Text style={styles.linkText}>Or browse everyone yourself →</Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === 'searching' && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stage}>
            <SearchingFlight />
            <Text style={styles.stageTitle}>Searching…</Text>
            <SearchTicker />
          </Animated.View>
        )}

        {phase === 'reveal' && pick && (
          <Animated.View entering={FadeIn} style={{ paddingHorizontal: SPACE.xl }}>
            <Animated.View entering={FadeInDown} style={styles.bfSpeech}>
              <Butterfly size={56} />
              <Text style={styles.speechText}>"{butterflyLine(pick.score)}"</Text>
            </Animated.View>

            <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.card, SHADOW.card]}>
              <Pressable onPress={() => navigation.navigate('MuzzProfileDetail', { personId: pick.person.id })}>
                <PhotoTile seed={pick.person.id} name={pick.person.name} rounded={RADIUS.lg} style={{ height: width * 1.05 }}>
                  {/* compatibility badge */}
                  <View style={styles.compatBadge}>
                    <Text style={styles.compatScore}>{pick.score}%</Text>
                    <Text style={styles.compatLabel}>{compatLabel(pick.score)}</Text>
                  </View>
                  <LinearGradient colors={['transparent', 'rgba(20,16,26,0.0)', 'rgba(20,16,26,0.9)']} style={styles.cardGrad} />
                  <View style={styles.cardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cardName}>{pick.person.name}, {pick.person.age}</Text>
                      {pick.person.verified && <View style={{ marginLeft: 8 }}><Verified size={18} /></View>}
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="briefcase-outline" size={13} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.metaText}>{pick.person.job}</Text>
                      <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 10 }} />
                      <Text style={styles.metaText}>{pick.person.distance} mi · {pick.person.city}</Text>
                    </View>
                  </View>
                </PhotoTile>
              </Pressable>

              {/* Why the butterfly chose them */}
              <View style={styles.reasons}>
                <View style={styles.reasonsHead}>
                  <Ionicons name="bulb" size={15} color={M.butterfly} />
                  <Text style={styles.reasonsTitle}>Why I picked them</Text>
                </View>
                {pick.reasons.slice(0, 3).map((r, i) => (
                  <Animated.View key={i} entering={FadeInDown.delay(120 * i)} style={styles.reasonRow}>
                    <Ionicons name="checkmark-circle" size={16} color={M.success} />
                    <Text style={styles.reasonText}>{r}</Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>

            {/* actions */}
            <View style={styles.actions}>
              <Pressable onPress={onPass} style={[styles.actBtn, styles.passBtn]}>
                <Ionicons name="close" size={30} color={M.textSoft} />
              </Pressable>
              <Pressable onPress={() => onLike(true)} style={[styles.actBtn, styles.superBtn]}>
                <Ionicons name="star" size={24} color="#fff" />
              </Pressable>
              <Pressable onPress={() => onLike(false)} style={[styles.actBtn, styles.likeBtn]}>
                <Ionicons name="heart" size={30} color="#fff" />
              </Pressable>
            </View>

            {/* Instant Chat — Muzz signature: skip matching, chat right away */}
            <Pressable onPress={onInstantChat} style={styles.instantBtn}>
              <Ionicons name="flash" size={16} color={M.gold} />
              <Text style={styles.instantText}>
                Instant Chat{me.gold ? '' : ' · 1 free today'}
              </Text>
            </Pressable>

            {!me.gold && (
              <Text style={styles.likesLeft}>
                {likesRemaining()} of 5 free likes left · resets every 12h
              </Text>
            )}
            <Pressable onPress={fly} style={{ alignSelf: 'center', marginTop: 10 }}>
              <Text style={styles.linkText}>Not feeling it? Show me another →</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* "Coming up" preview row */}
        {phase === 'idle' && queueCount > 1 && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.upNext}>
            <Text style={styles.upNextTitle}>In your butterfly's sights</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.xl, gap: 12 }}>
              {ranked.filter((m) => !seen.includes(m.person.id)).slice(1, 7).map((m) => (
                <Pressable key={m.person.id} onPress={() => navigation.navigate('MuzzProfileDetail', { personId: m.person.id })}>
                  <PhotoTile seed={m.person.id} name={m.person.name} style={styles.upCard}>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.upBadge}><Text style={styles.upBadgeText}>{m.score}%</Text></View>
                    <Text style={styles.upName}>{m.person.name}</Text>
                  </PhotoTile>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// Floating dust particles behind the idle butterfly
function FloatBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(6)].map((_, i) => <Particle key={i} i={i} />)}
    </View>
  );
}
function Particle({ i }) {
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 3000 + i * 400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.5, 1], [0.15, 0.5, 0.15]),
    transform: [{ translateY: interpolate(v.value, [0, 1], [0, -30]) }],
  }));
  const left = 30 + i * 48;
  return <Animated.View style={[{ position: 'absolute', top: 60 + (i % 3) * 40, left, width: 8, height: 8, borderRadius: 4, backgroundColor: M.butterflyLight }, st]} />;
}

function SearchingFlight() {
  const v = useSharedValue(0);
  React.useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(v.value, [0, 0.25, 0.5, 0.75, 1], [-90, 60, -40, 80, -90]) },
      { translateY: interpolate(v.value, [0, 0.5, 1], [0, -24, 0]) },
      { rotate: `${interpolate(v.value, [0, 0.5, 1], [-12, 12, -12])}deg` },
    ],
  }));
  return (
    <View style={{ height: 160, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={st}><Butterfly size={120} /></Animated.View>
    </View>
  );
}

function SearchTicker() {
  const lines = [
    'Scanning verified profiles…',
    'Matching your interests…',
    'Weighing shared values…',
    'Checking who wants the same…',
    'Found someone special…',
  ];
  const [i, setI] = useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 440);
    return () => clearInterval(t);
  }, []);
  return (
    <Animated.Text key={i} entering={FadeIn} style={styles.stageSub}>{lines[i]}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: SPACE.xl, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4, marginLeft: -8 },
  brand: { fontSize: 26, fontWeight: '900', color: M.text, letterSpacing: -0.6 },
  subBrand: { ...TYPE.caption, color: M.butterfly, marginTop: 1 },
  goldBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7E0', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: '#F6E4A8' },
  goldText: { color: '#B8860B', fontWeight: '800', fontSize: 13 },
  stage: { alignItems: 'center', paddingTop: 30, paddingHorizontal: SPACE.xl, minHeight: 420, justifyContent: 'center' },
  stageTitle: { ...TYPE.h1, fontSize: 24, marginTop: 16, textAlign: 'center' },
  stageSub: { ...TYPE.soft, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, paddingHorizontal: 10 },
  autoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    alignSelf: 'stretch', backgroundColor: M.butterflySoft, borderRadius: RADIUS.md,
    padding: 16, marginTop: 26,
  },
  autoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  autoText: { ...TYPE.h3, color: M.text },
  toggle: { width: 50, height: 30, borderRadius: 15, backgroundColor: M.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: M.butterfly },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  linkText: { color: M.butterfly, fontWeight: '700', fontSize: 14 },
  bfSpeech: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  speechText: { flex: 1, ...TYPE.body, fontStyle: 'italic', color: M.textSoft, fontWeight: '600' },
  card: { backgroundColor: M.bgCard, borderRadius: RADIUS.lg, overflow: 'hidden' },
  cardGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  compatBadge: {
    position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(139,92,246,0.92)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, alignItems: 'center',
  },
  compatScore: { color: '#fff', fontWeight: '900', fontSize: 16 },
  compatLabel: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 10, marginTop: -1 },
  cardInfo: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  cardName: { color: '#fff', fontSize: 26, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13, marginLeft: 4 },
  reasons: { padding: 18 },
  reasonsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  reasonsTitle: { ...TYPE.h3, color: M.butterfly },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reasonText: { ...TYPE.body, flex: 1, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 22 },
  instantBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    alignSelf: 'center', marginTop: 16, paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: RADIUS.pill, backgroundColor: '#FFF7E0', borderWidth: 1, borderColor: '#F6E4A8',
  },
  instantText: { color: '#8A6D00', fontWeight: '800', fontSize: 13.5 },
  likesLeft: { ...TYPE.caption, color: M.textMuted, textAlign: 'center', marginTop: 12 },
  actBtn: { alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  passBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 1.5, borderColor: M.border },
  superBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: M.blue },
  likeBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: M.primary, ...SHADOW.primary },
  upNext: { marginTop: 20 },
  upNextTitle: { ...TYPE.h3, paddingHorizontal: SPACE.xl, marginBottom: 12 },
  upCard: { width: 110, height: 150, justifyContent: 'flex-end', padding: 10 },
  upBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(139,92,246,0.92)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  upBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  upName: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
