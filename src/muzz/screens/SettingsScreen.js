import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { useMuzz } from '../store';
import * as H from '../haptics';

const SECTIONS = [
  {
    title: 'Discovery',
    rows: [
      { icon: 'infinite', label: 'Auto-matching', toggleKey: 'butterflyAuto' },
      { icon: 'location-outline', label: 'Maximum distance', value: '25 mi' },
      { icon: 'people-outline', label: 'Show me', value: 'Women' },
      { icon: 'calendar-outline', label: 'Age range', value: '23 – 32' },
    ],
  },
  {
    title: 'Religious filters',
    rows: [
      { icon: 'moon-outline', label: 'Sect', value: 'Any' },
      { icon: 'time-outline', label: 'Prayer level', value: 'Any' },
      { icon: 'earth-outline', label: 'Ethnicity', value: 'Any' },
      { icon: 'restaurant-outline', label: 'Halal diet', value: 'Any' },
      { icon: 'school-outline', label: 'Education & career', gold: true },
    ],
  },
  {
    title: 'Privacy & Safety',
    rows: [
      { icon: 'shield-checkmark-outline', label: 'Wali / chaperone by default', plain: true },
      { icon: 'image-outline', label: 'Blur my photos until we match', plain: true },
      { icon: 'camera-outline', label: 'Block screenshots', plain: true, def: true },
      { icon: 'eye-off-outline', label: 'Invisible mode', gold: true },
      { icon: 'hand-left-outline', label: 'Blocked members', value: '0' },
    ],
  },
  {
    title: 'Notifications',
    rows: [
      { icon: 'sparkles-outline', label: 'New butterfly picks', plain: true, def: true },
      { icon: 'heart-outline', label: 'New matches', plain: true, def: true },
      { icon: 'chatbubble-outline', label: 'Messages', plain: true, def: true },
    ],
  },
  {
    title: 'Account',
    rows: [
      { icon: 'card-outline', label: 'Manage subscription' },
      { icon: 'help-circle-outline', label: 'Help & support' },
      { icon: 'document-text-outline', label: 'Privacy policy' },
      { icon: 'log-out-outline', label: 'Log out', danger: true },
    ],
  },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { butterflyAuto, update } = useMuzz();
  const [local, setLocal] = React.useState({});

  const getToggle = (row) => {
    if (row.toggleKey === 'butterflyAuto') return butterflyAuto;
    return local[row.label] ?? row.def ?? false;
  };
  const setToggle = (row, v) => {
    H.select();
    if (row.toggleKey === 'butterflyAuto') update((s) => ({ ...s, butterflyAuto: v }));
    else setLocal((l) => ({ ...l, [row.label]: v }));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.card}>
              {sec.rows.map((row, i) => (
                <Pressable key={row.label} onPress={() => { if (!row.toggleKey && !row.plain) H.tap(); }} style={[styles.row, i < sec.rows.length - 1 && styles.rowBorder]}>
                  <Ionicons name={row.icon} size={20} color={row.danger ? M.danger : M.primary} />
                  <Text style={[styles.rowLabel, row.danger && { color: M.danger }]}>{row.label}</Text>
                  {row.gold && <View style={styles.goldChip}><Text style={styles.goldChipText}>GOLD</Text></View>}
                  {(row.toggleKey || row.plain) ? (
                    <Switch value={getToggle(row)} onValueChange={(v) => setToggle(row, v)} trackColor={{ true: M.primary, false: M.border }} thumbColor="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {row.value && <Text style={styles.rowValue}>{row.value}</Text>}
                      {!row.danger && <Ionicons name="chevron-forward" size={18} color={M.textMuted} />}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Text style={styles.version}>Butterfly · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bgSoft },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 10, backgroundColor: M.bg, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h2 },
  section: { paddingHorizontal: SPACE.xl, paddingTop: 22 },
  sectionTitle: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: M.bg, borderRadius: RADIUS.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 54 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: M.border },
  rowLabel: { flex: 1, ...TYPE.body, fontWeight: '600' },
  rowValue: { ...TYPE.soft, marginRight: 4 },
  goldChip: { backgroundColor: '#FFF7E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 },
  goldChipText: { color: '#B8860B', fontWeight: '900', fontSize: 10 },
  version: { ...TYPE.caption, color: M.textMuted, textAlign: 'center', marginTop: 30 },
});
