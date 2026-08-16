import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {  } from 'react-native-reanimated';
import { enterRow } from '../motion';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { IslamicPattern } from '../components/Pattern';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

// ─── Community & halaqa events ──────────────────────────────────────
// Veiled beyond 1:1: wali-supervised taaruf evenings, sisters' halaqa,
// lectures and charity — bringing the community together in person.
const EVENTS = [
  {
    id: 'e1', type: 'Taaruf', title: 'Wali-Supervised Taaruf Evening',
    host: 'Veiled Community', date: 'Sat 26 Jul', time: '6:00pm', dateShort: ['JUL', '26'],
    city: 'East London Muslim Centre', going: 48, cap: 60, fee: '£10', thisWeek: true,
    desc: 'A structured taaruf evening with walis present. Sisters and brothers meet in a halal, supervised setting with facilitated introductions.',
  },
  {
    id: 'e2', type: 'Halaqa', title: 'Sisters’ Halaqa: Stories of the Sahabiyat',
    host: 'Ustadha Maryam', date: 'Sun 27 Jul', time: '2:00pm', dateShort: ['JUL', '27'],
    city: 'Online + Whitechapel', going: 132, cap: 200, fee: 'Free', thisWeek: true,
    desc: 'A weekly circle exploring the lives of the women companions and what they teach us about faith, patience and love.',
  },
  {
    id: 'e3', type: 'Lecture', title: 'Marriage in Islam: Rights & Responsibilities',
    host: 'Shaykh Yusuf', date: 'Fri 1 Aug', time: '7:30pm', dateShort: ['AUG', '01'],
    city: 'Birmingham Central Mosque', going: 210, cap: 300, fee: '£5', thisWeek: false,
    desc: 'An honest talk on building a marriage on prophetic guidance — communication, expectations, and the role of the wali.',
  },
  {
    id: 'e4', type: 'Charity', title: 'Community Iftar Prep & Food Drive',
    host: 'Veiled x Local Masjid', date: 'Sat 9 Aug', time: '11:00am', dateShort: ['AUG', '09'],
    city: 'Manchester', going: 74, cap: 120, fee: 'Free', thisWeek: false,
    desc: 'Volunteer together packing food parcels for families in need. A beautiful way to meet like-minded people while giving back.',
  },
  {
    id: 'e5', type: 'Taaruf', title: 'Speed-Taaruf: Marriage-Minded 25–35',
    host: 'Veiled Community', date: 'Sun 10 Aug', time: '4:00pm', dateShort: ['AUG', '10'],
    city: 'Leeds Grand Mosque Hall', going: 36, cap: 40, fee: '£15', thisWeek: false,
    desc: 'Short, wali-aware introductions for those serious about nikah. Bio cards exchanged; follow-ups handled through the app.',
  },
];

const FILTERS = ['All', 'This week', 'Taaruf', 'Halaqa', 'Charity'];

export default function EventsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { rsvps, toggleRsvp } = useMuzz();
  const [filter, setFilter] = useState('All');

  const list = EVENTS.filter((e) =>
    filter === 'All' ? true : filter === 'This week' ? e.thisWeek : e.type === filter
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.title}>Events</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <IslamicPattern color={M.textOnPrimary} opacity={0.14} tile={46} />
          <Text style={styles.heroKicker}>VEILED COMMUNITY</Text>
          <Text style={styles.heroTitle}>Meet in person,{'\n'}the halal way</Text>
          <Text style={styles.heroSub}>Wali-supervised taaruf, halaqas & charity near you</Text>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.xl, gap: 8, paddingVertical: 14 }}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => { setFilter(f); H.select(); }} style={[styles.chip, filter === f && styles.chipOn]}>
              <Text style={[styles.chipText, filter === f && { color: M.textOnPrimary }]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {list.map((e, i) => {
          const going = e.going + (rsvps[e.id] ? 1 : 0);
          const pct = Math.min(100, Math.round((going / e.cap) * 100));
          const attending = !!rsvps[e.id];
          return (
            <Animated.View key={e.id} entering={enterRow(i)} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateMon}>{e.dateShort[0]}</Text>
                  <Text style={styles.dateDay}>{e.dateShort[1]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.typeRow}>
                    <View style={styles.typePill}><Text style={styles.typePillText}>{e.type}</Text></View>
                    <Text style={styles.fee}>{e.fee}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{e.title}</Text>
                  <Text style={styles.cardHost}>with {e.host}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={15} color={M.textSoft} />
                <Text style={styles.metaText}>{e.date} · {e.time}</Text>
                <Ionicons name="location-outline" size={15} color={M.textSoft} style={{ marginLeft: 12 }} />
                <Text style={styles.metaText} numberOfLines={1}>{e.city}</Text>
              </View>

              <Text style={styles.desc}>{e.desc}</Text>

              <View style={styles.attendRow}>
                <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                <Text style={styles.attendText}>{going}/{e.cap} going</Text>
              </View>

              <Pressable onPress={() => { toggleRsvp(e.id); attending ? H.tap() : H.success(); }} style={[styles.rsvp, attending && styles.rsvpOn]}>
                {attending ? (
                  <><Ionicons name="checkmark-circle" size={18} color={M.success} /><Text style={[styles.rsvpText, { color: M.success }]}>You're going</Text></>
                ) : (
                  <><Ionicons name="add-circle-outline" size={18} color={M.textOnPrimary} /><Text style={[styles.rsvpText, { color: M.textOnPrimary }]}>Reserve a place</Text></>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingBottom: 8 },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h2 },
  hero: {
    marginHorizontal: SPACE.xl, marginTop: 6, borderRadius: RADIUS.xl, overflow: 'hidden',
    backgroundColor: M.primary, padding: 22, minHeight: 140, justifyContent: 'center',
  },
  heroKicker: { color: M.textOnPrimary, opacity: 0.7, fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { color: M.textOnPrimary, fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 6, lineHeight: 30 },
  heroSub: { color: M.textOnPrimary, opacity: 0.8, fontSize: 13.5, fontWeight: '600', marginTop: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border },
  chipOn: { backgroundColor: M.primary, borderColor: M.primary },
  chipText: { fontWeight: '700', fontSize: 13, color: M.textSoft },
  card: { marginHorizontal: SPACE.xl, marginBottom: 14, backgroundColor: M.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: M.border, padding: 16, ...SHADOW.soft },
  cardTop: { flexDirection: 'row', gap: 14 },
  dateBlock: { width: 54, height: 60, borderRadius: RADIUS.md, backgroundColor: M.bgSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: M.border },
  dateMon: { ...TYPE.caption, color: M.primary, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  dateDay: { ...TYPE.h2, fontSize: 22, marginTop: -1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: { backgroundColor: M.primarySoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.pill },
  typePillText: { color: M.primary, fontWeight: '800', fontSize: 11 },
  fee: { ...TYPE.caption, color: M.textSoft, fontWeight: '800' },
  cardTitle: { ...TYPE.h3, fontSize: 16, marginTop: 6, lineHeight: 20 },
  cardHost: { ...TYPE.caption, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  metaText: { ...TYPE.soft, fontSize: 12.5, flexShrink: 1 },
  desc: { ...TYPE.soft, fontSize: 13.5, lineHeight: 19, marginTop: 12 },
  attendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: M.border, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: M.primary },
  attendText: { ...TYPE.caption, fontWeight: '800', color: M.textSoft },
  rsvp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16, paddingVertical: 13, borderRadius: RADIUS.pill, backgroundColor: M.primary },
  rsvpOn: { backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.success },
  rsvpText: { fontWeight: '800', fontSize: 14.5 },
});
