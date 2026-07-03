import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { GButton } from '../components/ui';
import Butterfly from '../components/Butterfly';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

const PERKS = [
  ['infinite', 'Unlimited likes', 'No more 5 likes per 12 hours — like everyone you want'],
  ['eye', 'See who likes you', 'Match instantly with everyone who already likes you'],
  ['flash', 'Daily free Instant Chat', 'Skip matching and message someone directly every day'],
  ['chatbubbles', '5 extra chat slots', 'Keep more conversations going at once'],
  ['flame', '2 free weekly boosts', 'Be the top profile in your area for 30 minutes'],
  ['refresh', 'Rematch', 'Bring back expired matches for a second chance'],
  ['options', 'Advanced filters', 'Filter by prayer level, sect, ethnicity, education & more'],
  ['sparkles', 'Priority butterfly picks', 'Your AI matchmaker works around the clock for you'],
  ['ribbon', 'VIP badge', 'Stand out with a gold badge on your profile'],
  ['eye-off', 'Invisible mode', 'Browse privately — only people you like can see you'],
];

const PLANS = [
  { id: '1m', label: '1 month', price: '£29.99', per: '/mo', save: null },
  { id: '3m', label: '3 months', price: '£16.66', per: '/mo', save: 'Save 44%', best: true },
  { id: '12m', label: '12 months', price: '£9.99', per: '/mo', save: 'Save 67%' },
];

export default function GoldScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setMe } = useMuzz();
  const [plan, setPlan] = useState('6m');

  const subscribe = () => { H.success(); setMe({ gold: true }); navigation.goBack(); };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#16121C', '#2A1B3D', '#16121C']} style={StyleSheet.absoluteFill} />
      <Pressable onPress={() => navigation.goBack()} style={[styles.close, { top: insets.top + 8 }]}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 30, paddingTop: insets.top + 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Butterfly size={110} colorA="#FFD86B" colorB="#F5B400" />
          <LinearGradient colors={GRAD.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goldTag}>
            <Ionicons name="diamond" size={16} color="#fff" />
            <Text style={styles.goldTagText}>BUTTERFLY GOLD</Text>
          </LinearGradient>
          <Text style={styles.heroTitle}>Find your one,{'\n'}faster</Text>
          <Text style={styles.heroSub}>Supercharge your butterfly and stand out</Text>
        </View>

        <View style={styles.perks}>
          {PERKS.map(([ic, t, d], i) => (
            <Animated.View key={t} entering={FadeInDown.delay(i * 50)} style={styles.perk}>
              <LinearGradient colors={GRAD.gold} style={styles.perkIcon}><Ionicons name={ic} size={18} color="#fff" /></LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{t}</Text>
                <Text style={styles.perkDesc}>{d}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.plans}>
          {PLANS.map((p) => (
            <Pressable key={p.id} onPress={() => { setPlan(p.id); H.select(); }} style={[styles.plan, plan === p.id && styles.planActive]}>
              {p.best && <View style={styles.bestTag}><Text style={styles.bestText}>BEST VALUE</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.planLabel}>{p.label}</Text>
                {p.save && <Text style={styles.planSave}>{p.save}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>{p.price}<Text style={styles.planPer}>{p.per}</Text></Text>
              </View>
              <View style={[styles.radio, plan === p.id && styles.radioOn]}>{plan === p.id && <Ionicons name="checkmark" size={14} color="#16121C" />}</View>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: SPACE.xl, marginTop: 20 }}>
          <GButton label="Continue" gradient={GRAD.gold} onPress={subscribe} textStyle={{ color: '#16121C' }} />
          <Text style={styles.terms}>Recurring billing · Cancel anytime · Terms apply</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16121C' },
  close: { position: 'absolute', right: 16, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: SPACE.xl },
  goldTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, marginTop: 8 },
  goldTagText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '900', textAlign: 'center', marginTop: 16, letterSpacing: -0.5, lineHeight: 38 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  perks: { paddingHorizontal: SPACE.xl, marginTop: 28, gap: 16 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  perkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  perkDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2, lineHeight: 18 },
  plans: { paddingHorizontal: SPACE.xl, marginTop: 30, gap: 12 },
  plan: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, padding: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  planActive: { borderColor: M.gold, backgroundColor: 'rgba(245,180,0,0.1)' },
  bestTag: { position: 'absolute', top: -10, left: 16, backgroundColor: M.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  bestText: { color: '#16121C', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  planLabel: { color: '#fff', fontWeight: '800', fontSize: 16 },
  planSave: { color: M.gold, fontWeight: '700', fontSize: 12, marginTop: 2 },
  planPrice: { color: '#fff', fontWeight: '900', fontSize: 18 },
  planPer: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  radioOn: { backgroundColor: M.gold, borderColor: M.gold },
  terms: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 14 },
});
