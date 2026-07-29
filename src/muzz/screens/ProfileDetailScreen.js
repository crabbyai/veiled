import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE, gradVariantFor } from '../theme';
import { useMuzz, getPerson } from '../store';
import { scoreMatch, compatLabel } from '../butterfly';
import { PhotoTile, Verified, Chip, VeilBadge } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

export default function ProfileDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { personId } = route.params;
  const { me, matches, feedback, likePerson, passPerson, likesRemaining, isUnveiled, markProfileRead, reportPerson, blockPerson, sendRose, roses } = useMuzz();
  const [commentFor, setCommentFor] = React.useState(null); // { type, ref, label }
  const [commentText, setCommentText] = React.useState('');
  const [photoIdx, setPhotoIdx] = React.useState(0);
  const person = getPerson(personId);
  // Signals: opening a full profile counts as a genuine read.
  React.useEffect(() => { if (person) markProfileRead(personId); }, [personId]);
  if (!person) return null;
  const photoCount = Math.max(1, Math.min(5, person.photos?.length || 3));
  const isMatch = matches.includes(personId);
  const unveiled = isUnveiled(personId);
  const veiled = !!person.photoVeiled && !unveiled;
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

  // Hinge: like a specific prompt/photo, optionally with a comment.
  const openComment = (type, ref, label) => { H.tap(); setCommentText(''); setCommentFor({ type, ref, label }); };
  const sendComment = () => {
    if (!commentFor) return;
    if (likesRemaining() <= 0) { setCommentFor(null); navigation.navigate('MuzzGold'); return; }
    const comment = commentText.trim() || null;
    const { type, ref } = commentFor;
    setCommentFor(null);
    likePerson(personId, { mutual: true, comment, contentType: type, contentRef: String(ref) });
    H.success();
    navigation.replace('MuzzMatchReveal', { personId, score: compat.score });
  };

  // Rose (Hinge): a standout like. Out of Roses → Gold.
  const onRose = () => {
    H.press();
    if (!me.gold && (roses || 0) <= 0) { navigation.navigate('MuzzGold'); return; }
    const ok = sendRose(personId, {});
    if (ok) navigation.replace('MuzzMatchReveal', { personId, score: compat.score, rose: true });
  };

  // Report or block — files a moderation report and removes the profile.
  const onReport = () => {
    H.tap();
    const done = (msg) => { navigation.goBack(); setTimeout(() => Alert.alert('Thank you', msg), 250); };
    Alert.alert(
      `Report or block ${person.name}?`,
      'This sends a report to our moderation team. You can also block so you never see each other again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', onPress: () => { reportPerson(personId, 'inappropriate'); done('Your report has been sent to our team.'); } },
        { text: 'Block', style: 'destructive', onPress: () => { blockPerson(personId, 'Blocked from profile'); done(`You won't see ${person.name} again.`); } },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Hero photo gallery: tap left/right halves to flick through */}
        <PhotoTile
          seed={person.id} name={person.name} rounded={0} figure={veiled ? null : person.veil}
          uri={person.photos?.[photoIdx]} gradient={gradVariantFor(person.id, photoIdx)}
          style={{ height: width * 1.15 }}
          pattern
          veiled={veiled}
          veilLabel={isMatch ? `${person.name} keeps her photos veiled\nAsk her to unveil in chat` : `${person.name}'s photos are veiled\nShe can unveil them once you match`}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <VeilBadge veil={person.veil} />
              {person.photoVeiled && unveiled && (
                <View style={styles.unveiledTag}>
                  <Ionicons name="eye" size={12} color="#fff" />
                  <Text style={styles.unveiledText}>Unveiled for you</Text>
                </View>
              )}
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
        {/* Photo gallery thumbnails — frosted until unveiled */}
        <View style={styles.thumbs}>
          {[...Array(photoCount)].map((_, i) => (
            <Pressable key={i} onPress={() => { H.select(); setPhotoIdx(i); }}>
              <PhotoTile
                seed={person.id} name={person.name} rounded={RADIUS.md}
                gradient={gradVariantFor(person.id, i)} veiled={veiled}
                silhouette={veiled ? 0 : 26}
                style={[styles.thumb, i === photoIdx && styles.thumbOn]}
              />
            </Pressable>
          ))}
        </View>
        {/* Butterfly insight */}
        <Animated.View entering={FadeInDown} style={styles.insight}>
          <View style={styles.insightHead}>
            <View style={styles.bfBadge}><Ionicons name="sparkles" size={14} color="#fff" /></View>
            <Text style={styles.insightTitle}>Matchmaker's take</Text>
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

        {/* Deen — core to Veiled */}
        <Section title="Deen & Modesty">
          <View style={styles.facts}>
            <Fact icon="flower" label="Veil" value={person.veil === 'Niqab' ? 'Niqabi' : 'Hijabi'} />
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

        {/* Friend's Take — family & friends vouch for her */}
        {(person.friendTakes || []).length > 0 && (
          <Section title="Friend's Take">
            {(person.friendTakes || []).map((t, i) => (
              <View key={i} style={styles.takeCard}>
                {t.kind === 'voice' ? (
                  <View style={styles.takeVoice}>
                    <View style={styles.takePlay}><Ionicons name="play" size={15} color={M.textOnPrimary} /></View>
                    <View style={styles.takeWave}>
                      {[...Array(16)].map((_, j) => (
                        <View key={j} style={[styles.takeBar, { height: 4 + ((j * 5) % 14) }]} />
                      ))}
                    </View>
                    <Text style={styles.takeSecs}>0:{String(t.secs).padStart(2, '0')}</Text>
                  </View>
                ) : (
                  <Text style={styles.takeText}>“{t.text}”</Text>
                )}
                <View style={styles.takeBy}>
                  <Ionicons name="people" size={13} color={M.textSoft} />
                  <Text style={styles.takeByText}>{t.by} · {t.rel}</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* Prompts — tap the heart to like this answer with a comment */}
        {(person.prompts || []).map((p, i) => (
          <Section key={i} title={p.q}>
            <View style={styles.promptRow}>
              <Text style={[styles.promptA, { flex: 1 }]}>"{p.a}"</Text>
              {!isMatch && (
                <Pressable onPress={() => openComment('prompt', i, `on "${p.q}"`)} style={styles.promptLike}>
                  <Ionicons name="heart-outline" size={20} color={M.primary} />
                </Pressable>
              )}
            </View>
          </Section>
        ))}

        <Pressable onPress={onReport} style={styles.report}>
          <Ionicons name="flag-outline" size={16} color={M.textMuted} />
          <Text style={styles.reportText}>Report or block</Text>
        </Pressable>
        </View>
      </ScrollView>

      {/* Action bar */}
      {!isMatch ? (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={onPass} style={[styles.actBtn, styles.passBtn]}><Ionicons name="close" size={28} color={M.textSoft} /></Pressable>
          <Pressable onPress={onRose} style={[styles.actBtn, styles.roseBtn]}>
            <Ionicons name="rose" size={22} color="#fff" />
            {!me.gold && <View style={styles.roseCount}><Text style={styles.roseCountText}>{roses || 0}</Text></View>}
          </Pressable>
          <Pressable onPress={() => openComment('profile', 'profile', '')} style={[styles.actBtn, styles.superBtn]}><Ionicons name="chatbubble-ellipses" size={20} color={M.textOnPrimary} /></Pressable>
          <Pressable onPress={() => { H.press(); onLike(); }} style={[styles.actBtn, styles.likeBtn]}><Ionicons name="heart" size={28} color={M.textOnPrimary} /></Pressable>
        </View>
      ) : (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={() => navigation.navigate('MuzzChat', { personId })} style={styles.msgBtn}>
            <LinearGradient colors={GRAD.primary} style={styles.msgGrad}>
              <Ionicons name="chatbubble" size={18} color={M.textOnPrimary} />
              <Text style={styles.msgText}>Message {person.name}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Hinge comment sheet — like with a message on a prompt/photo */}
      <Modal visible={!!commentFor} transparent animationType="slide" onRequestClose={() => setCommentFor(null)}>
        <Pressable style={styles.sheetBg} onPress={() => setCommentFor(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation?.()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Send a like to {person.name}</Text>
              {!!(commentFor && commentFor.label) && <Text style={styles.sheetSub}>Liking {commentFor.label}</Text>}
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment (optional) — say salaam, ask about her answer…"
                placeholderTextColor={M.textMuted}
                style={styles.sheetInput}
                multiline
                maxLength={500}
                autoFocus
              />
              <Pressable onPress={sendComment} style={styles.sheetSend}>
                <LinearGradient colors={GRAD.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sheetSendGrad}>
                  <Ionicons name="heart" size={18} color={M.textOnPrimary} />
                  <Text style={styles.sheetSendText}>{commentText.trim() ? 'Send Like with comment' : 'Send Like'}</Text>
                </LinearGradient>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
  matchPill: { position: 'absolute', right: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(17,17,17,0.92)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill },
  matchPillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  unveiledTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(17,17,17,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  unveiledText: { color: '#fff', fontWeight: '800', fontSize: 11.5 },
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
  thumbs: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACE.xl, paddingTop: 16 },
  thumb: { flex: 1, aspectRatio: 0.82, opacity: 0.7 },
  thumbOn: { opacity: 1, borderWidth: 2, borderColor: M.primary },
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
  promptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  promptLike: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: M.border, alignItems: 'center', justifyContent: 'center', backgroundColor: M.bg },
  takeCard: { backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: M.border },
  takeText: { ...TYPE.body, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  takeVoice: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  takePlay: { width: 32, height: 32, borderRadius: 16, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  takeWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  takeBar: { width: 2.5, borderRadius: 2, backgroundColor: M.primaryLight },
  takeSecs: { ...TYPE.caption, fontWeight: '800' },
  takeBy: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  takeByText: { ...TYPE.caption, fontWeight: '700', color: M.textSoft },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 30 },
  reportText: { ...TYPE.soft, color: M.textMuted, fontWeight: '600' },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 12, backgroundColor: M.bg, borderTopWidth: 1, borderTopColor: M.border },
  actBtn: { alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  passBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: M.bgElevated, borderWidth: 1.5, borderColor: M.border },
  superBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: M.blue },
  roseBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#C2447A' },
  roseCount: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: M.bg, borderWidth: 1, borderColor: '#C2447A', alignItems: 'center', justifyContent: 'center' },
  roseCountText: { fontSize: 10, fontWeight: '900', color: '#C2447A' },
  likeBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: M.primary, ...SHADOW.primary },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: M.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACE.xl },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, marginBottom: 16 },
  sheetTitle: { ...TYPE.h2, fontSize: 20 },
  sheetSub: { ...TYPE.soft, color: M.textSoft, marginTop: 4 },
  sheetInput: { ...TYPE.body, minHeight: 90, maxHeight: 160, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, padding: 14, marginTop: 16, textAlignVertical: 'top' },
  sheetSend: { marginTop: 16 },
  sheetSendGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: RADIUS.pill },
  sheetSendText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
  msgBtn: { flex: 1 },
  msgGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: RADIUS.pill },
  msgText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
});
