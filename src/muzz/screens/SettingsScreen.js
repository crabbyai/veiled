import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M, RADIUS, SPACE, TYPE, isDark, setThemeMode } from '../theme';
import { useMuzz } from '../store';
import * as H from '../haptics';

const PRIVACY_URL = 'https://adeelahmedrahman.github.io/veiled-privacy/';
// Apple requires a Terms of Use (EULA) link in-app for auto-renewable
// subscriptions. Apple's standard EULA is acceptable if you don't host one.
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const SUPPORT_EMAIL = 'support@veiledapp.com';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { butterflyAuto, update, me, setMe, filters, resetAll, pauseProfile, deleteAccount } = useMuzz();
  const [local, setLocal] = React.useState({});
  const [deleting, setDeleting] = React.useState(false);

  const goFilters = () => { H.tap(); navigation.navigate('MuzzFilters'); };

  // Sections are built from live state so every value is real.
  const SECTIONS = [
    {
      title: 'Discovery',
      rows: [
        { icon: 'infinite', label: 'Auto-matching', toggleKey: 'butterflyAuto' },
        { icon: 'location-outline', label: 'Maximum distance', value: filters.passportCity ? filters.passportCity : `${filters.maxDistance} mi`, act: goFilters },
        { icon: 'people-outline', label: 'Show me', value: me.gender === 'Woman' ? 'Men' : 'Women', act: goFilters },
        { icon: 'calendar-outline', label: 'Age range', value: `${filters.ageMin} – ${filters.ageMax}`, act: goFilters },
      ],
    },
    {
      title: 'Religious filters',
      rows: [
        { icon: 'moon-outline', label: 'Sect', value: filters.sect || 'Any', act: goFilters },
        { icon: 'time-outline', label: 'Prayer level', value: filters.prayerLevel || 'Any', act: goFilters },
        { icon: 'earth-outline', label: 'Ethnicity', value: filters.ethnicity || 'Any', act: goFilters },
        { icon: 'sparkles-outline', label: 'Veil style', value: filters.veil || 'Any', act: goFilters },
      ],
    },
    {
      title: 'Privacy & Safety',
      rows: [
        { icon: 'shield-checkmark-outline', label: 'Wali / chaperone by default', toggleKey: 'waliDefault' },
        { icon: 'image-outline', label: 'Keep my photos veiled until we match', toggleKey: 'blurPhotos' },
        { icon: 'pause-circle-outline', label: 'Pause my profile', toggleKey: 'paused' },
        { icon: 'shield-outline', label: 'Verified profiles only', toggleKey: 'verifiedOnly' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { icon: 'sparkles-outline', label: 'New matchmaker picks', plain: true, def: true },
        { icon: 'heart-outline', label: 'New matches', plain: true, def: true },
        { icon: 'chatbubble-outline', label: 'Messages', plain: true, def: true },
        { icon: 'rose-outline', label: 'Roses received', plain: true, def: true },
      ],
    },
    {
      title: 'Account',
      rows: [
        { icon: 'diamond-outline', label: 'Veiled Gold', value: me.gold ? 'Active' : 'Upgrade', act: () => { H.tap(); navigation.navigate('MuzzGold'); } },
        { icon: 'help-circle-outline', label: 'Help & support', act: () => { H.tap(); Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Veiled%20Support`).catch(() => {}); } },
        { icon: 'document-text-outline', label: 'Privacy policy', act: () => { H.tap(); Linking.openURL(PRIVACY_URL).catch(() => {}); } },
        { icon: 'reader-outline', label: 'Terms of Use', act: () => { H.tap(); Linking.openURL(TERMS_URL).catch(() => {}); } },
        { icon: 'log-out-outline', label: 'Log out', danger: true, act: onLogout },
        { icon: 'trash-outline', label: deleting ? 'Deleting…' : 'Delete my account', danger: true, act: onDeleteAccount },
      ],
    },
  ];

  // App Store 5.1.1(v): account deletion must be initiable in-app, and
  // must actually delete — not just sign out. Two-step confirm because
  // it's irreversible.
  function onDeleteAccount() {
    if (deleting) return;
    H.tap();
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, photos, matches and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert(
            'This is permanent',
            'Are you absolutely sure? Everything will be erased.',
            [
              { text: 'Keep my account', style: 'cancel' },
              {
                text: 'Delete forever',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  const res = await deleteAccount();
                  setDeleting(false);
                  if (!res.ok) {
                    Alert.alert(
                      'Removed from this device',
                      'We couldn\'t reach the server, so your account may still exist. Please reconnect and try again, or email ' + SUPPORT_EMAIL + '.',
                    );
                  }
                },
              },
            ],
          ),
        },
      ],
    );
  }

  function onLogout() {
    H.tap();
    Alert.alert('Log out?', 'This clears your session on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { resetAll(); } },
    ]);
  }

  const getToggle = (row) => {
    switch (row.toggleKey) {
      case 'butterflyAuto': return butterflyAuto;
      case 'waliDefault': return !!me.waliEnabled;
      case 'blurPhotos': return !!me.photoVeiled;
      case 'paused': return !!me.paused;
      case 'verifiedOnly': return !!filters.verifiedOnly;
      default: return local[row.label] ?? row.def ?? false;
    }
  };
  const setToggle = (row, v) => {
    H.select();
    switch (row.toggleKey) {
      case 'butterflyAuto': update((s) => ({ ...s, butterflyAuto: v })); break;
      case 'waliDefault': setMe({ waliEnabled: v }); break;
      case 'blurPhotos': setMe({ photoVeiled: v }); break;
      case 'paused': pauseProfile(v); break;
      case 'verifiedOnly': update((s) => ({ ...s, filters: { ...s.filters, verifiedOnly: v } })); break;
      default: setLocal((l) => ({ ...l, [row.label]: v }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <View style={styles.card}>
            <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzVerify'); }} style={styles.row}>
              <Ionicons name="shield-checkmark-outline" size={20} color={M.primary} />
              <Text style={styles.rowLabel}>Selfie verification</Text>
              {me.selfieVerified ? (
                <View style={styles.verifiedChip}><Ionicons name="checkmark-circle" size={14} color={M.success} /><Text style={styles.verifiedChipText}>Verified</Text></View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.rowValue}>Not verified</Text>
                  <Ionicons name="chevron-forward" size={18} color={M.textMuted} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={20} color={M.primary} />
              <Text style={styles.rowLabel}>Dark mode</Text>
              <Switch value={isDark} onValueChange={(v) => { H.select(); setThemeMode(v ? 'dark' : 'light'); }} trackColor={{ true: M.primary, false: M.border }} thumbColor={M.bg} />
            </View>
          </View>
        </View>

        {SECTIONS.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.card}>
              {sec.rows.map((row, i) => (
                <Pressable key={row.label} onPress={() => { if (row.act) row.act(); }} style={[styles.row, i < sec.rows.length - 1 && styles.rowBorder]}>
                  <Ionicons name={row.icon} size={20} color={row.danger ? M.danger : M.primary} />
                  <Text style={[styles.rowLabel, row.danger && { color: M.danger }]}>{row.label}</Text>
                  {(row.toggleKey || row.plain) ? (
                    <Switch value={getToggle(row)} onValueChange={(v) => setToggle(row, v)} trackColor={{ true: M.primary, false: M.border }} thumbColor="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                      {!row.danger && <Ionicons name="chevron-forward" size={18} color={M.textMuted} />}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Text style={styles.version}>Veiled · v1.0.0</Text>
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
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedChipText: { color: M.success, fontWeight: '800', fontSize: 12 },
  version: { ...TYPE.caption, color: M.textMuted, textAlign: 'center', marginTop: 30 },
});
