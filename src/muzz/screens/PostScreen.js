import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { useMuzz } from '../store';
import { COMMENT_SEED } from '../data';
import { PhotoTile, Verified, Avatar } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

export default function PostScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { postId } = route.params;
  const { me, posts, postLikes, togglePostLike } = useMuzz();
  const p = posts.find((x) => x.id === postId);
  const [comments, setComments] = useState(COMMENT_SEED);
  const [text, setText] = useState('');

  if (!p) return null;
  const liked = !!postLikes[postId];

  const add = () => {
    if (!text.trim()) return;
    setComments((c) => [...c, { id: `c${Date.now()}`, name: me.name || 'You', text: text.trim(), ts: Date.now() }]);
    setText(''); H.tap();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}><Ionicons name="chevron-back" size={28} color={M.text} /></Pressable>
        <Text style={styles.hTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.post}>
            <View style={styles.cardHead}>
              <Avatar name={p.authorName} seed={p.authorId} size={44} />
              <View style={{ marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.author}>{p.authorName}</Text>
                  {p.verified && <View style={{ marginLeft: 5 }}><Verified size={12} /></View>}
                </View>
                <Text style={styles.tag}>#{p.tag}</Text>
              </View>
            </View>
            <Text style={styles.body}>{p.text}</Text>
            {p.image && <PhotoTile gradient={p.image} seed={p.id} rounded={RADIUS.md} style={styles.img}><Ionicons name="image" size={30} color="rgba(255,255,255,0.5)" /></PhotoTile>}
            <View style={styles.actions}>
              <Pressable onPress={() => { togglePostLike(postId); H.tap(); }} style={styles.action}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? M.primary : M.textSoft} />
                <Text style={[styles.actionText, liked && { color: M.primary }]}>{p.likes + (liked ? 1 : 0)}</Text>
              </Pressable>
              <View style={styles.action}><Ionicons name="chatbubble-outline" size={22} color={M.textSoft} /><Text style={styles.actionText}>{comments.length}</Text></View>
            </View>
          </View>

          <View style={styles.commentsHead}><Text style={styles.commentsTitle}>Comments</Text></View>
          {comments.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(i * 30)} style={styles.comment}>
              <Avatar name={c.name} seed={c.name} size={36} />
              <View style={styles.commentBubble}>
                <Text style={styles.commentName}>{c.name}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Add a comment…" placeholderTextColor={M.textMuted} style={styles.input} />
          <Pressable onPress={add} style={styles.send}><Ionicons name="send" size={20} color={text.trim() ? M.primary : M.textMuted} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hTitle: { ...TYPE.h3 },
  post: { padding: SPACE.xl, borderBottomWidth: 8, borderBottomColor: M.bgSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  author: { ...TYPE.h3, fontSize: 16 },
  tag: { ...TYPE.caption, color: M.primary, marginTop: 1 },
  body: { ...TYPE.body, fontSize: 16, lineHeight: 23, marginTop: 14 },
  img: { height: width * 0.6, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 24, marginTop: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { ...TYPE.soft, fontWeight: '700' },
  commentsHead: { paddingHorizontal: SPACE.xl, paddingTop: 16, paddingBottom: 6 },
  commentsTitle: { ...TYPE.h3 },
  comment: { flexDirection: 'row', paddingHorizontal: SPACE.xl, paddingVertical: 8 },
  commentBubble: { flex: 1, marginLeft: 10, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 12 },
  commentName: { ...TYPE.caption, color: M.text, fontWeight: '800', fontSize: 13 },
  commentText: { ...TYPE.body, marginTop: 3 },
  composer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.lg, paddingTop: 8, borderTopWidth: 1, borderTopColor: M.border },
  input: { flex: 1, backgroundColor: M.bgInput, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, color: M.text },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
