import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE, gradVariantFor } from '../theme';
import { useMuzz } from '../store';
import { rankMatches } from '../butterfly';
import { PhotoTile, VeilBadge, Verified, GButton } from '../components/ui';
import Butterfly from '../components/Butterfly';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

// ─── Voice matchmaking ──────────────────────────────────────────────
// No swiping, no browsing: you *talk* to your matchmaker about what you
// want, and it introduces exactly one person. (Answers are simulated
// voice notes in this build; a production build would transcribe with
// on-device speech recognition and feed the matching engine.)
const QUESTIONS = [
  `Bismillah — let's begin. Tell me about the home you hope to build. What does a good marriage look like to you?`,
  `Beautiful. And in a spouse — what matters more to you: how she practises her deen, or the life ambitions you'd share?`,
  `Last one. Describe the first meeting you'd want — wali present, of course. Where are you, and what are you talking about?`,
];

export default function VoiceMatchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, feedback, matches, likePerson } = useMuzz();
  const [convo, setConvo] = useState([]); // { id, from: 'ai'|'me', text?, secs? }
  const [qIdx, setQIdx] = useState(0);
  const [phase, setPhase] = useState('intro'); // intro | asking | recording | thinking | reveal
  const scrollRef = useRef(null);

  const pick = useMemo(
    () => rankMatches(me, feedback).filter((m) => !matches.includes(m.person.id))[0] || null,
    [me, feedback, matches]
  );

  const pushMsg = (msg) => setConvo((c) => [...c, { id: `v${c.length}${Date.now()}`, ...msg }]);

  const start = () => {
    H.press();
    setPhase('asking');
    setTimeout(() => { pushMsg({ from: 'ai', text: QUESTIONS[0] }); }, 400);
  };

  const answer = () => {
    if (phase !== 'asking') return;
    H.press();
    setPhase('recording');
    const secs = 6 + Math.floor(Math.random() * 14);
    setTimeout(() => {
      pushMsg({ from: 'me', secs });
      H.tap();
      const next = qIdx + 1;
      if (next < QUESTIONS.length) {
        setPhase('thinking');
        setTimeout(() => { pushMsg({ from: 'ai', text: QUESTIONS[next] }); setQIdx(next); setPhase('asking'); }, 1300);
      } else {
        setPhase('thinking');
        setTimeout(() => {
          pushMsg({ from: 'ai', text: `I've heard everything I need. There's someone I keep coming back to — let me introduce you.` });
          setTimeout(() => { setPhase('reveal'); H.success(); }, 1400);
        }, 1600);
      }
    }, 1800);
  };

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [convo.length, phase]);

  const introduce = () => {
    if (!pick) return;
    H.success();
    likePerson(pick.person.id, { mutual: true });
    navigation.replace('MuzzMatchReveal', { personId: pick.person.id, score: pick.score });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Voice matchmaking</Text>
          <Text style={styles.subtitle}>Talk — one introduction at a time</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {phase === 'intro' ? (
        <Animated.View entering={FadeIn} style={styles.intro}>
          <Butterfly size={140} />
          <Text style={styles.introTitle}>Tell me what you're{'\n'}looking for</Text>
          <Text style={styles.introSub}>
            Answer three questions in your own voice. I'll listen, then introduce you to one person — the one I'd pick for you myself.
          </Text>
          <View style={styles.introPoints}>
            {[['mic', 'Speak naturally — no forms'], ['person', 'One introduction, not a list'], ['shield-checkmark', 'Wali-friendly from the first salaam']].map(([ic, t]) => (
              <View key={t} style={styles.introPoint}>
                <View style={styles.introIcon}><Ionicons name={ic} size={15} color={M.textOnPrimary} /></View>
                <Text style={styles.introPointText}>{t}</Text>
              </View>
            ))}
          </View>
          <GButton label="Start talking" icon="mic" onPress={start} style={{ alignSelf: 'stretch', marginTop: 26 }} />
        </Animated.View>
      ) : (
        <>
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {convo.map((m) => (
              m.from === 'ai' ? (
                <Animated.View key={m.id} entering={FadeInDown.duration(220)} style={styles.aiRow}>
                  <View style={styles.aiAvatar}><Butterfly size={40} idle={false} /></View>
                  <View style={styles.aiBubble}>
                    <View style={styles.speakRow}>
                      <Ionicons name="volume-medium" size={13} color={M.textSoft} />
                      <Text style={styles.speakLabel}>Matchmaker</Text>
                    </View>
                    <Text style={styles.aiText}>{m.text}</Text>
                  </View>
                </Animated.View>
              ) : (
                <Animated.View key={m.id} entering={FadeInUp.duration(220)} style={styles.meRow}>
                  <LinearGradient colors={GRAD.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.meBubble}>
                    <Ionicons name="play" size={16} color={M.textOnPrimary} />
                    <View style={styles.wave}>
                      {[...Array(18)].map((_, i) => (
                        <View key={i} style={[styles.waveBar, { height: 4 + ((i * 7) % 16), backgroundColor: M.textOnPrimary, opacity: 0.85 }]} />
                      ))}
                    </View>
                    <Text style={[styles.waveDur, { color: M.textOnPrimary }]}>0:{String(m.secs).padStart(2, '0')}</Text>
                  </LinearGradient>
                </Animated.View>
              )
            ))}
            {phase === 'thinking' && (
              <Animated.View entering={FadeIn} style={styles.aiRow}>
                <View style={styles.aiAvatar}><Butterfly size={40} idle={false} /></View>
                <View style={[styles.aiBubble, { flexDirection: 'row', gap: 4, paddingVertical: 16 }]}>
                  {[0, 1, 2].map((i) => <View key={i} style={styles.dot} />)}
                </View>
              </Animated.View>
            )}

            {phase === 'reveal' && pick && (
              <Animated.View entering={ZoomIn.springify().damping(15)} style={styles.revealCard}>
                <PhotoTile
                  seed={pick.person.id} name={pick.person.name}
                  gradient={gradVariantFor(pick.person.id, 0)}
                  figure={pick.person.photoVeiled ? null : pick.person.veil}
                  veiled={!!pick.person.photoVeiled}
                  rounded={RADIUS.lg} style={styles.revealPhoto}
                >
                  <LinearGradient colors={['transparent', 'rgba(10,10,14,0.85)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.revealInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Text style={styles.revealName}>{pick.person.name}, {pick.person.age}</Text>
                      {pick.person.verified && <Verified size={15} />}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
                      <VeilBadge veil={pick.person.veil} size="sm" />
                      <Text style={styles.revealMeta}>{pick.person.job} · {pick.person.city}</Text>
                    </View>
                  </View>
                  <View style={styles.scorePill}><Ionicons name="sparkles" size={12} color="#fff" /><Text style={styles.scoreText}>{pick.score}%</Text></View>
                </PhotoTile>
                <View style={styles.reasons}>
                  {pick.reasons.slice(0, 2).map((r, i) => (
                    <View key={i} style={styles.reasonRow}>
                      <Ionicons name="checkmark-circle" size={15} color={M.success} />
                      <Text style={styles.reasonText}>{r}</Text>
                    </View>
                  ))}
                </View>
                <GButton label={`Introduce us`} icon="heart" onPress={introduce} style={{ marginTop: 4 }} />
                <Pressable onPress={() => navigation.goBack()} style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.notNow}>Not this time</Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>

          {/* Mic */}
          {(phase === 'asking' || phase === 'recording') && (
            <View style={[styles.micBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={styles.micHint}>{phase === 'recording' ? 'Listening… speak from the heart' : 'Tap to answer with your voice'}</Text>
              <MicButton recording={phase === 'recording'} onPress={answer} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function MicButton({ recording, onPress }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = recording
      ? withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [recording]);
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.35 }],
    opacity: 0.35 - pulse.value * 0.25,
  }));
  return (
    <Pressable onPress={onPress} style={styles.micWrap}>
      <Animated.View style={[styles.micRing, ring]} />
      <LinearGradient colors={GRAD.primary} style={styles.mic}>
        <Ionicons name={recording ? 'radio-button-on' : 'mic'} size={30} color={M.textOnPrimary} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h3 },
  subtitle: { ...TYPE.caption, marginTop: 1 },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
  introTitle: { ...TYPE.h1, fontSize: 26, textAlign: 'center', marginTop: 16, lineHeight: 31 },
  introSub: { ...TYPE.soft, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12 },
  introPoints: { alignSelf: 'stretch', gap: 12, marginTop: 24 },
  introPoint: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  introIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  introPointText: { ...TYPE.body, fontWeight: '600', flex: 1 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14, paddingRight: 40 },
  aiAvatar: { width: 40, height: 44, alignItems: 'center', justifyContent: 'flex-end' },
  aiBubble: { flex: 1, backgroundColor: M.bgSoft, borderRadius: 20, borderBottomLeftRadius: 6, padding: 14 },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  speakLabel: { ...TYPE.caption, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6 },
  aiText: { ...TYPE.body, fontSize: 15, lineHeight: 21 },
  meRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14, paddingLeft: 60 },
  meBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 12, minWidth: 170 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, flex: 1 },
  waveBar: { width: 2.5, borderRadius: 2 },
  waveDur: { fontSize: 12, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: M.textMuted },
  micBar: { alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: M.border, backgroundColor: M.bg },
  micHint: { ...TYPE.caption, marginBottom: 10 },
  micWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: M.primary },
  mic: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', ...SHADOW.primary },
  revealCard: { marginTop: 6 },
  revealPhoto: { height: width * 0.92, ...SHADOW.card },
  revealInfo: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  revealName: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  revealMeta: { color: 'rgba(255,255,255,0.92)', fontWeight: '600', fontSize: 13 },
  scorePill: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(17,17,17,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill },
  scoreText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  reasons: { paddingVertical: 14, gap: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonText: { ...TYPE.body, fontWeight: '600', flex: 1 },
  notNow: { ...TYPE.body, color: M.textSoft, fontWeight: '700' },
});
