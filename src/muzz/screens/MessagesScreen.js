import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { useMuzz, getPerson } from '../store';
import { PhotoTile, Verified, Avatar } from '../components/ui';
import * as H from '../haptics';

function timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { matches, chats } = useMuzz();

  const convos = useMemo(() =>
    matches.map(getPerson).filter(Boolean).map((p) => {
      const msgs = chats[p.id] || [];
      const last = msgs[msgs.length - 1];
      const unread = msgs.some((m) => m.sender !== 'me' && !m.read);
      return { p, last, unread, ts: last ? last.ts : 0 };
    }).sort((a, b) => b.ts - a.ts),
    [matches, chats]
  );

  const newMatches = matches.map(getPerson).filter(Boolean).filter((p) => !(chats[p.id] || []).length);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Chats</Text>
        <Ionicons name="search" size={24} color={M.text} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* New matches strip */}
        {newMatches.length > 0 && (
          <View style={styles.newStripWrap}>
            <Text style={styles.sectionLabel}>New matches</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.xl, gap: 16 }}>
              {newMatches.map((p) => (
                <Pressable key={p.id} onPress={() => { H.tap(); navigation.navigate('MuzzChat', { personId: p.id }); }} style={{ alignItems: 'center', width: 64 }}>
                  <Avatar name={p.name} seed={p.id} size={62} ring={M.primary} online={p.online} />
                  <Text style={styles.newName} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {convos.filter((c) => c.last).length === 0 && newMatches.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="chatbubbles" size={32} color={M.primary} /></View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>When you match, your chats appear here.</Text>
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            {convos.filter((c) => c.last).map(({ p, last, unread }, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 40)}>
                <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzChat', { personId: p.id }); }} style={styles.row}>
                  <View>
                    <PhotoTile seed={p.id} name={p.name} rounded={29} style={{ width: 58, height: 58 }} />
                    {p.online && <View style={styles.online} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.rowTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={styles.name}>{p.name}</Text>
                        {p.verified && <View style={{ marginLeft: 5 }}><Verified size={12} /></View>}
                      </View>
                      <Text style={styles.time}>{timeAgo(last.ts)}</Text>
                    </View>
                    <View style={styles.rowTop}>
                      <Text style={[styles.preview, unread && { color: M.text, fontWeight: '700' }]} numberOfLines={1}>
                        {last.sender === 'me' ? 'You: ' : ''}{last.text}
                      </Text>
                      {unread && <View style={styles.unread} />}
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACE.xl, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: M.text, letterSpacing: -0.6 },
  newStripWrap: { paddingVertical: 10, borderBottomWidth: 8, borderBottomColor: M.bgSoft },
  sectionLabel: { ...TYPE.caption, color: M.textSoft, paddingHorizontal: SPACE.xl, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  newName: { ...TYPE.caption, color: M.text, marginTop: 6, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.xl, paddingVertical: 12 },
  online: { position: 'absolute', right: 1, bottom: 1, width: 15, height: 15, borderRadius: 8, backgroundColor: M.online, borderWidth: 2.5, borderColor: '#fff' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...TYPE.h3, fontSize: 16 },
  time: { ...TYPE.caption, color: M.textMuted },
  preview: { ...TYPE.soft, flex: 1, marginRight: 8, marginTop: 3 },
  unread: { width: 9, height: 9, borderRadius: 5, backgroundColor: M.primary },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACE.xxl },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: M.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...TYPE.h2, marginTop: 18 },
  emptySub: { ...TYPE.soft, textAlign: 'center', marginTop: 6 },
});
