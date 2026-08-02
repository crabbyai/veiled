import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
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
// Hinge leans on an editorial serif for prompt answers.
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const ROSE = M.rose;
const ROSE_DEEP = M.roseDeep;

// Small round "like this" heart, bottom-right of each card (Hinge).
function LikeHeart({ onPress, label }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label || "Like this"} onPress={onPress} style={styles.heart} hitSlop={8}>
      <Ionicons name="heart-outline" size={22} color="#fff" />
    </Pressable>
  );
}

export default function ProfileDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { personId } = route.params;
  const {
    me, matches, feedback, likePerson, passPerson, likesRemaining,
    isUnveiled, markProfileRead, reportPerson, blockPerson, sendRose, roses,
  } = useMuzz();
  const person = getPerson(personId);
  // Signals: opening a full profile counts as a genuine read.
  React.useEffect(() => { if (person) markProfileRead(personId); }, [personId]);

  const [like, setLike] = React.useState(null); // { type, ref, label }
  const [comment, setComment] = React.useState('');

  if (!person) return null;
  const photos = person.photos || [];
  const photoCount = Math.max(1, Math.min(6, photos.length || 3));
  const isMatch = matches.includes(personId);
  const unveiled = isUnveiled(personId);
  const veiled = !!person.photoVeiled && !unveiled;
  const compat = scoreMatch(me, person, feedback);
  const prompts = person.prompts || [];

  const openLike = (type, ref, label) => { H.tap(); setComment(''); setLike({ type, ref, label }); };
  const closeLike = () => setLike(null);

  const doLike = () => {
    if (likesRemaining() <= 0) { setLike(null); navigation.navigate('MuzzGold'); return; }
    const c = comment.trim() || null;
    const info = like || { type: 'profile', ref: 'profile' };
    setLike(null);
    likePerson(personId, { mutual: true, comment: c, contentType: info.type, contentRef: String(info.ref) });
    H.success();
    navigation.replace('MuzzMatchReveal', { personId, score: compat.score });
  };

  const doRose = () => {
    if (!me.gold && (roses || 0) <= 0) { setLike(null); navigation.navigate('MuzzGold'); return; }
    const c = comment.trim() || null;
    const info = like || { type: 'profile', ref: 'profile' };
    setLike(null);
    const ok = sendRose(personId, { comment: c, contentType: info.type, contentRef: String(info.ref) });
    if (ok) { H.success(); navigation.replace('MuzzMatchReveal', { personId, score: compat.score, rose: true }); }
  };

  const onPass = () => { passPerson(personId); H.tap(); navigation.goBack(); };

  const onMenu = () => {
    H.tap();
    const done = (msg) => { navigation.goBack(); setTimeout(() => Alert.alert('Thank you', msg), 250); };
    Alert.alert(person.name, undefined, [
      { text: 'Report', onPress: () => { reportPerson(personId, 'inappropriate'); done('Your report has been sent to our team.'); } },
      { text: 'Block', style: 'destructive', onPress: () => { blockPerson(personId, 'Blocked from profile'); done(`You won't see ${person.name} again.`); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Vitals list (Hinge-style): only rows we actually have.
  const vitals = [
    ['book-outline', person.sect],
    ['home-outline', person.city],
    ['moon-outline', person.prayerLevel],
    ['globe-outline', person.ethnicity],
    ['search-outline', person.intention],
    ['restaurant-outline', person.halalDiet],
    ['chatbubbles-outline', (person.languages || []).join(', ')],
  ].filter(([, v]) => v && v !== 'Prefer not to say' && v !== 'Other');

  // A photo card with its own like heart.
  const PhotoCard = ({ idx }) => (
    <View style={styles.card}>
      <PhotoTile
        seed={person.id} name={person.name} rounded={RADIUS.lg} figure={veiled ? null : person.veil}
        uri={photos[idx]} gradient={gradVariantFor(person.id, idx)} pattern veiled={veiled}
        veilLabel={isMatch ? `${person.name} keeps her photos veiled` : `Veiled until you match`}
        style={styles.photo}
      />
      {!isMatch && <LikeHeart label="Like this photo" onPress={() => openLike('photo', idx, 'this photo')} />}
    </View>
  );

  // A prompt card (editorial serif answer) with its own like heart.
  const PromptCard = ({ idx }) => {
    const p = prompts[idx];
    if (!p) return null;
    return (
      <View style={[styles.card, styles.promptCard]}>
        <Text style={styles.promptQ}>{p.q}</Text>
        <Text style={styles.promptA}>{p.a}</Text>
        {!isMatch && <LikeHeart label={`Like the answer to ${p.q}`} onPress={() => openLike('prompt', idx, `“${p.q}”`)} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.topName} numberOfLines={1}>{person.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={onMenu} style={styles.iconBtn}><Ionicons name="ellipsis-horizontal" size={22} color={M.text} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Identity header */}
        <View style={styles.idHead}>
          <Text style={styles.bigName}>{person.name}</Text>
          <View style={styles.idMeta}>
            <VeilBadge veil={person.veil} size="sm" />
            {person.verified && (
              <View style={styles.verifiedRow}>
                <Verified size={14} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {person.online && <View style={styles.onlineRow}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Online</Text></View>}
          </View>
        </View>

        {/* Compatibility ribbon */}
        <Animated.View entering={FadeInDown} style={styles.compat}>
          <Ionicons name="sparkles" size={15} color={M.butterfly} />
          <Text style={styles.compatText}>{compat.score}% · {compatLabel(compat.score)}</Text>
          {compat.reasons[0] ? <Text style={styles.compatReason} numberOfLines={1}>· {compat.reasons[0]}</Text> : null}
        </Animated.View>

        {/* Card 1: first photo */}
        <PhotoCard idx={0} />

        {/* About */}
        {person.bio ? (
          <View style={[styles.card, styles.aboutCard]}>
            <Text style={styles.aboutText}>{person.bio}</Text>
          </View>
        ) : null}

        {/* Card: first prompt */}
        <PromptCard idx={0} />

        {/* Second photo */}
        {photoCount > 1 && <PhotoCard idx={1} />}

        {/* Vitals card (Hinge) */}
        <View style={[styles.card, styles.vitals]}>
          <View style={styles.vitalsTop}>
            <View style={styles.vCell}><Ionicons name="ellipse-outline" size={18} color={M.text} /><Text style={styles.vCellText}>{person.age}</Text></View>
            <View style={[styles.vCell, styles.vCellMid]}><Ionicons name="person-outline" size={18} color={M.text} /><Text style={styles.vCellText}>Woman</Text></View>
            <View style={styles.vCell}><Ionicons name="resize-outline" size={18} color={M.text} /><Text style={styles.vCellText}>{person.height || '—'}</Text></View>
          </View>
          {vitals.map(([icon, val], i) => (
            <View key={i} style={[styles.vRow, i < vitals.length - 1 && styles.vRowBorder]}>
              <Ionicons name={icon} size={20} color={M.text} />
              <Text style={styles.vRowText}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Card: second prompt */}
        <PromptCard idx={1} />

        {/* Third photo */}
        {photoCount > 2 && <PhotoCard idx={2} />}

        {/* Interests + values */}
        {(person.interests || []).length > 0 && (
          <View style={[styles.card, styles.aboutCard]}>
            <Text style={styles.cardLabel}>Interests</Text>
            <View style={styles.wrap}>
              {person.interests.map((i) => <Chip key={i} label={i} active={(me.interests || []).includes(i)} />)}
            </View>
            {(person.values || []).length > 0 && (
              <>
                <Text style={[styles.cardLabel, { marginTop: 14 }]}>Values</Text>
                <View style={styles.wrap}>
                  {person.values.map((v) => <Chip key={v} label={v} color={M.butterfly} active={(me.values || []).includes(v)} />)}
                </View>
              </>
            )}
          </View>
        )}

        {/* Remaining prompts */}
        {prompts.slice(2).map((_, i) => <PromptCard key={i} idx={i + 2} />)}

        {/* Remaining photos */}
        {[...Array(Math.max(0, photoCount - 3))].map((_, i) => <PhotoCard key={i} idx={i + 3} />)}

        {/* Friend's Take */}
        {(person.friendTakes || []).length > 0 && (
          <View style={[styles.card, styles.aboutCard]}>
            <Text style={styles.cardLabel}>Friend's Take</Text>
            {person.friendTakes.map((t, i) => (
              <View key={i} style={styles.takeCard}>
                {t.kind === 'voice' ? (
                  <View style={styles.takeVoice}>
                    <View style={styles.takePlay}><Ionicons name="play" size={14} color={M.textOnPrimary} /></View>
                    <View style={styles.takeWave}>{[...Array(16)].map((_, j) => <View key={j} style={[styles.takeBar, { height: 4 + ((j * 5) % 14) }]} />)}</View>
                    <Text style={styles.takeSecs}>0:{String(t.secs).padStart(2, '0')}</Text>
                  </View>
                ) : (
                  <Text style={styles.takeText}>“{t.text}”</Text>
                )}
                <View style={styles.takeBy}><Ionicons name="people" size={13} color={M.textSoft} /><Text style={styles.takeByText}>{t.by || t.author} · {t.rel || t.relationship}</Text></View>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={onMenu} style={styles.report}>
          <Ionicons name="flag-outline" size={16} color={M.textMuted} />
          <Text style={styles.reportText}>Report or block {person.name}</Text>
        </Pressable>
      </ScrollView>

      {/* Floating pass (X) — Hinge places it bottom-left */}
      {!isMatch && (
        <Pressable accessibilityRole="button" accessibilityLabel="Pass on this profile" onPress={onPass} style={[styles.passFab, { bottom: insets.bottom + 20 }]}>
          <Ionicons name="close" size={30} color={M.text} />
        </Pressable>
      )}

      {/* Matched: message bar */}
      {isMatch && (
        <View style={[styles.msgBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable onPress={() => navigation.navigate('MuzzChat', { personId })} style={{ flex: 1 }}>
            <LinearGradient colors={GRAD.primary} style={styles.msgGrad}>
              <Ionicons name="chatbubble" size={18} color={M.textOnPrimary} />
              <Text style={styles.msgText}>Message {person.name}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Like sheet — comment + "Send a Rose instead?" (Hinge) */}
      <Modal visible={!!like} transparent animationType="slide" onRequestClose={closeLike}>
        <Pressable style={styles.sheetBg} onPress={closeLike}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              {!!(like && like.label) && (
                <View style={styles.likingRow}>
                  <Ionicons name="heart" size={14} color={ROSE} />
                  <Text style={styles.likingText} numberOfLines={1}>Liking {like.label}</Text>
                </View>
              )}
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add a comment"
                placeholderTextColor={M.textMuted}
                style={styles.sheetInput}
                multiline
                maxLength={500}
              />

              <View style={styles.roseCircle}><Ionicons name="rose" size={26} color="#fff" /></View>
              <Text style={styles.roseTitle}>Send a Rose instead?</Text>
              <Text style={styles.roseSub}>Upgrade your Like to a Rose to be seen first and increase your chance of a match.</Text>

              <Pressable onPress={doRose} style={styles.roseBtn}>
                <Text style={styles.roseBtnText}>Send a Rose{!me.gold ? `  ·  ${roses || 0}` : ''}</Text>
              </Pressable>
              <Pressable onPress={doLike} style={styles.likeAnyway}>
                <Text style={styles.likeAnywayText}>{comment.trim() ? 'Send Like with comment' : 'Send Like anyway'}</Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bgSoft },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 8, backgroundColor: M.bg, borderBottomWidth: 1, borderBottomColor: M.border },
  iconBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  topName: { ...TYPE.h3, fontSize: 18, flex: 1, textAlign: 'center' },

  idHead: { marginBottom: 12, marginTop: 4 },
  bigName: { fontSize: 34, fontWeight: '900', color: M.text, letterSpacing: -0.8 },
  idMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: M.butterfly, fontWeight: '800', fontSize: 13 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: M.online },
  onlineText: { ...TYPE.caption, color: M.online, fontWeight: '700' },

  compat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  compatText: { ...TYPE.body, fontWeight: '800', color: M.text },
  compatReason: { ...TYPE.soft, color: M.textSoft, flex: 1 },

  card: { backgroundColor: M.bg, borderRadius: RADIUS.lg, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: M.border, ...SHADOW.card },
  photo: { width: '100%', height: width * 1.1 },
  heart: { position: 'absolute', right: 12, bottom: 12, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(26,22,30,0.82)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },

  promptCard: { padding: 22, paddingBottom: 30, minHeight: 150, justifyContent: 'center' },
  promptQ: { ...TYPE.soft, color: M.textSoft, fontSize: 15, marginBottom: 10 },
  promptA: { fontFamily: SERIF, fontSize: 28, lineHeight: 36, color: M.text },

  aboutCard: { padding: 18 },
  aboutText: { ...TYPE.body, fontSize: 16, lineHeight: 24, color: M.text },
  cardLabel: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, fontWeight: '800' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },

  vitals: { padding: 0 },
  vitalsTop: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: M.border },
  vCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  vCellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: M.border },
  vCellText: { ...TYPE.h3, fontSize: 16 },
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 16 },
  vRowBorder: { borderBottomWidth: 1, borderBottomColor: M.border },
  vRowText: { ...TYPE.h3, fontSize: 17, fontWeight: '600' },

  takeCard: { backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 14, marginTop: 10, borderWidth: 1, borderColor: M.border },
  takeText: { ...TYPE.body, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  takeVoice: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  takePlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  takeWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  takeBar: { width: 2.5, borderRadius: 2, backgroundColor: M.primaryLight },
  takeSecs: { ...TYPE.caption, fontWeight: '800' },
  takeBy: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  takeByText: { ...TYPE.caption, fontWeight: '700', color: M.textSoft },

  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 6 },
  reportText: { ...TYPE.soft, color: M.textMuted, fontWeight: '600' },

  passFab: { position: 'absolute', left: 20, width: 62, height: 62, borderRadius: 31, backgroundColor: M.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: M.border, ...SHADOW.card },

  msgBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SPACE.xl, paddingTop: 12, backgroundColor: M.bg, borderTopWidth: 1, borderTopColor: M.border },
  msgGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: RADIUS.pill },
  msgText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },

  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: M.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: SPACE.xl, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, marginBottom: 16 },
  likingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8 },
  likingText: { ...TYPE.soft, color: M.textSoft, fontWeight: '700', flexShrink: 1 },
  sheetInput: { ...TYPE.body, alignSelf: 'stretch', minHeight: 60, maxHeight: 140, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, padding: 14, textAlignVertical: 'top', marginBottom: 22 },
  roseCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: ROSE, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  roseTitle: { fontFamily: SERIF, fontSize: 30, color: M.text, textAlign: 'center', marginBottom: 10 },
  roseSub: { ...TYPE.body, color: M.textSoft, textAlign: 'center', lineHeight: 22, marginBottom: 22, paddingHorizontal: 8 },
  roseBtn: { alignSelf: 'stretch', backgroundColor: ROSE, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center' },
  roseBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  likeAnyway: { paddingVertical: 16 },
  likeAnywayText: { color: ROSE, fontWeight: '800', fontSize: 15 },
});
