import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE, gradVariantFor } from '../theme';
import { useMuzz, getPerson } from '../store';
import { scoreMatch, compatLabel } from '../butterfly';
import { PhotoTile, Verified, Chip } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

export default function ProfileDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { personId } = route.params;
  const { me, matches, feedback, likePerson, passPerson, likesRemaining } = useMuzz();
  const [photoIdx, setPhotoIdx] = React.useState(0);
  const person = getPerson(personId);
  if (!person) return null;
  const photoCount = Math.max(1, Math.min(5, person.photos?.length || 3));
  const isMatch = matches.includes(personId);
  const compat = scoreMatch(me, person, feedback);

  const onLike = () => {
    if (likesRemaining() <= 0) {
      H.tap();
      navigation.navigate('MuzzGold');
      return;
    }
    likePerson(personId, { mutual: true });
    navigation.replace('MuzzMatchReveal', { personId, score: compat.score });
  };
  const onPass = () => { passPerson(personId); H.tap(); navigation.goBack(); };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Hero photo gallery: tap left/right halves to flick through */}
        <PhotoTile
          seed={person.id} name={person.name} rounded={0} silhouette={320}
          uri={person.photos?.[photoIdx]} gradient={gradVariantFor(person.id, photoIdx)}
          style={{ height: width * 1.15 }}
        >
          <View style={styles.heroTapRow}>
            <Pressable style={{ flex: 1 }} onPress={() => setPhotoIdx((i) => Math.max(0, i - 1))} />
            <Pressable style={{ flex: 1 }} onPress={() => setPhotoIdx((i) => Math.min(photoCount - 1, i + 1))} />
          </View>
          <View style={[styles.heroPager, { top: insets.top + 2 }]}>
            {[...Array(photoCount)].map((_, i) => (
              <View key={i} style={[styles.heroPagerSeg, i === photoIdx && styles.heroPagerSegOn]} />
            ))}
          </View>
          <LinearGradient colors={['rgba(0,0,0,0.25)', 'transparent', 'transparent', 'rgba(20,16,26,0.85)']} style={StyleSheet.absoluteFill} />
          <Pressable onPress={() => navigation.goBack()} style={[styles.back, { top: insets.top + 8 }]}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
          <View style={[styles.matchPill, { top: insets.top + 10 }]}>
            <Ionicons name="sparkles" size={13} color="#fff" />
            <Text style={styles.matchPillText}>{compat.score}% · {compatLabel(compat.score)}</Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.heroName}>{person.name}, {person.age}</Text>
              {person.verified && <View style={{ marginLeft: 8 }}><Verified size={20} /></View>}
              {person.online && <View style={styles.onlineTag}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Online</Text></View>}
            </View>
            <View style={styles.heroMeta}>
              <Ionicons name="briefcase" size={14} color="#fff" />
              <Text style={styles.heroMetaText}>{person.job}</Text>
              <Ionicons name="location" size={14} color="#fff" style={{ marginLeft: 12 }} />
              <Text style={styles.heroMetaText}>{person.distance} mi away</Text>
            </View>
          </View>
        </PhotoTile>

        {/* Rounded content sheet overlapping the hero */}
        <View style={styles.sheet}>
        {/* Butterfly insight */}
        <Animated.View entering={FadeInDown} style={styles.insight}>
          <View style={styles.insightHead}>
            <View style={styles.bfBadge}><Ionicons name="sparkles" size={14} color="#fff" /></View>
            <Text style={styles.insightTitle}>Butterfly's take</Text>
          </View>
          {compat.reasons.slice(0, 3).map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle" size={16} color={M.success} />
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </Animated.View>

        {/* About */}
        {person.bio ? (
          <Section title="About">
            <Text style={styles.bio}>{person.bio}</Text>
          </Section>
        ) : null}

        {/* Quick facts */}
        <Section title="Details">
          <View style={styles.facts}>
            <Fact icon="resize" label="Height" value={person.height} />
            <Fact icon="heart-circle" label="Intent" value={person.intention} />
            <Fact icon="language" label="Speaks" value={person.languages.join(', ')} />
            <Fact icon="business" label="City" value={person.city} />
          </View>
        </Section>

        {/* Deen — core to Muzz */}
        <Section title="Deen">
          <View style={styles.facts}>
            <Fact icon="moon" label="Sect" value={person.sect} />
            <Fact icon="time" label="Prayer" value={person.prayerLevel} />
            <Fact icon="restaurant" label="Halal diet" value={person.halalDiet} />
            <Fact icon="earth" label="Ethnicity" value={person.ethnicity} />
          </View>
        </Section>

        {/* Interests */}
        <Section title="Interests">
          <View style={styles.wrap}>
            {person.interests.map((i) => (
              <Chip key={i} label={i} active={(me.interests || []).includes(i)} />
            ))}
          </View>
        </Section>

        {/* Values */}
        <Section title="Values">
          <View style={styles.wrap}>
            {person.values.map((v) => <Chip key={v} label={v} color={M.butterfly} active={(me.values || []).includes(v)} />)}
          </View>
        </Section>

        {/* Prompts */}
        {(person.prompts || []).map((p, i) => (
          <Section key={i} title={p.q}>
            <Text style={styles.promptA}>"{p.a}"</Text>
          </Section>
        ))}

        <Pressable onPress={H.tap} style={styles.report}>
          <Ionicons name="flag-outline" size={16} color={M.textMuted} />
          <Text style={styles.reportText}>Report or block</Text>
        </Pressable>
        </View>
      </ScrollView>

      {/* Action bar */}
      {!isMatch ? (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={onPass} style={[styles.actBtn, styles.passBtn]}><Ionicons name="close" size={28} color={M.textSoft} /></Pressable>
          <Pressable onPress={() => { H.press(); onLike(); }} style={[styles.actBtn, styles.superBtn]}><Ionicons name="star" size={22} color="#fff" /></Pressable>
          <Pressable onPress={() => { H.press(); onLike(); }} style={[styles.actBtn, styles.likeBtn]}><Ionicons name="heart" size={28} color="#fff" /></Pressable>
        </View>
      ) : (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={() => navigation.navigate('MuzzChat', { personId })} style={styles.msgBtn}>
            <LinearGradient colors={GRAD.primary} style={styles.msgGrad}>
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={styles.msgText}>Message {person.name}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Fact({ icon, label, value }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={18} color={M.primary} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  heroTapRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  heroPager: { position: 'absolute', top: 8, left: 14, right: 14, flexDirection: 'row', gap: 5 },
  heroPagerSeg: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  heroPagerSegOn: { backgroundColor: '#fff' },
  back: { position: 'absolute', left: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  matchPill: { position: 'absolute', right: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(139,92,246,0.92)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill },
  matchPillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  heroInfo: { position: 'absolute', left: SPACE.xl, right: SPACE.xl, bottom: 20 },
  heroName: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  onlineTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 10 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: M.online },
  onlineText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  heroMetaText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 5 },
  sheet: {
    marginTop: -26, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: M.bg, paddingTop: 8,
  },
  insight: { margin: SPACE.xl, marginBottom: 4, backgroundColor: M.butterflySoft, borderRadius: RADIUS.lg, padding: 18 },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bfBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: M.butterfly, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { ...TYPE.h3, color: M.butterfly },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  reasonText: { ...TYPE.body, flex: 1, fontWeight: '600' },
  section: { paddingHorizontal: SPACE.xl, paddingTop: 22 },
  sectionTitle: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  bio: { ...TYPE.body, fontSize: 16, lineHeight: 24 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { width: (width - SPACE.xl * 2 - 10) / 2, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 14 },
  factLabel: { ...TYPE.caption, marginTop: 8 },
  factValue: { ...TYPE.h3, fontSize: 15, marginTop: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  promptA: { ...TYPE.h2, fontSize: 19, fontWeight: '700', lineHeight: 27, color: M.text },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 30 },
  reportText: { ...TYPE.soft, color: M.textMuted, fontWeight: '600' },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 12, backgroundColor: M.bg, borderTopWidth: 1, borderTopColor: M.border },
  actBtn: { alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  passBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', borderWidth: 1.5, borderColor: M.border },
  superBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: M.blue },
  likeBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: M.primary, ...SHADOW.primary },
  msgBtn: { flex: 1 },
  msgGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: RADIUS.pill },
  msgText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
