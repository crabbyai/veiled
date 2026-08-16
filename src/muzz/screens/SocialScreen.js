import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, TextInput, Modal, Share,
  KeyboardAvoidingView, Platform, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  withTiming, withSequence, withSpring, withRepeat, withDelay, interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import { M, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { Bounce } from '../motion';
import { useMuzz } from '../store';
import { PhotoTile, Verified, Avatar } from '../components/ui';
import { pickAndUpload } from '../photos';
import * as api from '../api';
import * as H from '../haptics';

const { width } = Dimensions.get('window');
const AnimatedFlatList = Animated.FlatList;

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
  const list = useRef(null);

  React.useEffect(() => { refreshPosts(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  }, [refreshPosts]);

  const filtered = tag === 'All' ? posts : posts.filter((p) => p.tag === tag);
  const toTop = () => list.current?.scrollToOffset?.({ offset: 0, animated: true });

  // The header gives its second line back to the feed as you scroll, and
  // takes on an edge so the list has something to slide under.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const collapse = (v) => {
    'worklet';
    return Math.min(1, Math.max(0, v / 56));
  };
  const subStyle = useAnimatedStyle(() => {
    const p = collapse(scrollY.value);
    return { opacity: 1 - Math.min(1, p * 1.8), height: 15 * (1 - p), marginTop: 1 - p };
  });
  const headStyle = useAnimatedStyle(() => {
    const p = collapse(scrollY.value);
    return {
      paddingBottom: 10 - p * 4,
      borderBottomColor: M.border,
      borderBottomWidth: p > 0.5 ? StyleSheet.hairlineWidth : 0,
    };
  });

  const onPost = useCallback(async (payload) => {
    const res = await addPost(payload);
    if (res && res.ok) { setTag('All'); setTimeout(toTop, 60); }
    return res;
  }, [addPost]);

  const renderPost = useCallback(({ item, index }) => (
    <PostCard
      p={item}
      index={index}
      liked={!!postLikes[item.id]}
      onLike={() => togglePostLike(item.id)}
      onOpen={() => navigation.navigate('MuzzPost', { postId: item.id })}
    />
  ), [postLikes, togglePostLike, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headStyle]}>
        <Pressable onPress={() => { H.tap(); toTop(); }} hitSlop={6}>
          <Text style={styles.title}>Social</Text>
          <Animated.Text numberOfLines={1} style={[styles.subtitle, subStyle]}>The community</Animated.Text>
        </Pressable>
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
      </Animated.View>

      <View style={styles.tagBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.xl, gap: 8, paddingVertical: 10 }}>
          {TAGS.map((t) => (
            <Bounce key={t} onPress={() => { setTag(t); toTop(); }} haptic="select" scale={0.93} style={[styles.tag, tag === t && styles.tagOn]}>
              <Text style={[styles.tagText, tag === t && { color: M.textOnPrimary }]}>{t}</Text>
            </Bounce>
          ))}
        </ScrollView>
      </View>

      <AnimatedFlatList
        ref={list}
        data={filtered}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderPost}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={6}
        windowSize={9}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={M.textSoft} />}
        ListEmptyComponent={
          <Empty
            loading={loadingPosts && !refreshing}
            error={postsError}
            hasBackend={hasBackend}
            filtered={tag !== 'All' && posts.length > 0}
            onRetry={onRefresh}
            onWrite={() => { H.tap(); setComposeOpen(true); }}
            onClearFilter={() => setTag('All')}
          />
        }
      />

      <Composer
        visible={composeOpen}
        me={me}
        onClose={() => setComposeOpen(false)}
        onPost={onPost}
      />
    </View>
  );
}

// Say which empty this is. "Nothing here" over a failed request is the
// kind of thing that makes an app feel broken.
function Empty({ loading, error, hasBackend, filtered, onRetry, onWrite, onClearFilter }) {
  // While it's loading, show the shape of the thing that's coming
  // rather than a spinner on a blank screen.
  if (loading) {
    return (
      <View style={{ paddingTop: 8 }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} index={i} />)}
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

// A post-shaped placeholder, breathing gently.
function Skeleton({ index }) {
  const t = useSharedValue(0);
  React.useEffect(() => {
    t.value = withDelay(index * 140, withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + t.value * 0.35 }));
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Animated.View style={[styles.skAvatar, style]} />
        <View style={{ flex: 1, marginLeft: 10, gap: 6 }}>
          <Animated.View style={[styles.skLine, { width: '38%' }, style]} />
          <Animated.View style={[styles.skLine, { width: '22%', height: 9 }, style]} />
        </View>
      </View>
      <Animated.View style={[styles.skLine, { width: '96%', marginTop: 14 }, style]} />
      <Animated.View style={[styles.skLine, { width: '82%', marginTop: 8 }, style]} />
      <Animated.View style={[styles.skLine, { width: '60%', marginTop: 8 }, style]} />
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
  const left = MAX_POST - draft.length;

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
                <Animated.View entering={FadeIn} style={styles.attached}>
                  <PhotoTile uri={api.mediaUrl(image)} seed={image} rounded={RADIUS.md} style={styles.attachedImg} />
                  <Pressable onPress={() => setImage(null)} style={styles.attachedX} hitSlop={6}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </Animated.View>
              ) : null}

              <Text style={styles.pickLabel}>Tag</Text>
              <View style={styles.tagPick}>
                {POST_TAGS.map((t) => (
                  <Bounce key={t} onPress={() => setTag(t)} haptic="select" scale={0.93} style={[styles.tag, tag === t && styles.tagOn]}>
                    <Text style={[styles.tagText, tag === t && { color: M.textOnPrimary }]}>{t}</Text>
                  </Bounce>
                ))}
              </View>
            </ScrollView>

            {error ? (
              <Animated.View entering={FadeInDown} style={styles.errorRow}>
                <Ionicons name="alert-circle" size={15} color={M.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <View style={styles.composerBar}>
              <Pressable onPress={attach} style={styles.attachBtn} hitSlop={6}>
                <Ionicons name="image-outline" size={22} color={M.primary} />
                <Text style={styles.attachText}>{image ? 'Change photo' : 'Add a photo'}</Text>
              </Pressable>
              <Text style={[styles.count, left < 100 && { color: left < 0 ? M.danger : M.textSoft }]}>
                {left < 100 ? left : `${draft.length}/${MAX_POST}`}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function PostCard({ p, index, liked, onLike, onOpen }) {
  // The heart on the button, and the big one that flashes over a
  // double-tap. Both come off the same like.
  const pop = useSharedValue(0);
  const burst = useSharedValue(0);

  const like = useCallback((viaTap) => {
    // A double-tap only ever likes. Taking a like away by accident on
    // the second tap of an enthusiastic one is a bad surprise — the
    // button is there for unliking.
    if (viaTap) {
      burst.value = 0;
      burst.value = withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) });
      if (liked) { H.tap(); return; }
    }
    onLike();
    H.tap();
    pop.value = withSequence(
      withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 11, stiffness: 240 })
    );
  }, [onLike, liked]);

  // Double-tap likes; a single tap opens it. Exclusive so one tap never
  // fires both.
  const dbl = Gesture.Tap().numberOfTaps(2).maxDelay(260).onEnd((_e, ok) => {
    if (ok) runOnJS(like)(true);
  });
  const single = Gesture.Tap().onEnd((_e, ok) => { if (ok) runOnJS(onOpen)(); });
  const taps = Gesture.Exclusive(dbl, single);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.value * 0.45 }],
  }));
  const burstStyle = useAnimatedStyle(() => {
    const b = burst.value;
    if (b === 0 || b === 1) return { opacity: 0 };
    return {
      opacity: interpolate(b, [0, 0.15, 0.6, 1], [0, 1, 1, 0]),
      transform: [
        { scale: interpolate(b, [0, 0.2, 0.5, 1], [0.4, 1.25, 1, 1.35]) },
        { rotate: `${interpolate(b, [0, 0.25], [-18, 0], 'clamp')}deg` },
      ],
    };
  });

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 40).duration(260)} style={styles.card}>
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

      <GestureDetector gesture={taps}>
        <View>
          <Text style={styles.postText}>{p.text}</Text>

          {/* Only a real uploaded photo renders — no decorative stand-in
              dressed up as one. */}
          {p.imageSeed ? (
            <PhotoTile uri={api.mediaUrl(p.imageSeed)} seed={String(p.id)} rounded={RADIUS.md} style={styles.postImage} />
          ) : null}

          {/* Two hearts: the larger one in the background colour gives
              the front one an edge, so it reads over a photo and over
              the card alike. */}
          <Animated.View style={[styles.burst, burstStyle]} pointerEvents="none">
            <Ionicons name="heart" size={94} color={M.bg} style={styles.burstHalo} />
            <Ionicons name="heart" size={82} color={M.primary} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.cardActions}>
        <Pressable onPress={() => like(false)} style={styles.action} hitSlop={6}>
          <Animated.View style={heartStyle}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? M.primary : M.textSoft} />
          </Animated.View>
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
  burst: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  burstHalo: { position: 'absolute' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 14 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { ...TYPE.soft, fontWeight: '700' },

  skAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: M.bgSoft },
  skLine: { height: 12, borderRadius: 6, backgroundColor: M.bgSoft },

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
