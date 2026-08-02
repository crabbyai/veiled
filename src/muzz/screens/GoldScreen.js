import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { GButton } from '../components/ui';
import Butterfly from '../components/Butterfly';
import { IslamicPattern } from '../components/Pattern';
import * as purchases from '../integrations/purchases';
import * as H from '../haptics';

// Map a RevenueCat packageType to a friendly plan label.
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://adeelahmedrahman.github.io/veiled-privacy/';

const PKG_LABEL = { MONTHLY: '1 month', THREE_MONTH: '3 months', SIX_MONTH: '6 months', ANNUAL: '12 months' };
const PKG_PER = { MONTHLY: '/mo', THREE_MONTH: '/3mo', SIX_MONTH: '/6mo', ANNUAL: '/yr' };

const { width } = Dimensions.get('window');

const PERKS = [
  ['infinite', 'Unlimited likes', 'No more 5 likes per 12 hours — like everyone you want'],
  ['eye', 'See who likes you', 'Match instantly with everyone who already likes you'],
  ['flash', 'Daily free Instant Chat', 'Skip matching and message someone directly every day'],
  ['chatbubbles', '5 extra chat slots', 'Keep more conversations going at once'],
  ['flame', '2 free weekly boosts', 'Be the top profile in your area for 30 minutes'],
  ['refresh', 'Rematch', 'Bring back expired matches for a second chance'],
  ['options', 'Advanced filters', 'Filter by prayer level, sect, ethnicity, education & more'],
  ['sparkles', 'Priority matchmaker picks', 'Your AI matchmaker works around the clock for you'],
  ['ribbon', 'VIP badge', 'Stand out with a gold badge on your profile'],
  ['eye-off', 'Invisible mode', 'Browse privately — only people you like can see you'],
];

export default function GoldScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setMe } = useMuzz();
  const [packages, setPackages] = useState([]);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  // Real store prices only render when a live IAP flow is wired (App Store
  // guideline 3.1.1). Without RevenueCat configured we show the launch
  // perk instead of prices we can't actually charge.
  const iapEnabled = packages.length > 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!purchases.isAvailable()) return;
      const pkgs = await purchases.getOfferings();
      if (!alive) return;
      setPackages(pkgs);
      if (pkgs.length) setPlan(pkgs.find((p) => p.packageType === 'ANNUAL')?.identifier || pkgs[0].identifier);
    })();
    return () => { alive = false; };
  }, []);

  const subscribe = async () => {
    // Launch mode (no live IAP): grant Gold as the free launch perk.
    if (!iapEnabled) { H.success(); setMe({ gold: true }); navigation.goBack(); return; }
    const pkg = packages.find((p) => p.identifier === plan) || packages[0];
    if (!pkg || busy) return;
    setBusy(true);
    const res = await purchases.purchase(pkg);
    setBusy(false);
    if (res.ok) { H.success(); setMe({ gold: true }); navigation.goBack(); }
    else if (!res.cancelled) Alert.alert('Purchase failed', res.error || 'Please try again.');
  };

  const restore = async () => {
    const res = await purchases.restore();
    if (res.ok) { setMe({ gold: true }); H.success(); navigation.goBack(); }
    else Alert.alert('Nothing to restore', 'No previous Gold purchase was found.');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#161618', '#0E0E10', '#161618']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}>
        <IslamicPattern color="#FFFFFF" opacity={0.06} tile={52} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => navigation.goBack()} style={[styles.close, { top: insets.top + 8 }]}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: 30, paddingTop: insets.top + 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Butterfly size={110} colorA="#F0F0F2" colorB="#B4B4B8" />
          <LinearGradient colors={GRAD.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goldTag}>
            <Ionicons name="diamond" size={16} color="#fff" />
            <Text style={styles.goldTagText}>VEILED GOLD</Text>
          </LinearGradient>
          <Text style={styles.heroTitle}>Find the one,{'\n'}faster</Text>
          <Text style={styles.heroSub}>Supercharge your matchmaker and stand out</Text>
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
          {iapEnabled && packages.map((pkg) => {
            const best = pkg.packageType === 'ANNUAL';
            return (
              <Pressable key={pkg.identifier} onPress={() => { setPlan(pkg.identifier); H.select(); }} style={[styles.plan, plan === pkg.identifier && styles.planActive]}>
                {best && <View style={styles.bestTag}><Text style={styles.bestText}>BEST VALUE</Text></View>}
                <View style={{ flex: 1 }}>
                  <Text style={styles.planLabel}>{PKG_LABEL[pkg.packageType] || pkg.product?.title || 'Gold'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.planPrice}>{pkg.product?.priceString}<Text style={styles.planPer}>{PKG_PER[pkg.packageType] || ''}</Text></Text>
                </View>
                <View style={[styles.radio, plan === pkg.identifier && styles.radioOn]}>{plan === pkg.identifier && <Ionicons name="checkmark" size={14} color="#16121C" />}</View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: SPACE.xl, marginTop: 20 }}>
          <GButton
            label={busy ? 'Processing…' : iapEnabled ? 'Continue' : 'Join Gold — free during launch'}
            gradient={GRAD.gold} onPress={subscribe} textStyle={{ color: '#16121C' }} disabled={busy}
          />
          {iapEnabled && (
            <Pressable onPress={restore} style={{ paddingVertical: 12 }}>
              <Text style={styles.restore}>Restore purchases</Text>
            </Pressable>
          )}
          <Text style={styles.terms}>
            {iapEnabled
              ? 'Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your App Store settings.'
              : 'Gold is free while Veiled launches — paid plans coming later'}
          </Text>
          {/* App Store 3.1.2 requires functional Terms of Use + Privacy
              Policy links wherever a subscription is offered. */}
          <View style={styles.legalRow}>
            <Pressable onPress={() => { H.tap(); Linking.openURL(TERMS_URL).catch(() => {}); }}>
              <Text style={styles.legalLink}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => { H.tap(); Linking.openURL(PRIVACY_URL).catch(() => {}); }}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
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
  planActive: { borderColor: '#E8E8EA', backgroundColor: 'rgba(255,255,255,0.10)' },
  bestTag: { position: 'absolute', top: -10, left: 16, backgroundColor: M.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  bestText: { color: '#16121C', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  planLabel: { color: '#fff', fontWeight: '800', fontSize: 16 },
  planSave: { color: M.gold, fontWeight: '700', fontSize: 12, marginTop: 2 },
  planPrice: { color: '#fff', fontWeight: '900', fontSize: 18 },
  planPer: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  radioOn: { backgroundColor: M.gold, borderColor: M.gold },
  terms: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 14 },
  restore: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  legalLink: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  legalDot: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});
