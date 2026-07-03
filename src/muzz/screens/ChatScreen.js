import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz, getPerson } from '../store';
import { scoreMatch } from '../butterfly';
import { PhotoTile, Verified } from '../components/ui';
import { pickAndUpload } from '../photos';
import * as realtime from '../realtime';
import * as H from '../haptics';

const REACTIONS = ['❤️', '😂', '😍', '👍', '🔥', '🤲'];

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { personId } = route.params;
  const muzz = useMuzz();
  const { me, chats, sendMessage, update, reactions, reactToMessage, blockPerson } = muzz;
  const person = getPerson(personId);
  const messages = chats[personId] || [];
  const listRef = useRef(null);
  const [text, setText] = useState('');
  const [chaperone, setChaperone] = useState(false);
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState(null);
  const [recording, setRecording] = useState(false);

  const compat = person ? scoreMatch(me, person) : { score: 0, reasons: [] };

  // Mark incoming as read on open
  useEffect(() => {
    update((s) => {
      const arr = (s.chats[personId] || []).map((m) => ({ ...m, read: true }));
      return { ...s, chats: { ...s.chats, [personId]: arr } };
    });
  }, [personId]);

  // Live typing indicator from the realtime channel (when connected)
  useEffect(() => realtime.onTyping(personId, (isTyping) => setTyping(isTyping)), [personId]);

  // Broadcast our typing state, debounced
  const typingTimer = useRef(null);
  const onChangeText = (t) => {
    setText(t);
    if (!realtime.isConnected()) return;
    realtime.emitTyping(personId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => realtime.emitTyping(personId, false), 1600);
  };

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages.length, typing]);

  const icebreakers = useCallback(() => {
    if (!person) return [];
    const out = [];
    const shared = (me.interests || []).filter((i) => person.interests.includes(i));
    if (shared.length) out.push(`I saw we both love ${shared[0].toLowerCase()} — what got you into it?`);
    if (person.prompts?.[0]) out.push(`You said "${person.prompts[0].a}" — tell me more!`);
    out.push(`Salaam ${person.name}! The butterfly clearly knew what it was doing 🦋`);
    return out.slice(0, 3);
  }, [person, me]);

  const botReply = useCallback(() => {
    if (!person) return;
    setTyping(true);
    const pool = [
      `Haha I love that! ${person.interests[0]} is honestly my favourite thing.`,
      `Aw that's so sweet. So what does a perfect weekend look like for you?`,
      `Okay you have good taste 😄 What's your go-to coffee order?`,
      `I'm so glad we matched. What made you swipe... oh wait, the butterfly did it 🦋`,
      `That's really thoughtful. Tell me something most people don't know about you?`,
    ];
    const reply = pool[messages.length % pool.length];
    const delay = 1200 + Math.random() * 1200;
    setTimeout(() => {
      setTyping(false);
      sendMessage(personId, reply, 'them');
      H.tap();
    }, delay);
  }, [person, messages.length, personId, sendMessage]);

  const send = (t) => {
    const val = (t ?? text).trim();
    if (!val) return;
    H.tap();
    sendMessage(personId, val, 'me');
    setText('');
    botReply();
  };

  // Voice note: hold the mic to "record", release to send a waveform bubble.
  const sendVoice = () => {
    setRecording(false);
    const secs = 3 + Math.floor(Math.random() * 12);
    H.press();
    sendMessage(personId, `voice:${secs}`, 'me');
    botReply();
  };

  const sendImage = async () => {
    const uri = await pickAndUpload();
    if (!uri) return;
    H.tap();
    sendMessage(personId, `image:${uri}`, 'me');
    botReply();
  };

  const onReact = (msg, emoji) => {
    reactToMessage(personId, msg.id, emoji);
    setReactionFor(null);
    H.select();
  };

  const blockAndLeave = () => {
    setMenuOpen(false);
    blockPerson(personId, 'Reported from chat');
    H.warn();
    navigation.goBack();
  };

  if (!person) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}>
          <Ionicons name="chevron-back" size={28} color={M.text} />
        </Pressable>
        <Pressable style={styles.hCenter} onPress={() => navigation.navigate('MuzzProfileDetail', { personId })}>
          <PhotoTile seed={person.id} name={person.name} rounded={20} style={{ width: 40, height: 40 }} />
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.hName}>{person.name}</Text>
              {person.verified && <View style={{ marginLeft: 5 }}><Verified size={12} /></View>}
            </View>
            <Text style={styles.hStatus}>{typing ? 'typing…' : person.online ? 'Online now' : 'Active recently'}</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <Pressable style={styles.hBtn} onPress={() => navigation.navigate('MuzzCall', { personId, video: false })}><Ionicons name="call-outline" size={21} color={M.primary} /></Pressable>
          <Pressable style={styles.hBtn} onPress={() => navigation.navigate('MuzzCall', { personId, video: true })}><Ionicons name="videocam-outline" size={23} color={M.primary} /></Pressable>
          <Pressable style={styles.hBtn} onPress={() => { H.tap(); setMenuOpen(true); }}><Ionicons name="ellipsis-vertical" size={20} color={M.text} /></Pressable>
        </View>
      </View>

      {/* Chaperone bar */}
      <Pressable onPress={() => { setChaperone((c) => !c); H.select(); }} style={[styles.chaperone, chaperone && { backgroundColor: M.butterflySoft }]}>
        <Ionicons name={chaperone ? 'shield-checkmark' : 'shield-outline'} size={15} color={chaperone ? M.butterfly : M.textSoft} />
        <Text style={[styles.chaperoneText, chaperone && { color: M.butterfly }]}>
          {chaperone ? 'Chaperone on — a guardian can view this chat' : 'Chaperone off · tap to enable oversight'}
        </Text>
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 12 }}
          ListHeaderComponent={
            <Animated.View entering={FadeIn} style={styles.matchHeader}>
              <PhotoTile seed={person.id} name={person.name} rounded={44} style={{ width: 88, height: 88 }} />
              <Text style={styles.matchHeaderName}>{person.name}, {person.age}</Text>
              <View style={styles.matchChip}>
                <Ionicons name="sparkles" size={12} color={M.butterfly} />
                <Text style={styles.matchChipText}>{compat.score}% match · the butterfly introduced you</Text>
              </View>
              {compat.reasons[0] && <Text style={styles.matchReason}>{compat.reasons[0]}</Text>}
            </Animated.View>
          }
          renderItem={({ item }) => (
            <Bubble item={item} reaction={reactions[`${personId}:${item.id}`]} onLongPress={() => { H.press(); setReactionFor(item); }} />
          )}
          ListFooterComponent={typing ? <TypingBubble /> : <View style={{ height: 4 }} />}
        />

        {/* Icebreakers (only before first message) */}
        {messages.length === 0 && (
          <View style={styles.iceWrap}>
            <Text style={styles.iceLabel}>🦋 Butterfly icebreakers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.lg, gap: 8 }}>
              {icebreakers().map((s, i) => (
                <Pressable key={i} onPress={() => send(s)} style={styles.iceChip}>
                  <Text style={styles.iceChipText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Composer */}
        {recording ? (
          <View style={[styles.composer, styles.recording, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable onPress={() => setRecording(false)} style={styles.plus}><Ionicons name="trash-outline" size={22} color={M.danger} /></Pressable>
            <View style={styles.recWave}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>Recording… release to send</Text>
              {[...Array(16)].map((_, i) => <View key={i} style={[styles.recBar, { height: 6 + ((i * 7) % 18) }]} />)}
            </View>
            <Pressable onPress={sendVoice} style={styles.sendBtn}>
              <LinearGradient colors={GRAD.primary} style={styles.sendGrad}><Ionicons name="send" size={18} color="#fff" /></LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable style={styles.plus} onPress={sendImage}><Ionicons name="image-outline" size={23} color={M.primary} /></Pressable>
            <TextInput
              value={text} onChangeText={onChangeText}
              placeholder="Message…" placeholderTextColor={M.textMuted}
              style={styles.input} multiline
            />
            {text.trim() ? (
              <Pressable onPress={() => send()} style={styles.sendBtn}>
                <LinearGradient colors={GRAD.primary} style={styles.sendGrad}><Ionicons name="send" size={18} color="#fff" /></LinearGradient>
              </Pressable>
            ) : (
              <Pressable style={styles.plus} onPress={() => { H.press(); setRecording(true); }}><Ionicons name="mic-outline" size={24} color={M.primary} /></Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Reaction picker */}
      <Modal visible={!!reactionFor} transparent animationType="fade" onRequestClose={() => setReactionFor(null)}>
        <Pressable style={styles.reactBg} onPress={() => setReactionFor(null)}>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.reactBar}>
            {REACTIONS.map((e) => (
              <Pressable key={e} onPress={() => onReact(reactionFor, e)} style={styles.reactItem}>
                <Text style={styles.reactEmoji}>{e}</Text>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Safety menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBg} onPress={() => setMenuOpen(false)}>
          <Animated.View entering={FadeInUp} style={[styles.menu, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.menuHandle} />
            <MenuRow icon="person-outline" label="View profile" onPress={() => { setMenuOpen(false); navigation.navigate('MuzzProfileDetail', { personId }); }} />
            <MenuRow icon="shield-checkmark-outline" label={`Turn chaperone ${chaperone ? 'off' : 'on'}`} onPress={() => { setChaperone((c) => !c); setMenuOpen(false); }} />
            <MenuRow icon="notifications-off-outline" label="Mute notifications" onPress={() => setMenuOpen(false)} />
            <MenuRow icon="flag-outline" label="Report" danger onPress={blockAndLeave} />
            <MenuRow icon="hand-left-outline" label="Unmatch & block" danger onPress={blockAndLeave} />
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <Ionicons name={icon} size={21} color={danger ? M.danger : M.text} />
      <Text style={[styles.menuLabel, danger && { color: M.danger }]}>{label}</Text>
    </Pressable>
  );
}

function VoiceContent({ secs, mine }) {
  const tint = mine ? 'rgba(255,255,255,0.95)' : M.primary;
  return (
    <View style={styles.voiceRow}>
      <Ionicons name="play" size={18} color={tint} />
      <View style={styles.voiceWave}>
        {[...Array(20)].map((_, i) => (
          <View key={i} style={[styles.voiceBar, { height: 4 + ((i * 5) % 16), backgroundColor: mine ? 'rgba(255,255,255,0.85)' : M.primaryLight }]} />
        ))}
      </View>
      <Text style={[styles.voiceDur, { color: mine ? 'rgba(255,255,255,0.9)' : M.textSoft }]}>0:{String(secs).padStart(2, '0')}</Text>
    </View>
  );
}

function Bubble({ item, reaction, onLongPress }) {
  const mine = item.sender === 'me';
  const isVoice = typeof item.text === 'string' && item.text.startsWith('voice:');
  const isImage = typeof item.text === 'string' && item.text.startsWith('image:');
  const secs = isVoice ? Number(item.text.split(':')[1]) : 0;
  const imgUri = isImage ? item.text.slice(6) : null;

  return (
    <Animated.View entering={mine ? FadeInUp.duration(180) : FadeInDown.duration(180)} style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      <Pressable onLongPress={onLongPress} delayLongPress={250}>
        {isImage ? (
          <View style={[styles.imageBubble, mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }]}>
            <PhotoTile uri={imgUri} seed={item.id} rounded={18} style={{ width: 200, height: 200 }} silhouette={64} />
          </View>
        ) : mine ? (
          <LinearGradient colors={GRAD.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mine]}>
            {isVoice ? <VoiceContent secs={secs} mine /> : <Text style={styles.mineText}>{item.text}</Text>}
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.theirs]}>
            {isVoice ? <VoiceContent secs={secs} /> : <Text style={styles.theirsText}>{item.text}</Text>}
          </View>
        )}
        {reaction ? (
          <View style={[styles.reactionBadge, mine ? { right: 6 } : { left: 6 }]}>
            <Text style={{ fontSize: 13 }}>{reaction}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function TypingBubble() {
  return (
    <Animated.View entering={FadeIn} style={[styles.bubbleRow, { justifyContent: 'flex-start' }]}>
      <View style={[styles.bubble, styles.theirs, { flexDirection: 'row', gap: 4, paddingVertical: 14 }]}>
        {[0, 1, 2].map((i) => <View key={i} style={styles.typingDot} />)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  hName: { ...TYPE.h3, fontSize: 16 },
  hStatus: { ...TYPE.caption, color: M.online, marginTop: 1 },
  chaperone: { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', paddingVertical: 9, backgroundColor: M.bgSoft },
  chaperoneText: { ...TYPE.caption, color: M.textSoft, fontSize: 12 },
  matchHeader: { alignItems: 'center', paddingVertical: 20 },
  matchHeaderName: { ...TYPE.h2, marginTop: 12 },
  matchChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: M.butterflySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, marginTop: 8 },
  matchChipText: { color: M.butterfly, fontWeight: '700', fontSize: 12 },
  matchReason: { ...TYPE.soft, marginTop: 8, fontStyle: 'italic' },
  bubbleRow: { flexDirection: 'row', marginVertical: 5 },
  bubble: { maxWidth: '78%', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { backgroundColor: M.bgSoft, borderBottomLeftRadius: 6 },
  mineText: { color: '#fff', fontSize: 15, fontWeight: '500', lineHeight: 20 },
  theirsText: { color: M.text, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: M.textMuted },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, minWidth: 160 },
  voiceWave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, flex: 1 },
  voiceBar: { width: 2.5, borderRadius: 2 },
  voiceDur: { fontSize: 12, fontWeight: '700' },
  imageBubble: { borderRadius: 18, overflow: 'hidden', ...SHADOW.soft },
  reactionBadge: {
    position: 'absolute', bottom: -10, backgroundColor: M.bg, borderRadius: 12,
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: M.border, ...SHADOW.soft,
  },
  recording: { backgroundColor: M.bg },
  recWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: M.primarySoft, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 11 },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: M.danger, marginRight: 4 },
  recText: { color: M.primary, fontWeight: '700', fontSize: 12, marginRight: 6 },
  recBar: { width: 2.5, borderRadius: 2, backgroundColor: M.primaryLight },
  reactBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  reactBar: { flexDirection: 'row', backgroundColor: M.bg, borderRadius: RADIUS.pill, padding: 8, gap: 4, ...SHADOW.card },
  reactItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reactEmoji: { fontSize: 28 },
  menuBg: { flex: 1, backgroundColor: M.overlay, justifyContent: 'flex-end' },
  menu: { backgroundColor: M.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: SPACE.lg },
  menuHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, alignSelf: 'center', marginBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  menuLabel: { ...TYPE.body, fontWeight: '600' },
  iceWrap: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: M.border },
  iceLabel: { ...TYPE.caption, color: M.butterfly, paddingHorizontal: SPACE.lg, marginBottom: 8, fontWeight: '800' },
  iceChip: { backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 12, maxWidth: 230, borderWidth: 1, borderColor: M.border },
  iceChipText: { ...TYPE.soft, color: M.text, fontSize: 13, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: M.border, gap: 4 },
  plus: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: M.bgInput, borderRadius: 22, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: M.text, maxHeight: 110 },
  sendBtn: { marginLeft: 4 },
  sendGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
