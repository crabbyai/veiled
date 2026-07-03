import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE, gradFor } from '../theme';
import { useMuzz } from '../store';
import { PhotoTile, Verified, Avatar, GButton } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const TAGS = ['For you', 'Adventure', 'Foodie', 'Art', 'Life', 'Faith'];

export default function SocialScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, posts, postLikes, togglePostLike, addPost } = useMuzz();
  const [tag, setTag] = useState('For you');
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const filtered = tag === 'For you' ? posts : posts.filter((p) => p.tag === tag);

  const post = () => {
    if (!draft.trim()) return;
    addPost({
      id: `u${Date.now()}`, authorId: 'me', authorName: me.name || 'You', verified: false,
      text: draft.trim(), tag: 'Life', likes: 0, comments: 0, ts: Date.now(),
      image: Math.random() > 0.5 ? gradFor(draft) : null,
    });
    setDraft(''); setComposeOpen(false); H.success();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Social</Text>
        <Pressable onPress={() => { setComposeOpen(true); H.tap(); }} style={styles.composeBtn}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.composeText}>Post</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}>
        <View style={styles.tagBarWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.xl, gap: 8, paddingVertical: 10 }}>
            {TAGS.map((t) => (
              <Pressable key={t} onPress={() => { setTag(t); H.select(); }} style={[styles.tag, tag === t && styles.tagOn]}>
                <Text style={[styles.tagText, tag === t && { color: '#fff' }]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {filtered.map((p, i) => (
          <PostCard key={p.id} p={p} index={i} liked={!!postLikes[p.id]} onLike={() => { togglePostLike(p.id); H.tap(); }}
            onOpen={() => navigation.navigate('MuzzPost', { postId: p.id })}
            onAuthor={() => p.authorId !== 'me' && navigation.navigate('MuzzProfileDetail', { personId: p.authorId })}
          />
        ))}
      </ScrollView>

      {/* Compose modal */}
      <Modal visible={composeOpen} animationType="slide" transparent onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalBg}>
          <Animated.View entering={FadeInDown} style={[styles.modal, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <Pressable onPress={() => setComposeOpen(false)}><Text style={styles.cancel}>Cancel</Text></Pressable>
              <Text style={styles.modalTitle}>New post</Text>
              <Pressable onPress={post} disabled={!draft.trim()}><Text style={[styles.share, !draft.trim() && { opacity: 0.4 }]}>Share</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Avatar name={me.name || 'You'} seed="me" size={42} />
              <TextInput
                value={draft} onChangeText={setDraft} autoFocus multiline
                placeholder="Share something with the community…" placeholderTextColor={M.textMuted}
                style={styles.modalInput}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function PostCard({ p, index, liked, onLike, onOpen, onAuthor }) {
  const likeCount = p.likes + (liked ? 1 : 0);
  return (
    <Animated.View entering={FadeInDown.delay((index % 6) * 50)} style={styles.card}>
      <Pressable onPress={onAuthor} style={styles.cardHead}>
        <Avatar name={p.authorName} seed={p.authorId} size={42} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.author}>{p.authorName}</Text>
            {p.verified && <View style={{ marginLeft: 5 }}><Verified size={12} /></View>}
          </View>
          <Text style={styles.cardTime}>{timeAgo(p.ts)} · <Text style={{ color: M.primary }}>#{p.tag}</Text></Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color={M.textMuted} />
      </Pressable>

      <Text style={styles.postText}>{p.text}</Text>

      {p.image && (
        <Pressable onPress={onOpen}>
          <PhotoTile gradient={p.image} seed={p.id} rounded={RADIUS.md} style={styles.postImage}>
            <View style={styles.imgIcon}><Ionicons name="image" size={30} color="rgba(255,255,255,0.5)" /></View>
          </PhotoTile>
        </Pressable>
      )}

      <View style={styles.cardActions}>
        <Pressable onPress={onLike} style={styles.action}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? M.primary : M.textSoft} />
          <Text style={[styles.actionText, liked && { color: M.primary }]}>{likeCount}</Text>
        </Pressable>
        <Pressable onPress={onOpen} style={styles.action}>
          <Ionicons name="chatbubble-outline" size={20} color={M.textSoft} />
          <Text style={styles.actionText}>{p.comments}</Text>
        </Pressable>
        <Pressable onPress={H.tap} style={styles.action}>
          <Ionicons name="paper-plane-outline" size={20} color={M.textSoft} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACE.xl, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: M.text, letterSpacing: -0.6 },
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: M.primary, paddingLeft: 10, paddingRight: 14, paddingVertical: 8, borderRadius: RADIUS.pill, ...SHADOW.primary },
  composeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  tagBarWrap: { backgroundColor: M.bg, borderBottomWidth: 1, borderBottomColor: M.border },
  tag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: M.bgSoft },
  tagOn: { backgroundColor: M.text },
  tagText: { fontWeight: '700', fontSize: 13, color: M.textSoft },
  card: { paddingHorizontal: SPACE.xl, paddingVertical: 16, borderBottomWidth: 8, borderBottomColor: M.bgSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  author: { ...TYPE.h3, fontSize: 15 },
  cardTime: { ...TYPE.caption, marginTop: 1 },
  postText: { ...TYPE.body, fontSize: 15.5, lineHeight: 22, marginTop: 12 },
  postImage: { height: width * 0.62, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  imgIcon: {},
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { ...TYPE.soft, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: M.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: M.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACE.xl },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, alignSelf: 'center', marginBottom: 14 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { ...TYPE.body, color: M.textSoft, fontWeight: '700' },
  modalTitle: { ...TYPE.h3 },
  share: { ...TYPE.body, color: M.primary, fontWeight: '800' },
  modalInput: { flex: 1, marginLeft: 12, fontSize: 16, color: M.text, minHeight: 100, textAlignVertical: 'top', fontWeight: '500' },
});
