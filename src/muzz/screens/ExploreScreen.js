import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { rankMatches } from '../butterfly';
import { PhotoTile, Verified } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');
const COL_W = (width - SPACE.xl * 2 - 12) / 2;

export default function ExploreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, feedback } = useMuzz();
  const [sort, setSort] = useState('match');
  const ranked = useMemo(() => {
    const r = rankMatches(me, feedback);
    if (sort === 'distance') return [...r].sort((a, b) => a.person.distance - b.person.distance);
    if (sort === 'online') return [...r].sort((a, b) => (b.person.online ? 1 : 0) - (a.person.online ? 1 : 0));
    return r;
  }, [me, feedback, sort]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={M.text} />
        </Pressable>
        <Text style={styles.title}>Explore</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.sortRow}>
        {[['match', 'Best match'], ['distance', 'Nearest'], ['online', 'Online now']].map(([k, l]) => (
          <Pressable key={k} onPress={() => { setSort(k); H.select(); }} style={[styles.sortChip, sort === k && styles.sortChipOn]}>
            <Text style={[styles.sortText, sort === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {ranked.map((m, i) => (
          <Animated.View key={m.person.id} entering={FadeInDown.delay((i % 8) * 40)}>
            <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzProfileDetail', { personId: m.person.id }); }}>
              <PhotoTile seed={m.person.id} name={m.person.name} style={styles.tile}>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(20,16,26,0.82)']} style={StyleSheet.absoluteFill} />
                <View style={styles.matchBadge}>
                  <Ionicons name="sparkles" size={10} color="#fff" />
                  <Text style={styles.matchBadgeText}>{m.score}%</Text>
                </View>
                {m.person.online && <View style={styles.onlinePill}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Online</Text></View>}
                <View style={styles.tileInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.tileName}>{m.person.name}, {m.person.age}</Text>
                    {m.person.verified && <View style={{ marginLeft: 5 }}><Verified size={13} /></View>}
                  </View>
                  <Text style={styles.tileMeta}>{m.person.distance} mi · {m.person.city}</Text>
                </View>
              </PhotoTile>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.xl, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h1 },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACE.xl, paddingBottom: 12 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border },
  sortChipOn: { backgroundColor: M.primary, borderColor: M.primary },
  sortText: { fontWeight: '700', fontSize: 13, color: M.textSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: SPACE.xl, paddingBottom: 120, gap: 12 },
  tile: { width: COL_W, height: COL_W * 1.42, marginBottom: 0, justifyContent: 'flex-end', padding: 12 },
  matchBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(139,92,246,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  matchBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  onlinePill: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: M.online },
  onlineText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  tileInfo: {},
  tileName: { color: '#fff', fontWeight: '800', fontSize: 16 },
  tileMeta: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 12, marginTop: 2 },
});
