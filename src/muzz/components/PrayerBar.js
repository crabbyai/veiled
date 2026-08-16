import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import * as H from '../haptics';

// ─── Prayer times ───────────────────────────────────────────────────
// A slim, on-theme strip showing the next salah and a live countdown.
// Times are a sensible fixed schedule for the demo; a production build
// would compute them from the device location + a calculation method.
const PRAYERS = [
  { key: 'Fajr', h: 4, m: 12, icon: 'cloudy-night-outline' },
  { key: 'Dhuhr', h: 13, m: 5, icon: 'sunny-outline' },
  { key: 'Asr', h: 16, m: 45, icon: 'partly-sunny-outline' },
  { key: 'Maghrib', h: 19, m: 50, icon: 'moon-outline' },
  { key: 'Isha', h: 21, m: 35, icon: 'moon' },
];

const fmt = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function nextPrayer(now) {
  const mins = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < PRAYERS.length; i++) {
    const p = PRAYERS[i];
    if (p.h * 60 + p.m > mins) return { ...p, idx: i, tomorrow: false };
  }
  return { ...PRAYERS[0], idx: 0, tomorrow: true }; // Fajr next day
}

export default function PrayerBar({ onPress }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const next = nextPrayer(now);
  const target = next.h * 60 + next.m + (next.tomorrow ? 1440 : 0);
  const cur = now.getHours() * 60 + now.getMinutes();
  const diff = Math.max(0, target - cur);
  const hh = Math.floor(diff / 60);
  const mm = diff % 60;
  const countdown = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;

  return (
    <Pressable
      onPress={() => { H.tap(); if (onPress) onPress(); }}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Prayer times and dhikr counter' : undefined}
      style={styles.wrap}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={next.icon} size={17} color={M.textOnPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Next salah · {next.key}</Text>
        <Text style={styles.time}>{fmt(next.h, next.m)} <Text style={styles.countdown}>· in {countdown}</Text></Text>
      </View>
      <View style={styles.dots}>
        {PRAYERS.map((p, i) => (
          <View key={p.key} style={styles.dotCol}>
            <View style={[styles.dot, i === next.idx && styles.dotActive]} />
            <Text style={[styles.dotLabel, i === next.idx && styles.dotLabelActive]}>{p.key[0]}</Text>
          </View>
        ))}
      </View>
      {/* The tasbih lives one tap away, since this is already the strip
          people look at for the deen side of the app. */}
      {onPress ? (
        <View style={styles.tasbih}>
          <Ionicons name="ellipsis-vertical" size={13} color={M.textOnPrimary} />
          <Text style={styles.tasbihText}>Dhikr</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    marginHorizontal: SPACE.lg, marginTop: 4, marginBottom: 2,
    backgroundColor: M.bgSoft, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: M.border,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  label: { ...TYPE.caption, fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  time: { ...TYPE.h3, fontSize: 15, marginTop: 1 },
  countdown: { ...TYPE.soft, fontSize: 12.5, fontWeight: '600', color: M.textSoft },
  dots: { flexDirection: 'row', gap: 8 },
  dotCol: { alignItems: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: M.border },
  dotActive: { backgroundColor: M.primary, width: 7, height: 7, borderRadius: 3.5 },
  dotLabel: { fontSize: 8.5, fontWeight: '700', color: M.textMuted },
  dotLabelActive: { color: M.primary },
  tasbih: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: M.primary, borderRadius: RADIUS.pill,
    paddingLeft: 7, paddingRight: 10, paddingVertical: 5,
  },
  tasbihText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 11.5 },
});
