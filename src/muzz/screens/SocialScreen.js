import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, TextInput, Modal, Share,
  KeyboardAvoidingView, Platform, RefreshControl, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { PhotoTile, Verified, Avatar } from '../components/ui';
import { pickAndUpload } from '../photos';
import * as api from '../api';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// The community feed: a place for the halaqa, not a dating deck.
const TAGS = ['All', 'Faith', 'Life', 'Adventure', 'Foodie', 'Art', 'Advice'];
const POST_TAGS = ['Faith', 'Life', 'Adventure', 'Foodie', 'Art', 'Advice'];
const MAX_POST = 1000;

export default function SocialScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    me, posts, postLikes, togglePostLike, addPost,
    refreshPosts, loadingPosts, postsError, hasBackend,
  } = useMuzz();
  const [tag, setTag] = useState('All');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => { refreshPosts(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  }, [refreshPosts]);

  const filtered = tag === 'All' ? posts : posts.filter((p) => p.tag === tag);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.title}>Social</Text>
          <Text style={styles.subtitle}>The community</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => { H.tap(); navigation.navigate('MuzzEvents'); }} style={styles.eventsBtn}>
            <Ionicons name="calendar-outline" size={18} color={M.text} />
            <Text style={styles.eventsText}>Events</Text>
          </Pressable>
          <Pressable onPress={() => { setComposeOpen(true); H.tap(); }} style={styles.composeBtn}>
            <Ionicons name="create-outline" size={18} color={M.textOnPrimary} />
            <Text style={styles.composeText}>Post</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tagBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.xl, gap: 8, paddingVertical: 10 }}>
          {TAGS.map((t) => (
            <Pressable key={t} onPress={() => { setTag(t); H.select(); }} style={[styles.tag, tag === t && styles.tagOn]}>
              <Text style={[styles.tagText, tag === t && { color: M.textOnPrimary }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={M.textSoft} />}
      >
        {filtered.length === 0 ? (
          <Empty
            loading={loadingPosts && !refreshing}
            error={postsError}
            hasBackend={hasBackend}
            filtered={tag !== 'All' && posts.length > 0}
            onRetry={onRefresh}
            onWrite={() => { H.tap(); setComposeOpen(true); }}
            onClearFilter={() => setTag('All')}
          />
        ) : (
          filtered.map((p, i) => (
            <PostCard
              key={p.id}
              p={p}
              index={i}
              liked={!!postLikes[p.id]}
              onLike={() => { togglePostLike(p.id); H.tap(); }}
              onOpen={() => navigation.navigate('MuzzPost', { postId: p.id })}
            />
          ))
        )}
      </ScrollView>

      <Composer
        visible={composeOpen}
        me={me}
        onClose={() => setComposeOpen(false)}
        onPost={addPost}
      />
    </View>
  );
}

// Say which empty this is. "Nothing here" over a failed request is the
// kind of thing that makes an app feel broken.
function Empty({ loading, error, hasBackend, filtered, onRetry, onWrite, onClearFilter }) {
  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={M.textSoft} />
        <Text style={styles.emptySub}>Loading the community…</Text>
      </View>
    );
  }
  if (error || !hasBackend) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}><Ionicons name="cloud-offline-outline" size={30} color={M.textSoft} /></View>
        <Text style={styles.emptyTitle}>Can't reach Social</Text>
        <Text style={styles.emptySub}>Check your connection and pull down to try again.</Text>
        <Pressable onPress={onRetry} style={styles.emptyBtn}><Text style={styles.emptyBtnText}>Try again</Text></Pressable>
      </View>
    );
  }
  if (filtered) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}><Ionicons name="funnel-outline" size={28} color={M.textSoft} /></View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySub}>No posts with this tag so far.</Text>
        <Pressable onPress={onClearFilter} style={styles.emptyBtn}><Text style={styles.emptyBtnText}>Show everything</Text></Pressable>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name="people-outline" size={30} color={M.textSoft} /></View>
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptySub}>
        This is where the community talks — a reflection, a question for the sisters and brothers, something good that happened. Be the first.
      </Text>
      <Pressable onPress={onWrite} style={styles.emptyBtn}><Text style={styles.emptyBtnText}>Write a post</Text></Pressable>
    </View>
  );
}

// The composer. It waits for the server, says what went wrong, and keeps
// what you wrote if it fails — losing someone's words to a dropped
// connection is unforgivable.
function Composer({ visible, me, onClose, onPost }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [tag, setTag] = useState('Life');
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (visible) { setDraft(''); setTag('Life'); setImage(null); setError(null); setPosting(false); }
  }, [visible]);

  const ready = draft.trim().length > 0 && !posting;

  const submit = async () => {
    if (!ready) return;
    setPosting(true);
    setError(null);
    const res = await onPost({ text: draft, tag, imageUrl: image });
    setPosting(false);
    if (res && res.ok) { H.success(); onClose(); return; }
    H.warn();
    setError((res && res.error) || 'Could not post. Please try again.');
  };

  const attach = async () => {
    H.tap();
    const uri = await pickAndUpload();
    if (uri) setImage(uri);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <Pressable onPress={onClose} hitSlop={8}><Text style={styles.cancel}>Cancel</Text></Pressable>
              <Text style={styles.modalTitle}>New post</Text>
              <Pressable onPress={submit} disabled={!ready} hitSlop={8}>
                <Text style={[styles.share, !ready && { opacity: 0.35 }]}>{posting ? 'Posting…' : 'Share'}</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 340 }}>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <Avatar name={me.name || 'You'} seed="me" size={42} />
                <TextInput
                  value={draft}
                  onChangeText={(t) => { setDraft(t); setError(null); }}
                  autoFocus
                  multiline
                  maxLength={MAX_POST}
                  placeholder="Share something with the community…"
                  placeholderTextColor={M.textMuted}
                  style={styles.modalInput}
                />
              </View>

              {image ? (
                <View style={styles.attached}>
                  <PhotoTile uri={api.mediaUrl(image)} seed={image} rounded={RADIUS.md} style={styles.attachedImg} />
                  <Pressable onPress={() => setImage(null)} style={styles.attachedX} hitSlop={6}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ) : null}

              <Text style={styles.pickLabel}>Tag</Text>
              <View style={styles.tagPick}>
                {POST_TAGS.map((t) => (
                  <Pressable key={t} onPress={() => { setTag(t); H.select(); }} style={[styles.tag, tag === t && styles.tagOn]}>
                    <Text style={[styles.tagText, tag === t && { color: M.textOnPrimary }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={15} color={M.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.composerBar}>
              <Pressable onPress={attach} style={styles.attachBtn} hitSlop={6}>
                <Ionicons name="image-outline" size={22} color={M.primary} />
                <Text style={styles.attachText}>{image ? 'Change photo' : 'Add a photo'}</Text>
              </Pressable>
              <Text style={styles.count}>{draft.length}/{MAX_POST}</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PostCard({ p, index, liked, onLike, onOpen }) {
  return (
    <Animated.View entering={FadeInDown.delay((index % 6) * 40)} style={styles.card}>
      <View style={styles.cardHead}>
        <Avatar name={p.authorName} seed={p.authorId} size={42} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.author}>{p.authorName}</Text>
            {p.verified && <View style={{ marginLeft: 5 }}><Verified size={12} /></View>}
          </View>
          <Text style={styles.cardTime}>{timeAgo(p.ts)} · <Text style={{ color: M.primary }}>#{p.tag}</Text></Text>
        </View>
      </View>

      <Pressable onPress={onOpen}>
        <Text style={styles.postText}>{p.text}</Text>
      </Pressable>

      {/* Only a real uploaded photo renders — no decorative stand-in
          dressed up as one. */}
      {p.imageSeed ? (
        <Pressable onPress={onOpen}>
          <PhotoTile uri={api.mediaUrl(p.imageSeed)} seed={String(p.id)} rounded={RADIUS.md} style={styles.postImage} />
        </Pressable>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable onPress={onLike} style={styles.action} hitSlop={6}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? M.primary : M.textSoft} />
          <Text style={[styles.actionText, liked && { color: M.primary }]}>{p.likes || 0}</Text>
        </Pressable>
        <Pressable onPress={onOpen} style={styles.action} hitSlop={6}>
          <Ionicons name="chatbubble-outline" size={20} color={M.textSoft} />
          <Text style={styles.actionText}>{p.comments || 0}</Text>
        </Pressable>
        <Pressable
          onPress={() => { H.tap(); Share.share({ message: `${p.authorName} on Veiled: “${p.text}”` }).catch(() => {}); }}
          style={styles.action}
          hitSlop={6}
        >
          <Ionicons name="paper-plane-outline" size={20} color={M.textSoft} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: SPACE.xl, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: M.text, letterSpacing: -0.6 },
  subtitle: { ...TYPE.caption, color: M.textSoft, marginTop: 1 },
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: M.primary, paddingLeft: 12, paddingRight: 14, paddingVertical: 9, borderRadius: RADIUS.pill, ...SHADOW.primary },
  composeText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 14 },
  eventsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border, paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.pill },
  eventsText: { color: M.text, fontWeight: '800', fontSize: 13 },
  tagBarWrap: { backgroundColor: M.bg, borderBottomWidth: 1, borderBottomColor: M.border },
  tag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border },
  tagOn: { backgroundColor: M.primary, borderColor: M.primary },
  tagText: { fontWeight: '700', fontSize: 13, color: M.textSoft },
  card: { paddingHorizontal: SPACE.xl, paddingVertical: 16, borderBottomWidth: 8, borderBottomColor: M.bgSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  author: { ...TYPE.h3, fontSize: 15 },
  cardTime: { ...TYPE.caption, marginTop: 1 },
  postText: { ...TYPE.body, fontSize: 15.5, lineHeight: 22, marginTop: 12 },
  postImage: { height: width * 0.62, marginTop: 14 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { ...TYPE.soft, fontWeight: '700' },

  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: SPACE.xxl, paddingTop: 60, gap: 4 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: M.bgSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { ...TYPE.h2, fontSize: 20, textAlign: 'center' },
  emptySub: { ...TYPE.soft, textAlign: 'center', lineHeight: 21, marginTop: 6 },
  emptyBtn: { marginTop: 20, backgroundColor: M.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: RADIUS.pill },
  emptyBtnText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 15 },

  modalBg: { flex: 1, backgroundColor: M.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: M.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, alignSelf: 'center', marginBottom: 14 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { ...TYPE.body, color: M.textSoft, fontWeight: '700' },
  modalTitle: { ...TYPE.h3 },
  share: { ...TYPE.body, color: M.primary, fontWeight: '800' },
  modalInput: { flex: 1, marginLeft: 12, fontSize: 16, color: M.text, minHeight: 90, textAlignVertical: 'top', fontWeight: '500' },
  attached: { marginTop: 14 },
  attachedImg: { height: width * 0.45, borderRadius: RADIUS.md },
  attachedX: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  pickLabel: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  tagPick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  errorText: { ...TYPE.soft, color: M.danger, fontWeight: '700', flex: 1 },
  composerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: M.border },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  attachText: { ...TYPE.soft, fontWeight: '800', color: M.primary },
  count: { ...TYPE.caption, color: M.textMuted },
});
