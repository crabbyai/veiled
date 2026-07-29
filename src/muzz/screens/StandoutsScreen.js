import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { rankMatches } from '../butterfly';
import { PhotoTile, Verified, VeilBadge } from '../components/ui';
import * as H from '../haptics';

// ─── Standouts (Hinge) ──────────────────────────────────────────────
// A weekly-refreshed, prompt-forward set of your most compatible people.
// Send a Rose to reach the top of their likes.
export default function StandoutsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, feedback, matches, roses, sendRose, isUnveiled } = useMuzz();

  // Stable within the ISO week, rotating weekly — like Hinge Standouts.
  const week = Math.floor(Date.now() / (7 * 86400000));
  const standouts = useMemo(() => {
    const ranked = rankMatches(me, feedback).filter(
      (m) => feedback[m.person.id] !== 'liked' && !matches.includes(m.person.id)
    );
    return ranked.slice(0, 8).map((m) => {
      const prompts = m.person.prompts || [];
      let seed = week * 131 + (parseInt(String(m.person.id).replace(/\D/g, ''), 10) || 1);
      const highlight = prompts.length ? prompts[Math.abs(seed) % prompts.length] : null;
      return { ...m, highlight };
    });
  }, [me, feedback, matches, week]);

  const onRose = (personId) => {
    H.press();
    if (!me.gold && (roses || 0) <= 0) { navigation.navigate('MuzzGold'); return; }
    const ok = sendRose(personId, {});
    if (ok) navigation.navigate('MuzzMatchReveal', { personId, score: 99, rose: true });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.title}>Standouts</Text>
        <View style={styles.roseChip}>
          <Ionicons name="rose" size={14} color="#C2447A" />
          <Text style={styles.roseChipText}>{me.gold ? '∞' : (roses || 0)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACE.xl, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>This week's most compatible sisters, refreshed every Friday. Send a Rose 🌹 to stand out in her likes.</Text>

        {standouts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="rose-outline" size={40} color={M.primary} />
            <Text style={styles.emptyText}>No standouts right now — check back after Jumu'ah.</Text>
          </View>
        ) : standouts.map((m, i) => {
          const p = m.person;
          const veiled = !!p.photoVeiled && !isUnveiled(p.id);
          return (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 60)} style={styles.card}>
              <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzProfileDetail', { personId: p.id }); }}>
                <PhotoTile seed={p.id} name={p.name} veiled={veiled} veilLabel="Veiled" rounded={RADIUS.lg} style={styles.photo} figure={p.veil}>
                  <LinearGradient colors={['transparent', 'rgba(15,15,16,0.85)']} style={styles.photoGrad} />
                  <View style={styles.photoInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.name}>{p.name}, {p.age}</Text>
                      {p.verified && <Verified size={14} />}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <VeilBadge veil={p.veil} size="sm" />
                      <View style={styles.compat}><Ionicons name="sparkles" size={11} color={M.butterfly} /><Text style={styles.compatText}>{m.score}% compatible</Text></View>
                    </View>
                  </View>
                </PhotoTile>
              </Pressable>

              {m.highlight && (
                <View style={styles.quote}>
                  <Text style={styles.quoteQ}>{m.highlight.q}</Text>
                  <Text style={styles.quoteA}>"{m.highlight.a}"</Text>
                </View>
              )}

              <Pressable onPress={() => onRose(p.id)} style={styles.roseBtn}>
                <LinearGradient colors={['#E06A98', '#B03A6C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.roseGrad}>
                  <Ionicons name="rose" size={18} color="#fff" />
                  <Text style={styles.roseText}>Send a Rose</Text>
                </LinearGradient>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h2 },
  roseChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: M.bgSoft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  roseChipText: { fontWeight: '900', color: '#C2447A', fontSize: 13 },
  intro: { ...TYPE.soft, color: M.textSoft, lineHeight: 20, marginBottom: 18 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyText: { ...TYPE.soft, color: M.textMuted, textAlign: 'center', paddingHorizontal: 30 },
  card: { backgroundColor: M.bgSoft, borderRadius: RADIUS.xl, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: M.border, ...SHADOW.card },
  photo: { width: '100%', height: 360, justifyContent: 'flex-end' },
  photoGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  photoInfo: { padding: 16 },
  name: { color: '#fff', fontWeight: '900', fontSize: 22 },
  compat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  compatText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  quote: { padding: 16, paddingBottom: 8 },
  quoteQ: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  quoteA: { ...TYPE.h3, fontSize: 17, lineHeight: 24, marginTop: 6 },
  roseBtn: { margin: 16, marginTop: 8 },
  roseGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.pill },
  roseText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
