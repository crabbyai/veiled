import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import { M, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz, milestonesFor, isJumuah, SITTING_GAP_MS } from '../store';
import * as H from '../haptics';

// ─── Dhikr ──────────────────────────────────────────────────────────
// A tasbih: a ring of beads you tap, a count, and the time you've been
// sitting with it. Keep a sitting going and it earns you something —
// a Rose, a Compliment or a Boost — and on Jumu'ah it comes sooner.
//
// The counter is the point. The gift is a nudge, not a wage: nothing
// here is required, and the app never claims a reward for the dhikr
// itself. It's a count you keep, and the app thanks you for turning up.

const ADHKAR = [
  { key: 'subhanallah', ar: 'سُبْحَانَ اللّٰه', tr: 'SubhanAllah', en: 'Glory be to Allah', round: 33 },
  { key: 'alhamdulillah', ar: 'الْحَمْدُ لِلّٰه', tr: 'Alhamdulillah', en: 'All praise is for Allah', round: 33 },
  { key: 'takbir', ar: 'اللّٰهُ أَكْبَر', tr: 'Allahu akbar', en: 'Allah is the greatest', round: 34 },
  { key: 'tahlil', ar: 'لَا إِلٰهَ إِلَّا اللّٰه', tr: 'La ilaha illa Allah', en: 'There is no god but Allah', round: 100 },
  { key: 'istighfar', ar: 'أَسْتَغْفِرُ اللّٰه', tr: 'Astaghfirullah', en: 'I seek forgiveness from Allah', round: 100 },
  { key: 'salawat', ar: 'اللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّد', tr: 'Salawat', en: 'Blessings upon the Prophet ﷺ', round: 100 },
];

const BEADS = 33;
const RING = 128;   // radius the beads sit on

const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const GIFTS = [
  { key: 'rose', icon: 'rose', title: 'A Rose', sub: 'Reaches her first, and says you mean it.' },
  { key: 'compliment', icon: 'chatbubble-ellipses', title: 'A Compliment', sub: 'Write to her before you match — straight to her chat.' },
  { key: 'boost', icon: 'flash', title: 'A Boost', sub: 'Top of the deck in your area for 30 minutes.' },
];

export default function DhikrScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { dhikr, addDhikr, resetDhikr, claimDhikrGift } = useMuzz();
  const jumuah = isJumuah();
  // Fridays are the day people increase their salawat, so that's what
  // the counter opens on.
  const [pick, setPick] = useState(() => ADHKAR[jumuah ? 5 : 0]);
  const [now, setNow] = useState(Date.now());

  const d = dhikr || {};
  const live = d.lastTs && now - d.lastTs < SITTING_GAP_MS;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const marks = useMemo(() => milestonesFor(), []);
  const sitting = live ? d.sitting || 0 : 0;
  const nextMark = marks.find((m) => sitting < m) || null;
  const inRound = sitting % pick.round;
  const beadsLit = pick.round === BEADS ? inRound : Math.round((inRound / pick.round) * BEADS);

  const pulse = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));
  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.07 }],
  }));

  const count = useCallback(() => {
    pulse.value = withSequence(
      withTiming(1, { duration: 70, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 12, stiffness: 260 })
    );
    const earned = addDhikr(1);
    if (earned) {
      H.success();
    } else if ((sitting + 1) % pick.round === 0) {
      H.heavy();   // end of a round of 33 — you can feel it
    } else {
      H.select();
    }
  }, [addDhikr, sitting, pick.round]);

  const gift = d.gift || null;

  const take = (kind) => {
    if (!claimDhikrGift(kind)) return;
    H.success();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={M.text} />
        </Pressable>
        <Text style={styles.title}>Dhikr</Text>
        <Pressable onPress={() => { H.tap(); resetDhikr(); }} hitSlop={10} style={styles.back}>
          <Ionicons name="refresh" size={22} color={M.textSoft} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {jumuah && (
          <Animated.View entering={FadeIn} style={styles.jumuah}>
            <Ionicons name="sparkles" size={14} color={M.textOnPrimary} />
            <Text style={styles.jumuahText}>It's Jumu'ah — gifts come sooner today</Text>
          </Animated.View>
        )}

        {/* What you're saying */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.picker}
        >
          {ADHKAR.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => { H.select(); setPick(a); }}
              style={[styles.pickChip, pick.key === a.key && styles.pickChipOn]}
            >
              <Text style={[styles.pickTr, pick.key === a.key && { color: M.textOnPrimary }]}>{a.tr}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.arabic}>{pick.ar}</Text>
        <Text style={styles.meaning}>{pick.en}</Text>

        {/* The tasbih itself */}
        <View style={styles.ringWrap}>
          <Animated.View style={[styles.ring, ringStyle]}>
            {[...Array(BEADS)].map((_, i) => {
              const angle = (i / BEADS) * Math.PI * 2 - Math.PI / 2;
              const lit = i < beadsLit;
              return (
                <View
                  key={i}
                  style={[
                    styles.bead,
                    lit && styles.beadOn,
                    {
                      transform: [
                        { translateX: Math.cos(angle) * RING },
                        { translateY: Math.sin(angle) * RING },
                      ],
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          <Pressable
            onPress={count}
            accessibilityRole="button"
            accessibilityLabel={`Count ${pick.tr}. ${sitting} so far.`}
            style={({ pressed }) => [styles.dial, pressed && styles.dialPressed]}
          >
            <Animated.Text style={[styles.count, countStyle]}>{sitting}</Animated.Text>
            <Text style={styles.round}>
              {inRound} / {pick.round}
            </Text>
            <View style={styles.tapHint}>
              <Ionicons name="ellipse" size={7} color={M.textMuted} />
              <Text style={styles.tapHintText}>tap to count</Text>
            </View>
          </Pressable>
        </View>

        {/* Where this sitting stands */}
        <View style={styles.stats}>
          <Stat label="This sitting" value={live ? clock(now - (d.sittingStart || now)) : '0:00'} />
          <Stat label="Today" value={String(d.dayCount || 0)} />
          <Stat label="Day streak" value={String(d.streak || 0)} />
        </View>

        {/* The next gift, and how far off it is */}
        <View style={styles.goal}>
          <View style={styles.goalHead}>
            <View style={styles.goalIcon}><Ionicons name="gift" size={17} color={M.textOnPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalTitle}>
                {nextMark ? `${nextMark - sitting} more for a gift` : 'Every gift in this sitting is earned'}
              </Text>
              <Text style={styles.goalSub}>
                {nextMark
                  ? 'Keep the sitting going and choose a Rose, a Compliment or a Boost.'
                  : 'Start a new sitting whenever you like — the milestones come back.'}
              </Text>
            </View>
          </View>
          <View style={styles.bar}>
            <View
              style={[
                styles.barFill,
                { width: `${nextMark ? Math.min(100, (sitting / nextMark) * 100) : 100}%` },
              ]}
            />
          </View>
          <Text style={styles.marks}>
            Gifts at {marks.join(', ')}{jumuah ? ' — lowered for Jumu\'ah' : ''}
          </Text>
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={15} color={M.textSoft} />
          <Text style={styles.noteText}>
            A sitting is an unbroken run. Put the phone down for five minutes and the next one starts from
            zero — your day's count, your streak and your total all stay.
          </Text>
        </View>

        <Text style={styles.total}>{(d.total || 0).toLocaleString()} counted on Veiled</Text>
      </ScrollView>

      {/* Milestone reached — choose what it becomes */}
      <Modal visible={!!gift} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.sheetBg}>
          <Animated.View entering={FadeInUp} style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetIcon}><Ionicons name="gift" size={28} color={M.textOnPrimary} /></View>
            <Text style={styles.sheetTitle}>
              {gift ? `${gift.at} in one sitting` : ''}
            </Text>
            <Text style={styles.sheetSub}>
              {gift && gift.jumuah ? 'On Jumu\'ah, at that. Choose your gift.' : 'Choose your gift.'}
            </Text>
            {GIFTS.map((g) => (
              <Pressable key={g.key} onPress={() => take(g.key)} style={({ pressed }) => [styles.giftRow, pressed && { opacity: 0.7 }]}>
                <View style={styles.giftIcon}><Ionicons name={g.icon} size={20} color={M.textOnPrimary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.giftTitle}>{g.title}</Text>
                  <Text style={styles.giftSub}>{g.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={M.textMuted} />
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const DIAL = 196;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg, paddingBottom: 8,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h1, fontSize: 22 },
  jumuah: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'center', backgroundColor: M.primary, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.pill, marginBottom: 6,
  },
  jumuahText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 12.5 },
  picker: { gap: 8, paddingHorizontal: SPACE.xl, paddingVertical: 12 },
  pickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill,
    backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border,
  },
  pickChipOn: { backgroundColor: M.primary, borderColor: M.primary },
  pickTr: { fontWeight: '700', fontSize: 13, color: M.textSoft },
  arabic: { fontSize: 30, color: M.text, textAlign: 'center', marginTop: 4, lineHeight: 46 },
  meaning: { ...TYPE.soft, textAlign: 'center', marginTop: 2, fontSize: 13.5 },

  ringWrap: { height: RING * 2 + 44, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ring: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  bead: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: M.border },
  beadOn: { backgroundColor: M.primary, width: 11, height: 11, borderRadius: 6 },
  dial: {
    width: DIAL, height: DIAL, borderRadius: DIAL / 2, backgroundColor: M.bgSoft,
    borderWidth: 1, borderColor: M.border, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.card,
  },
  dialPressed: { backgroundColor: M.bgInput },
  count: { fontSize: 62, fontWeight: '900', color: M.text, letterSpacing: -2 },
  round: { ...TYPE.soft, fontWeight: '800', marginTop: -4 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  tapHintText: { ...TYPE.caption, color: M.textMuted, fontSize: 11 },

  stats: { flexDirection: 'row', marginHorizontal: SPACE.xl, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { ...TYPE.h2, fontSize: 20 },
  statLabel: { ...TYPE.caption, color: M.textSoft },

  goal: {
    marginHorizontal: SPACE.xl, marginTop: 20, backgroundColor: M.bgSoft,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: M.border, padding: 14,
  },
  goalHead: { flexDirection: 'row', gap: 11 },
  goalIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { ...TYPE.h3, fontSize: 15 },
  goalSub: { ...TYPE.soft, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  bar: { height: 7, borderRadius: 4, backgroundColor: M.border, marginTop: 14, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: M.primary },
  marks: { ...TYPE.caption, color: M.textMuted, marginTop: 8 },

  note: { flexDirection: 'row', gap: 8, marginHorizontal: SPACE.xl, marginTop: 16 },
  noteText: { ...TYPE.caption, color: M.textSoft, flex: 1, lineHeight: 17 },
  total: { ...TYPE.caption, color: M.textMuted, textAlign: 'center', marginTop: 22 },

  sheetBg: { flex: 1, backgroundColor: M.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: M.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: SPACE.xl, paddingTop: 24,
  },
  sheetIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: M.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', ...SHADOW.card,
  },
  sheetTitle: { ...TYPE.h2, marginTop: 14, textAlign: 'center' },
  sheetSub: { ...TYPE.soft, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  giftRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: M.border,
  },
  giftIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  giftTitle: { ...TYPE.h3, fontSize: 15 },
  giftSub: { ...TYPE.soft, fontSize: 12.5, marginTop: 1 },
});
