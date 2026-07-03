import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, TYPE } from '../theme';
import { getPerson } from '../store';
import { PhotoTile, Avatar } from '../components/ui';
import * as H from '../haptics';

const { width, height } = Dimensions.get('window');

// A simulated voice/video call screen — connecting → in-call timer.
export default function CallScreen({ route, navigation }) {
  const { personId, video } = route.params;
  const person = getPerson(personId);
  const [state, setState] = useState('connecting'); // connecting | active
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cam, setCam] = useState(video);
  const [speaker, setSpeaker] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setState('active'); H.success(); }, 2200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (state !== 'active') return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (!person) return null;
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {video && cam ? (
        <PhotoTile seed={person.id + 'v'} name={person.name} rounded={0} silhouette={320} style={StyleSheet.absoluteFill} />
      ) : (
        <LinearGradient colors={['#1A1226', '#2A1B3D', '#16121C']} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFill} />

      <Animated.View entering={FadeIn} style={styles.top}>
        {!(video && cam) && <Avatar name={person.name} seed={person.id} size={130} uri={person.photos?.[0]} />}
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.status}>{state === 'connecting' ? `${video ? 'Video' : 'Voice'} calling…` : mmss}</Text>
        {state === 'active' && (
          <View style={styles.encrypted}>
            <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={styles.encryptedText}>End-to-end encrypted</Text>
          </View>
        )}
      </Animated.View>

      {/* self preview */}
      {video && cam && state === 'active' && (
        <Animated.View entering={FadeInUp} style={styles.selfPreview}>
          <PhotoTile seed="me-self" name="You" rounded={RADIUS.md} silhouette={48} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp} style={styles.controls}>
        <View style={styles.controlRow}>
          <CallBtn icon={muted ? 'mic-off' : 'mic'} active={!muted} onPress={() => { setMuted((m) => !m); H.tap(); }} label={muted ? 'Unmute' : 'Mute'} />
          {video && <CallBtn icon={cam ? 'videocam' : 'videocam-off'} active={cam} onPress={() => { setCam((c) => !c); H.tap(); }} label="Camera" />}
          <CallBtn icon={speaker ? 'volume-high' : 'volume-low'} active={speaker} onPress={() => { setSpeaker((s) => !s); H.tap(); }} label="Speaker" />
        </View>
        <Pressable onPress={() => { H.warn(); navigation.goBack(); }} style={styles.hangup}>
          <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function CallBtn({ icon, active, onPress, label }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable onPress={onPress} style={[styles.callBtn, active && styles.callBtnActive]}>
        <Ionicons name={icon} size={26} color={active ? '#16121C' : '#fff'} />
      </Pressable>
      <Text style={styles.callBtnLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16121C' },
  top: { alignItems: 'center', marginTop: height * 0.16 },
  name: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 22 },
  status: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', marginTop: 8 },
  encrypted: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  encryptedText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  selfPreview: { position: 'absolute', top: 60, right: 18, width: 96, height: 140, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 60, alignItems: 'center', gap: 30 },
  controlRow: { flexDirection: 'row', gap: 26 },
  callBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  callBtnActive: { backgroundColor: '#fff' },
  callBtnLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  hangup: { width: 70, height: 70, borderRadius: 35, backgroundColor: M.danger, alignItems: 'center', justifyContent: 'center' },
});
