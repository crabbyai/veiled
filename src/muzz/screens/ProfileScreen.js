import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, TextInput, Modal, Share, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import * as api from '../api';
import { INTERESTS, VALUES } from '../data';
import { PhotoTile, Verified, Chip, GButton, OButton } from '../components/ui';
import Butterfly from '../components/Butterfly';
import { pickAndUpload } from '../photos';
import * as H from '../haptics';

const { width } = Dimensions.get('window');
const GRID_W = (width - SPACE.xl * 2 - 20) / 3;

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const muzz = useMuzz();
  const { me, matches, butterflyAuto, update, setMe, resetAll, addPhoto, removePhoto, chats, signalsReads } = muzz;
  const [edit, setEdit] = useState(false);
  const [invited, setInvited] = useState(false);

  // Signals: earned by reading full profiles and actually replying.
  const reads = (signalsReads || []).length;
  const convos = Object.keys(chats || {}).filter((id) => (chats[id] || []).some((m) => m.sender === 'me')).length;
  const signalScore = reads + convos * 2;
  const signalLevel = signalScore >= 12 ? 'Exemplary' : signalScore >= 7 ? 'Intentional' : signalScore >= 3 ? 'Attentive' : 'Getting started';
  const signalNext = signalScore >= 12 ? null : signalScore >= 7 ? 12 : signalScore >= 3 ? 7 : 3;
  const [bio, setBio] = useState(me.bio);
  const [job, setJob] = useState(me.job);
  const [interests, setInterests] = useState(me.interests || []);
  const [values, setValues] = useState(me.values || []);

  const photos = me.photos || [];
  const addPhotoTap = async () => {
    const uri = await pickAndUpload();
    if (uri) { addPhoto(uri); H.success(); }
  };

  // Friend's Take: mint a real invite and open the native share sheet so
  // family/friends can vouch from a web page — no app or account needed.
  const [inviting, setInviting] = useState(false);
  const onInvite = async () => {
    if (inviting) return;
    H.press();
    if (!api.isConfigured()) {
      Alert.alert(
        'Friend\'s Take',
        'Connect Veiled to your account to generate a shareable vouch link for family and friends.',
      );
      return;
    }
    try {
      setInviting(true);
      const { token } = await api.createVouchInvite(null);
      const url = api.vouchUrl(token);
      await Share.share({
        message: `I'd love your Friend's Take on my Veiled profile — a short, honest word helps me find the right person, in shaa Allah. ${url}`,
        url: url || undefined,
      });
      setInvited(true);
      H.success();
    } catch (e) {
      Alert.alert('Couldn\'t create link', 'Please try again in a moment.');
    } finally {
      setInviting(false);
    }
  };

  // Nikah-readiness: weighted checklist of what makes a marriage-serious
  // profile. Tapping an incomplete item nudges you to complete it.
  const readiness = [
    { key: 'Photos', done: (me.photos?.length || 0) >= 1, w: 16, nudge: 'Add a photo', act: () => setEdit(true) },
    { key: 'About you', done: !!me.bio, w: 12, nudge: 'Write a short bio', act: () => setEdit(true) },
    { key: 'Interests', done: (me.interests?.length || 0) >= 3, w: 10, nudge: 'Pick 3+ interests', act: () => setEdit(true) },
    { key: 'Values', done: (me.values?.length || 0) >= 2, w: 8, nudge: 'Add your values', act: () => setEdit(true) },
    { key: 'Deen details', done: !!(me.prayerLevel && me.sect), w: 14, nudge: 'Complete your deen' },
    { key: 'Verified', done: !!me.selfieVerified, w: 16, nudge: 'Get verified', act: () => navigation.navigate('MuzzVerify') },
    { key: 'Intention', done: !!me.intention, w: 10, nudge: 'Set your timeline' },
    { key: 'Wali added', done: !!me.waliEnabled, w: 8, nudge: 'Add a wali' },
  ];
  const readyScore = Math.min(100, readiness.filter((r) => r.done).reduce((a, r) => a + r.w, 0));
  const todo = readiness.filter((r) => !r.done);
  const readyLabel = readyScore >= 90 ? 'Ready for nikah' : readyScore >= 65 ? 'Almost there' : readyScore >= 40 ? 'Getting there' : 'Just started';

  const saveEdit = () => {
    setMe({ bio: bio.trim(), job: job.trim(), interests, values });
    setEdit(false); H.success();
  };
  const toggle = (arr, set, v) => { set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]); H.select(); };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.title}>Profile</Text>
          <Pressable onPress={() => navigation.navigate('MuzzSettings')} style={styles.gear}><Ionicons name="settings-outline" size={24} color={M.text} /></Pressable>
        </View>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <PhotoTile seed="me" name={me.name || 'You'} uri={photos[0]} silhouette={150} pattern rounded={RADIUS.lg} style={styles.heroPhoto}>
            <LinearGradient colors={['transparent', 'rgba(20,16,26,0.8)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{me.name || 'Your name'}, {me.age}</Text>
              <Text style={styles.heroJob}>{me.job || 'Add your job'} · {me.city}</Text>
            </View>
            <Pressable onPress={() => setEdit(true)} style={styles.editFab}><Ionicons name="pencil" size={18} color="#fff" /></Pressable>
          </PhotoTile>

          {/* Nikah readiness */}
          <View style={styles.complete}>
            <View style={styles.completeTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="ribbon" size={15} color={M.primary} />
                <Text style={styles.completeLabel}>Nikah readiness</Text>
              </View>
              <Text style={styles.completePct}>{readyScore}% · {readyLabel}</Text>
            </View>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${readyScore}%` }]} /></View>
            {todo.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
                {todo.map((r) => (
                  <Pressable key={r.key} onPress={() => { H.tap(); r.act ? r.act() : setEdit(true); }} style={styles.todoChip}>
                    <Ionicons name="add-circle-outline" size={14} color={M.primary} />
                    <Text style={styles.todoChipText}>{r.nudge}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.readyDone}>
                <Ionicons name="checkmark-circle" size={16} color={M.success} />
                <Text style={styles.readyDoneText}>Masha’Allah — your profile is complete and ready.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Butterfly card */}
        <Animated.View entering={FadeInDown} style={styles.bfCard}>
          <View style={styles.bfMini}><Butterfly size={66} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bfTitle}>Your Matchmaker</Text>
            <Text style={styles.bfSub}>Trained on {me.interests?.length || 0} interests · {me.values?.length || 0} values</Text>
            <Pressable onPress={() => { update((s) => ({ ...s, butterflyAuto: !s.butterflyAuto })); H.select(); }} style={styles.bfToggleRow}>
              <Text style={styles.bfToggleLabel}>Auto-matching</Text>
              <View style={[styles.toggle, butterflyAuto && styles.toggleOn]}><View style={[styles.knob, butterflyAuto && styles.knobOn]} /></View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Verify banner */}
        {!me.selfieVerified && (
          <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzVerify'); }} style={styles.verifyBanner}>
            <View style={styles.verifyIcon}><Ionicons name="shield-checkmark" size={20} color={M.textOnPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>Get verified</Text>
              <Text style={styles.verifySub}>Earn the verified tick — a quick selfie, never shown on your profile.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={M.textMuted} />
          </Pressable>
        )}

        {/* Signals badge — rewards reading profiles & replying */}
        <View style={styles.signals}>
          <View style={styles.signalsHead}>
            <View style={styles.signalsBadge}><Ionicons name="pulse" size={16} color={M.textOnPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.signalsTitle}>Signals · {signalLevel}</Text>
              <Text style={styles.signalsSub}>Earned by reading profiles fully and replying to your matches</Text>
            </View>
          </View>
          <View style={styles.signalsRow}>
            <View style={styles.signalStat}><Text style={styles.signalVal}>{reads}</Text><Text style={styles.signalLabel}>Profiles read</Text></View>
            <View style={styles.signalStat}><Text style={styles.signalVal}>{convos}</Text><Text style={styles.signalLabel}>Conversations</Text></View>
            <View style={styles.signalStat}>
              <Text style={styles.signalVal}>{signalNext ? `${signalScore}/${signalNext}` : '★'}</Text>
              <Text style={styles.signalLabel}>{signalNext ? 'To next badge' : 'Top badge'}</Text>
            </View>
          </View>
        </View>

        {/* Friend's Take — let people who love you vouch for you */}
        <View style={styles.takeInvite}>
          <View style={styles.takeInviteIcon}><Ionicons name="people" size={19} color={M.textOnPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.takeInviteTitle}>Friend's Take</Text>
            <Text style={styles.takeInviteSub}>Let family & friends add a note or voice message vouching for you — it shows on your profile.</Text>
          </View>
          <Pressable onPress={onInvite} disabled={inviting} style={styles.takeInviteBtn}>
            <Text style={styles.takeInviteBtnText}>{inviting ? '…' : invited ? 'Shared ✓' : 'Invite'}</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[['heart', matches.length, 'Matches'], ['eye', (me.interests?.length || 0) * 7 + 12, 'Profile views'], ['star', muzz.superLikes, 'Super likes']].map(([ic, v, l]) => (
            <View key={l} style={styles.stat}>
              <Ionicons name={ic} size={18} color={M.primary} />
              <Text style={styles.statVal}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Gold upsell */}
        <Pressable onPress={() => navigation.navigate('MuzzGold')}>
          <LinearGradient colors={GRAD.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gold}>
            <Ionicons name="diamond" size={26} color="#fff" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.goldTitle}>Veiled Gold</Text>
              <Text style={styles.goldSub}>See who likes you, unlimited boosts & priority matchmaker picks</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </LinearGradient>
        </Pressable>

        {/* About / interests preview */}
        <Section title="About me">
          <Text style={styles.bioText}>{me.bio || 'Tap edit to add a bio.'}</Text>
        </Section>
        <Section title="Interests">
          <View style={styles.wrap}>{(me.interests || []).map((i) => <Chip key={i} label={i} active />)}</View>
        </Section>
        <Section title="Values">
          <View style={styles.wrap}>{(me.values || []).map((v) => <Chip key={v} label={v} color={M.butterfly} active />)}</View>
        </Section>

        <OButton label="Edit profile" icon="create-outline" onPress={() => setEdit(true)} style={{ marginHorizontal: SPACE.xl, marginTop: 20 }} />
        <Pressable onPress={resetAll} style={styles.reset}><Text style={styles.resetText}>Reset demo data</Text></Pressable>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={edit} animationType="slide" onRequestClose={() => setEdit(false)}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.editHead}>
            <Pressable onPress={() => setEdit(false)}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Text style={styles.editTitle}>Edit profile</Text>
            <Pressable onPress={saveEdit}><Text style={styles.save}>Save</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACE.xl, paddingBottom: 60 }}>
            <Text style={styles.label}>Photos</Text>
            <View style={styles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={uri + i} style={styles.photoCell}>
                  <PhotoTile uri={uri} seed={uri} rounded={RADIUS.md} silhouette={40} style={StyleSheet.absoluteFill} />
                  {i === 0 && <View style={styles.mainTag}><Text style={styles.mainTagText}>Main</Text></View>}
                  <Pressable onPress={() => { removePhoto(uri); H.tap(); }} style={styles.photoRemove}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {photos.length < 6 && (
                <Pressable onPress={addPhotoTap} style={[styles.photoCell, styles.photoAdd]}>
                  <Ionicons name="add" size={28} color={M.primary} />
                  <Text style={styles.photoAddText}>Add</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.label}>Job</Text>
            <TextInput value={job} onChangeText={setJob} placeholder="Your occupation" placeholderTextColor={M.textMuted} style={styles.input} />
            <Text style={styles.label}>Bio</Text>
            <TextInput value={bio} onChangeText={setBio} placeholder="Say something real…" placeholderTextColor={M.textMuted} multiline style={[styles.input, { height: 100, textAlignVertical: 'top' }]} />
            <Text style={styles.label}>Interests</Text>
            <View style={styles.wrap}>{INTERESTS.map((i) => <Chip key={i} label={i} active={interests.includes(i)} onPress={() => toggle(interests, setInterests, i)} />)}</View>
            <Text style={styles.label}>Values</Text>
            <View style={styles.wrap}>{VALUES.map((v) => <Chip key={v} label={v} color={M.butterfly} active={values.includes(v)} onPress={() => toggle(values, setValues, v)} />)}</View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACE.xl, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: M.text, letterSpacing: -0.6 },
  gear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heroCard: { marginHorizontal: SPACE.xl },
  heroPhoto: { height: width * 0.78, justifyContent: 'flex-end' },
  heroInfo: { padding: 18 },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroJob: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 3 },
  editFab: { position: 'absolute', top: 14, right: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  complete: { backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 16, marginTop: 12 },
  completeTop: { flexDirection: 'row', justifyContent: 'space-between' },
  completeLabel: { ...TYPE.h3, fontSize: 14 },
  completePct: { ...TYPE.h3, fontSize: 14, color: M.primary },
  bar: { height: 7, borderRadius: 4, backgroundColor: M.border, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4, backgroundColor: M.primary },
  completeHint: { ...TYPE.caption, marginTop: 8 },
  todoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: M.bg, borderWidth: 1, borderColor: M.border, paddingHorizontal: 11, paddingVertical: 7, borderRadius: RADIUS.pill },
  todoChipText: { ...TYPE.caption, color: M.text, fontWeight: '700' },
  readyDone: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  readyDoneText: { ...TYPE.caption, color: M.textSoft, fontWeight: '600', flex: 1 },
  bfCard: { flexDirection: 'row', alignItems: 'center', margin: SPACE.xl, marginBottom: 0, backgroundColor: M.butterflySoft, borderRadius: RADIUS.lg, padding: 14 },
  bfMini: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  bfTitle: { ...TYPE.h3, color: M.butterfly },
  bfSub: { ...TYPE.caption, marginTop: 2 },
  bfToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  bfToggleLabel: { ...TYPE.body, fontWeight: '700' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: M.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: M.butterfly },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SPACE.xl, marginTop: 16, backgroundColor: M.bgSoft, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: M.border },
  verifyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { ...TYPE.h3, fontSize: 15 },
  verifySub: { ...TYPE.caption, marginTop: 2, lineHeight: 15 },
  signals: { marginHorizontal: SPACE.xl, marginTop: 16, backgroundColor: M.bgSoft, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: M.border },
  signalsHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalsBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  signalsTitle: { ...TYPE.h3, fontSize: 15 },
  signalsSub: { ...TYPE.caption, marginTop: 2, lineHeight: 15 },
  signalsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  signalStat: { flex: 1, backgroundColor: M.bg, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: M.border },
  signalVal: { fontSize: 17, fontWeight: '900', color: M.text },
  signalLabel: { ...TYPE.caption, fontSize: 10.5, marginTop: 2, textAlign: 'center' },
  takeInvite: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SPACE.xl, marginTop: 12, backgroundColor: M.bgSoft, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: M.border },
  takeInviteIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  takeInviteTitle: { ...TYPE.h3, fontSize: 15 },
  takeInviteSub: { ...TYPE.caption, marginTop: 2, lineHeight: 15 },
  takeInviteBtn: { backgroundColor: M.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill },
  takeInviteBtnText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 12.5 },
  stats: { flexDirection: 'row', gap: 12, paddingHorizontal: SPACE.xl, marginTop: 16 },
  stat: { flex: 1, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: M.text, marginTop: 6 },
  statLabel: { ...TYPE.caption, marginTop: 2, textAlign: 'center' },
  gold: { flexDirection: 'row', alignItems: 'center', margin: SPACE.xl, padding: 18, borderRadius: RADIUS.lg, ...SHADOW.card },
  goldTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  goldSub: { color: 'rgba(255,255,255,0.95)', fontWeight: '600', fontSize: 12.5, marginTop: 2 },
  section: { paddingHorizontal: SPACE.xl, paddingTop: 18 },
  sectionTitle: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  bioText: { ...TYPE.body, fontSize: 16, lineHeight: 24 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  reset: { alignItems: 'center', marginTop: 24 },
  resetText: { ...TYPE.caption, color: M.textMuted },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCell: { width: GRID_W, height: GRID_W * 1.3, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: M.bgSoft },
  photoAdd: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: M.primary, borderStyle: 'dashed' },
  photoAddText: { ...TYPE.caption, color: M.primary, fontWeight: '700', marginTop: 2 },
  photoRemove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  mainTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: M.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  mainTagText: { color: '#fff', fontWeight: '800', fontSize: 9 },
  editHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.xl, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: M.border },
  cancel: { ...TYPE.body, color: M.textSoft, fontWeight: '700' },
  editTitle: { ...TYPE.h3 },
  save: { ...TYPE.body, color: M.primary, fontWeight: '800' },
  label: { ...TYPE.caption, color: M.textSoft, marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: M.bgInput, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: M.text, fontWeight: '600' },
});
