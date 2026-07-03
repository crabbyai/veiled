import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, TYPE } from '../theme';
import { PhotoTile, Avatar } from './ui';
import * as H from '../haptics';

const { width, height } = Dimensions.get('window');

// Horizontal stories rail (Muzz-style "moments"). Tapping opens a
// full-screen story viewer with auto-advancing progress bars.
export default function Stories({ people = [], me }) {
  const [active, setActive] = useState(null);
  const [seg, setSeg] = useState(0);

  const items = [{ id: 'me', name: me?.name || 'You', photos: me?.photos, isMe: true }, ...people];
  const open = (idx) => { H.tap(); setActive(idx); setSeg(0); };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((p, idx) => (
          <Pressable key={p.id} onPress={() => open(idx)} style={styles.item}>
            <LinearGradient colors={p.isMe ? ['#C7C7CC', '#C7C7CC'] : GRAD.primary} style={styles.ring}>
              <View style={styles.ringInner}>
                <Avatar name={p.name} seed={p.id} size={56} uri={p.photos?.[0]} />
              </View>
            </LinearGradient>
            {p.isMe && <View style={styles.addBadge}><Ionicons name="add" size={13} color="#fff" /></View>}
            <Text style={styles.name} numberOfLines={1}>{p.isMe ? 'Your story' : p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={active !== null} animationType="fade" onRequestClose={() => setActive(null)} transparent>
        {active !== null && (
          <StoryViewer
            person={items[active]}
            onClose={() => setActive(null)}
            onNext={() => (active < items.length - 1 ? (setActive(active + 1), setSeg(0)) : setActive(null))}
            onPrev={() => active > 0 && (setActive(active - 1), setSeg(0))}
          />
        )}
      </Modal>
    </View>
  );
}

function StoryViewer({ person, onClose, onNext, onPrev }) {
  const segments = Math.max(1, Math.min(3, (person.photos?.length || 1)));
  const [seg, setSeg] = useState(0);
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) {
          if (seg < segments - 1) { setSeg(seg + 1); return 0; }
          clearInterval(t); onNext(); return 1;
        }
        return p + 0.02;
      });
    }, 60);
    return () => clearInterval(t);
  }, [seg, person.id]);

  const lines = [
    'Living my best life ✨',
    'Coffee then conquer the day ☕',
    'Weekend adventures incoming 🌍',
  ];

  return (
    <Animated.View entering={FadeIn} style={styles.viewer}>
      <PhotoTile seed={person.id + seg} name={person.name} uri={person.photos?.[seg]} rounded={0} silhouette={300} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />

      <View style={styles.segs}>
        {[...Array(segments)].map((_, i) => (
          <View key={i} style={styles.segTrack}>
            <View style={[styles.segFill, { width: `${i < seg ? 100 : i === seg ? progress * 100 : 0}%` }]} />
          </View>
        ))}
      </View>

      <View style={styles.viewerHead}>
        <Avatar name={person.name} seed={person.id} size={36} uri={person.photos?.[0]} />
        <Text style={styles.viewerName}>{person.isMe ? 'Your story' : person.name}</Text>
        <Pressable onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={26} color="#fff" /></Pressable>
      </View>

      <Text style={styles.caption}>{lines[seg % lines.length]}</Text>

      {/* tap zones */}
      <Pressable style={styles.tapLeft} onPress={() => (seg > 0 ? setSeg(seg - 1) : onPrev())} />
      <Pressable style={styles.tapRight} onPress={() => (seg < segments - 1 ? setSeg(seg + 1) : onNext())} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, borderBottomColor: M.border },
  row: { paddingHorizontal: SPACE.lg, paddingVertical: 10, gap: 14 },
  item: { alignItems: 'center', width: 68 },
  ring: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: M.bg, alignItems: 'center', justifyContent: 'center' },
  addBadge: { position: 'absolute', top: 44, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: M.bg },
  name: { ...TYPE.caption, color: M.text, fontSize: 11, marginTop: 5 },
  viewer: { flex: 1, backgroundColor: '#000' },
  segs: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 52 },
  segTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  segFill: { height: 3, backgroundColor: '#fff' },
  viewerHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
  viewerName: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  caption: { position: 'absolute', bottom: 60, left: 20, right: 20, color: '#fff', fontSize: 18, fontWeight: '700' },
  tapLeft: { position: 'absolute', left: 0, top: 80, bottom: 0, width: width * 0.35 },
  tapRight: { position: 'absolute', right: 0, top: 80, bottom: 0, width: width * 0.5 },
});
