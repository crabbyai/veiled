import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
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
  const { me, matches, butterflyAuto, update, setMe, resetAll, addPhoto, removePhoto } = muzz;
  const [edit, setEdit] = useState(false);
  const [bio, setBio] = useState(me.bio);
  const [job, setJob] = useState(me.job);
  const [interests, setInterests] = useState(me.interests || []);
  const [values, setValues] = useState(me.values || []);

  const photos = me.photos || [];
  const addPhotoTap = async () => {
    const uri = await pickAndUpload();
    if (uri) { addPhoto(uri); H.success(); }
  };

  const completeness = Math.min(100, Math.round(
    ((me.name ? 20 : 0) + (me.bio ? 20 : 0) + (me.job ? 15 : 0) +
     Math.min(25, (me.interests?.length || 0) * 4) + Math.min(20, (me.values?.length || 0) * 5))
  ));

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
          <PhotoTile seed="me" name={me.name || 'You'} uri={photos[0]} silhouette={150} rounded={RADIUS.lg} style={styles.heroPhoto}>
            <LinearGradient colors={['transparent', 'rgba(20,16,26,0.8)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{me.name || 'Your name'}, {me.age}</Text>
              <Text style={styles.heroJob}>{me.job || 'Add your job'} · {me.city}</Text>
            </View>
            <Pressable onPress={() => setEdit(true)} style={styles.editFab}><Ionicons name="pencil" size={18} color="#fff" /></Pressable>
          </PhotoTile>

          {/* completeness */}
          <View style={styles.complete}>
            <View style={styles.completeTop}>
              <Text style={styles.completeLabel}>Profile strength</Text>
              <Text style={styles.completePct}>{completeness}%</Text>
            </View>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${completeness}%` }]} /></View>
            <Text style={styles.completeHint}>A fuller profile gives the butterfly more to work with.</Text>
          </View>
        </View>

        {/* Butterfly card */}
        <Animated.View entering={FadeInDown} style={styles.bfCard}>
          <View style={styles.bfMini}><Butterfly size={66} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bfTitle}>Your Butterfly</Text>
            <Text style={styles.bfSub}>Trained on {me.interests?.length || 0} interests · {me.values?.length || 0} values</Text>
            <Pressable onPress={() => { update((s) => ({ ...s, butterflyAuto: !s.butterflyAuto })); H.select(); }} style={styles.bfToggleRow}>
              <Text style={styles.bfToggleLabel}>Auto-matching</Text>
              <View style={[styles.toggle, butterflyAuto && styles.toggleOn]}><View style={[styles.knob, butterflyAuto && styles.knobOn]} /></View>
            </Pressable>
          </View>
        </Animated.View>

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
              <Text style={styles.goldTitle}>Butterfly Gold</Text>
              <Text style={styles.goldSub}>See who likes you, unlimited boosts & priority butterfly picks</Text>
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
