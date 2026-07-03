import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { useMuzz } from '../store';
import { SECTS, PRAYER_LEVELS, ETHNICITIES } from '../data';
import { Chip, GButton } from '../components/ui';
import * as H from '../haptics';

// Simple slider built from a draggable not needed — use stepper pills.
function Stepper({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => { H.select(); onChange(Math.max(min, value - step)); }} style={styles.stepBtn}>
          <Ionicons name="remove" size={18} color={M.primary} />
        </Pressable>
        <Text style={styles.stepValue}>{value}{suffix}</Text>
        <Pressable onPress={() => { H.select(); onChange(Math.min(max, value + step)); }} style={styles.stepBtn}>
          <Ionicons name="add" size={18} color={M.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function FiltersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { filters, setFilters, me } = useMuzz();
  const [f, setF] = useState(filters);
  const gold = me.gold;

  const apply = () => { setFilters(f); H.success(); navigation.goBack(); };
  const reset = () => { setF({ maxDistance: 50, ageMin: 22, ageMax: 35, sect: 'Any', prayerLevel: 'Any', ethnicity: 'Any', verifiedOnly: false }); H.tap(); };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.title}>Filters</Text>
        <Pressable onPress={reset}><Text style={styles.reset}>Reset</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACE.xl, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Stepper label="Maximum distance" value={f.maxDistance} min={5} max={100} step={5} suffix=" mi" onChange={(v) => setF({ ...f, maxDistance: v })} />
        <View style={styles.divider} />
        <Stepper label="Minimum age" value={f.ageMin} min={18} max={f.ageMax} onChange={(v) => setF({ ...f, ageMin: v })} />
        <Stepper label="Maximum age" value={f.ageMax} min={f.ageMin} max={70} onChange={(v) => setF({ ...f, ageMax: v })} />
        <View style={styles.divider} />

        <Text style={styles.section}>Sect</Text>
        <View style={styles.wrap}>
          {['Any', ...SECTS].map((s) => <Chip key={s} label={s} active={f.sect === s} onPress={() => setF({ ...f, sect: s })} />)}
        </View>

        <Text style={[styles.section, gold ? null : styles.locked]}>Prayer level {!gold && <Text style={styles.goldTag}>GOLD</Text>}</Text>
        <View style={styles.wrap}>
          {['Any', ...PRAYER_LEVELS].map((p) => (
            <Chip key={p} label={p} color={M.butterfly} active={f.prayerLevel === p} onPress={() => { if (gold) setF({ ...f, prayerLevel: p }); else navigation.navigate('MuzzGold'); }} />
          ))}
        </View>

        <Text style={[styles.section, gold ? null : styles.locked]}>Ethnicity {!gold && <Text style={styles.goldTag}>GOLD</Text>}</Text>
        <View style={styles.wrap}>
          {['Any', ...ETHNICITIES].map((e) => (
            <Chip key={e} label={e} active={f.ethnicity === e} onPress={() => { if (gold) setF({ ...f, ethnicity: e }); else navigation.navigate('MuzzGold'); }} />
          ))}
        </View>

        <Pressable onPress={() => { H.select(); setF({ ...f, verifiedOnly: !f.verifiedOnly }); }} style={styles.toggleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="shield-checkmark" size={20} color={M.blue} />
            <Text style={styles.toggleLabel}>Verified profiles only</Text>
          </View>
          <View style={[styles.toggle, f.verifiedOnly && styles.toggleOn]}><View style={[styles.knob, f.verifiedOnly && styles.knobOn]} /></View>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <GButton label="Show results" onPress={apply} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h2 },
  reset: { ...TYPE.body, color: M.primary, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  stepLabel: { ...TYPE.h3, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: M.bgSoft, borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: M.bg, alignItems: 'center', justifyContent: 'center', ...require('../theme').SHADOW.soft },
  stepValue: { ...TYPE.h3, fontSize: 15, minWidth: 54, textAlign: 'center' },
  divider: { height: 1, backgroundColor: M.border, marginVertical: 14 },
  section: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 10 },
  locked: { color: M.textMuted },
  goldTag: { color: '#B8860B', fontWeight: '900', fontSize: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 16 },
  toggleLabel: { ...TYPE.body, fontWeight: '700' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: M.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: M.primary },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SPACE.xl, paddingTop: 12, backgroundColor: M.bg, borderTopWidth: 1, borderTopColor: M.border },
});
