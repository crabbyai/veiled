import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Modal, Alert,
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
import { SIMULATED_FEATURES } from '../config';
import { UnveilPrompt, UnveilRequestRow } from '../components/Unveil';
import * as H from '../haptics';

const REACTIONS = ['❤️', '😂', '😍', '👍', '🔥', '🤲'];
// Sticker set — sent as big expressive glyphs (offline, no external GIFs).
const STICKERS = ['🤍', '🌙', '🕌', '💍', '🌹', '🌷', '☕️', '🥰', '😊', '😅', '✨', '🤲', '📿', '👋', '💐', '🫶'];

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { personId } = route.params;
  const muzz = useMuzz();
  const { me, chats, sendMessage, update, reactions, reactToMessage, reportPerson, unmatchPerson, chaperones, setChaperone, isUnveiled, unveilFor, weMet, recordWeMet, muted, toggleMute, veilStateFor, askToUnveil } = muzz;
  const isMuted = !!(muted && muted[personId]);
  const person = getPerson(personId);
  const messages = chats[personId] || [];
  // Read receipts: id of my most recent (non-event) message, so we can
  // show Delivered / Seen beneath it like Tinder Platinum.
  let lastMineId = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'me' && messages[i].text !== 'unveil:done') { lastMineId = messages[i].id; break; }
  }
  const listRef = useRef(null);
  const [text, setText] = useState('');
  const wali = chaperones[personId];
  const veiledNow = !!(person && person.photoVeiled && !isUnveiled(personId));
  const [waliModal, setWaliModal] = useState(false);
  const [waliName, setWaliName] = useState('');
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionFor, setReactionFor] = useState(null);
  const [recording, setRecording] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  // The Veil: where this pair stands, and whether to raise it with her.
  const [veil, setVeil] = useState(null);
  const [unveilOpen, setUnveilOpen] = useState(false);
  const [unveiling, setUnveiling] = useState(false);
  const [asking, setAsking] = useState(false);
  // Declining is respected for this visit — she is not asked twice in
  // the same sitting.
  const [dismissedPrompt, setDismissedPrompt] = useState(false);

  const iAmVeiled = !!me.photoVeiled && me.gender === 'Woman';

  const loadVeil = useCallback(async () => {
    const v = await veilStateFor(personId);
    setVeil(v);
    return v;
  }, [personId, veilStateFor]);

  useEffect(() => { loadVeil(); }, [personId, messages.length]);

  // Prompt her when he has asked, or when the conversation has had time
  // to breathe. Never reveals anything by itself.
  useEffect(() => {
    if (!veil || !iAmVeiled || dismissedPrompt) return;
    if (veil.iUnveiled) return;
    if (veil.theyAskedMe || veil.ripe) setUnveilOpen(true);
  }, [veil, iAmVeiled, dismissedPrompt]);

  const doUnveil = async () => {
    setUnveiling(true);
    unveilFor(personId);
    sendMessage(personId, 'unveil:done', 'me');
    setUnveiling(false);
    setUnveilOpen(false);
    await loadVeil();
  };

  const doAsk = async () => {
    setAsking(true);
    const res = await askToUnveil(personId);
    setAsking(false);
    if (res && res.ok) { H.success(); await loadVeil(); }
    else { H.warn(); Alert.alert('Could not send', (res && res.error) || 'Please try again.'); }
  };

  // The Veil: if I'm the one wearing it, this opens my own decision.
  // Otherwise it asks her — and leaves it entirely with her.
  const askUnveil = () => {
    H.press();
    if (iAmVeiled) { setDismissedPrompt(false); setUnveilOpen(true); return; }
    doAsk();
  };

  const confirmWali = () => {
    const name = waliName.trim();
    if (!name) return;
    setChaperone(personId, { name });
    setWaliModal(false);
    setWaliName('');
    H.success();
  };

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
    out.push(`Salaam ${person.name}! Our matchmaker clearly knew what it was doing.`);
    return out.slice(0, 3);
  }, [person, me]);

  const send = (t) => {
    const val = (t ?? text).trim();
    if (!val) return;
    H.tap();
    // Her reply comes from her, over the realtime channel. Nothing here
    // writes messages on her behalf — a canned answer under a real
    // person's name is a lie to whoever is reading it.
    sendMessage(personId, val, 'me');
    setText('');
  };

  // Voice note: hold the mic to "record", release to send a waveform bubble.
  const sendVoice = () => {
    setRecording(false);
    const secs = 3 + Math.floor(Math.random() * 12);
    H.press();
    sendMessage(personId, `voice:${secs}`, 'me');
  };

  const sendSticker = (glyph) => {
    H.press();
    setStickerOpen(false);
    sendMessage(personId, `sticker:${glyph}`, 'me');
  };

  const sendImage = async () => {
    const uri = await pickAndUpload();
    if (!uri) return;
    H.tap();
    sendMessage(personId, `image:${uri}`, 'me');
  };

  const onReact = (msg, emoji) => {
    reactToMessage(personId, msg.id, emoji);
    setReactionFor(null);
    H.select();
  };

  const blockAndLeave = () => {
    setMenuOpen(false);
    reportPerson(personId, 'harassment', 'Reported from chat');
    H.warn();
    navigation.goBack();
  };

  const confirmUnmatch = () => {
    setMenuOpen(false);
    Alert.alert(
      `Unmatch ${person.name}?`,
      'Your conversation will be removed for both of you. This can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmatch', style: 'destructive', onPress: () => { unmatchPerson(personId); H.warn(); navigation.goBack(); } },
      ],
    );
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
          <PhotoTile seed={person.id} name={person.name} rounded={20} style={{ width: 40, height: 40 }} veiled={veiledNow} />
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.hName}>{person.name}</Text>
              {person.verified && <View style={{ marginLeft: 5 }}><Verified size={12} /></View>}
            </View>
            <Text style={styles.hStatus}>{typing ? 'typing…' : person.online ? 'Online now' : 'Active recently'}</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {SIMULATED_FEATURES && (
            <>
              <Pressable style={styles.hBtn} onPress={() => navigation.navigate('MuzzCall', { personId, video: false })}><Ionicons name="call-outline" size={21} color={M.primary} /></Pressable>
              <Pressable style={styles.hBtn} onPress={() => navigation.navigate('MuzzCall', { personId, video: true })}><Ionicons name="videocam-outline" size={23} color={M.primary} /></Pressable>
            </>
          )}
          <Pressable style={styles.hBtn} onPress={() => { H.tap(); setMenuOpen(true); }}><Ionicons name="ellipsis-vertical" size={20} color={M.text} /></Pressable>
        </View>
      </View>

      {/* Wali / chaperone bar */}
      <Pressable onPress={() => { if (wali) { setChaperone(personId, null); } else { setWaliModal(true); } H.select(); }} style={[styles.chaperone, wali && { backgroundColor: M.butterflySoft }]}>
        <Ionicons name={wali ? 'shield-checkmark' : 'shield-outline'} size={15} color={wali ? M.butterfly : M.textSoft} />
        <Text style={[styles.chaperoneText, wali && { color: M.butterfly }]}>
          {wali ? `Wali (${wali.name}) is observing this chat` : 'Invite a wali to observe · tap to add'}
        </Text>
      </Pressable>

      {/* The Veil. Hers to lift: he may ask once the conversation has
          had time to breathe, and she is prompted — never overridden. */}
      {iAmVeiled && !(veil && veil.iUnveiled) && (
        <Animated.View entering={FadeIn} style={styles.unveilCard}>
          <View style={styles.unveilIcon}><Ionicons name="eye-off" size={18} color={M.textOnPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.unveilTitle}>Your photo is veiled</Text>
            <Text style={styles.unveilSub}>
              {veil && veil.theyAskedMe
                ? `${person.name} has asked — unveil only if you're comfortable.`
                : 'Unveil the photo you set aside whenever you feel ready.'}
            </Text>
          </View>
          <Pressable onPress={askUnveil} style={styles.unveilBtn}>
            <Text style={styles.unveilBtnText}>Unveil</Text>
          </Pressable>
        </Animated.View>
      )}
      {!iAmVeiled && veiledNow && (
        <UnveilRequestRow state={veil} name={person.name} onAsk={doAsk} asking={asking} />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 12 }}
          ListHeaderComponent={
            <Animated.View entering={FadeIn} style={styles.matchHeader}>
              <PhotoTile seed={person.id} name={person.name} rounded={44} style={{ width: 88, height: 88 }} veiled={veiledNow} />
              <Text style={styles.matchHeaderName}>{person.name}, {person.age}</Text>
              <View style={styles.matchChip}>
                <Ionicons name="sparkles" size={12} color={M.butterfly} />
                <Text style={styles.matchChipText}>{compat.score}% match · your matchmaker introduced you</Text>
              </View>
              {compat.reasons[0] && <Text style={styles.matchReason}>{compat.reasons[0]}</Text>}
            </Animated.View>
          }
          renderItem={({ item }) => (
            item.text === 'unveil:done'
              ? <UnveilEvent name={item.sender === 'me' ? 'You' : person.name} />
              : <Bubble item={item} reaction={reactions[`${personId}:${item.id}`]} showReceipt={item.id === lastMineId} onLongPress={() => { H.press(); setReactionFor(item); }} />
          )}
          ListFooterComponent={typing ? <TypingBubble /> : <View style={{ height: 4 }} />}
        />

        {/* Icebreakers (only before first message) */}
        {messages.length === 0 && (
          <View style={styles.iceWrap}>
            <Text style={styles.iceLabel}>Suggested openers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACE.lg, gap: 8 }}>
              {icebreakers().map((s, i) => (
                <Pressable key={i} onPress={() => send(s)} style={styles.iceChip}>
                  <Text style={styles.iceChipText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* We Met — post-date feedback (Hinge), once you've been talking */}
        {messages.length >= 4 && !(weMet && weMet[personId]) && (
          <View style={styles.weMet}>
            <Text style={styles.weMetText}>Have you met {person.name} in person?</Text>
            <View style={styles.weMetBtns}>
              <Pressable onPress={() => { H.tap(); recordWeMet(personId, false); }} style={styles.weMetBtn}>
                <Text style={styles.weMetBtnText}>Not yet</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  H.tap();
                  Alert.alert('You met 🤍', 'How did it go?', [
                    { text: 'It went well', onPress: () => recordWeMet(personId, true, true) },
                    { text: 'Not for me', onPress: () => recordWeMet(personId, true, false) },
                  ]);
                }}
                style={[styles.weMetBtn, styles.weMetYes]}
              >
                <Text style={[styles.weMetBtnText, { color: '#fff' }]}>Yes, we met</Text>
              </Pressable>
            </View>
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
          <View>
            {stickerOpen && (
              <Animated.View entering={FadeIn} style={styles.stickerTray}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: 'center' }}>
                  {STICKERS.map((s) => (
                    <Pressable key={s} onPress={() => sendSticker(s)} style={styles.stickerItem}>
                      <Text style={styles.stickerGlyph}>{s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Animated.View>
            )}
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable style={styles.plus} onPress={sendImage}><Ionicons name="image-outline" size={23} color={M.primary} /></Pressable>
            <Pressable style={styles.plus} onPress={() => { H.tap(); setStickerOpen((v) => !v); }}><Ionicons name={stickerOpen ? 'happy' : 'happy-outline'} size={23} color={M.primary} /></Pressable>
            <TextInput
              value={text} onChangeText={onChangeText}
              placeholder="Message…" placeholderTextColor={M.textMuted}
              style={styles.input} multiline
              onFocus={() => setStickerOpen(false)}
            />
            {text.trim() ? (
              <Pressable onPress={() => send()} style={styles.sendBtn}>
                <LinearGradient colors={GRAD.primary} style={styles.sendGrad}><Ionicons name="send" size={18} color="#fff" /></LinearGradient>
              </Pressable>
            ) : SIMULATED_FEATURES ? (
              <Pressable style={styles.plus} onPress={() => { H.press(); setRecording(true); }}><Ionicons name="mic-outline" size={24} color={M.primary} /></Pressable>
            ) : null}
          </View>
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
            <MenuRow icon="shield-checkmark-outline" label={wali ? `Remove wali (${wali.name})` : 'Invite a wali'} onPress={() => { setMenuOpen(false); if (wali) setChaperone(personId, null); else setWaliModal(true); }} />
            <MenuRow icon={isMuted ? 'notifications-outline' : 'notifications-off-outline'} label={isMuted ? 'Unmute notifications' : 'Mute notifications'} onPress={() => { setMenuOpen(false); toggleMute(personId); H.tap(); }} />
            <MenuRow icon="close-circle-outline" label="Unmatch" onPress={confirmUnmatch} />
            <MenuRow icon="flag-outline" label="Report" danger onPress={blockAndLeave} />
            <MenuRow icon="hand-left-outline" label="Unmatch & block" danger onPress={blockAndLeave} />
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Wali invite */}
      <Modal visible={waliModal} transparent animationType="fade" onRequestClose={() => setWaliModal(false)}>
        <Pressable style={styles.menuBg} onPress={() => setWaliModal(false)}>
          <Animated.View entering={FadeInUp} style={[styles.waliSheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.waliIcon}><Ionicons name="shield-checkmark" size={26} color={M.textOnPrimary} /></View>
            <Text style={styles.waliTitle}>Invite a wali</Text>
            <Text style={styles.waliSub}>
              A wali (guardian) can be given oversight of this conversation, in keeping with an Islamic courtship. They'll be able to view the chat.
            </Text>
            <TextInput
              value={waliName} onChangeText={setWaliName}
              placeholder="Wali's name (e.g. Br. Yusuf)" placeholderTextColor={M.textMuted}
              style={styles.waliInput} autoFocus
            />
            <Pressable onPress={confirmWali} style={styles.waliConfirm}>
              <LinearGradient colors={GRAD.primary} style={styles.waliConfirmGrad}>
                <Ionicons name="shield-checkmark" size={18} color={M.textOnPrimary} />
                <Text style={styles.waliConfirmText}>Add wali</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setWaliModal(false)} style={{ marginTop: 12 }}><Text style={styles.waliCancel}>Not now</Text></Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* The decision to unveil — always hers, always a tap */}
      <UnveilPrompt
        visible={unveilOpen}
        name={person.name}
        becauseHeAsked={!!(veil && veil.theyAskedMe)}
        onUnveil={doUnveil}
        onDismiss={() => { setUnveilOpen(false); setDismissedPrompt(true); }}
        busy={unveiling}
      />
    </View>
  );
}

function UnveilEvent({ name }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.unveilEvent}>
      <Ionicons name="eye" size={14} color={M.text} />
      <Text style={styles.unveilEventText}>{name === 'You' ? 'You unveiled your photos 🤍' : `${name} unveiled her photos for you 🤍`}</Text>
    </Animated.View>
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

function Bubble({ item, reaction, onLongPress, showReceipt }) {
  const mine = item.sender === 'me';
  const isVoice = typeof item.text === 'string' && item.text.startsWith('voice:');
  const isImage = typeof item.text === 'string' && item.text.startsWith('image:');
  const isSticker = typeof item.text === 'string' && item.text.startsWith('sticker:');
  const secs = isVoice ? Number(item.text.split(':')[1]) : 0;
  const imgUri = isImage ? item.text.slice(6) : null;

  // Stickers render as a large bare glyph — no bubble background.
  if (isSticker) {
    return (
      <Animated.View entering={mine ? FadeInUp.duration(180) : FadeInDown.duration(180)} style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <Pressable onLongPress={onLongPress} delayLongPress={250}>
          <Text style={styles.stickerBubble}>{item.text.slice(8)}</Text>
          {mine && showReceipt && (
            <View style={styles.receipt}>
              <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color={item.read ? M.blue : M.textMuted} />
              <Text style={[styles.receiptText, item.read && { color: M.blue }]}>{item.read ? 'Seen' : 'Delivered'}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

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
        {mine && showReceipt && (
          <View style={styles.receipt}>
            <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={13} color={item.read ? M.blue : M.textMuted} />
            <Text style={[styles.receiptText, item.read && { color: M.blue }]}>{item.read ? 'Seen' : 'Delivered'}</Text>
          </View>
        )}
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
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end', marginTop: 3, marginRight: 4 },
  receiptText: { ...TYPE.caption, fontSize: 11, color: M.textMuted },
  stickerBubble: { fontSize: 56, lineHeight: 66 },
  stickerTray: { backgroundColor: M.bgSoft, borderTopWidth: 1, borderTopColor: M.border, paddingVertical: 10 },
  stickerItem: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: M.bg },
  stickerGlyph: { fontSize: 28 },
  weMet: { marginHorizontal: SPACE.lg, marginBottom: 8, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, padding: 12 },
  weMetText: { ...TYPE.body, fontWeight: '700', marginBottom: 10 },
  weMetBtns: { flexDirection: 'row', gap: 10 },
  weMetBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.pill, backgroundColor: M.bg, borderWidth: 1, borderColor: M.border },
  weMetYes: { backgroundColor: M.primary, borderColor: M.primary },
  weMetBtnText: { fontWeight: '800', fontSize: 13, color: M.text },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: M.border },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  hName: { ...TYPE.h3, fontSize: 16 },
  hStatus: { ...TYPE.caption, color: M.online, marginTop: 1 },
  chaperone: { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', paddingVertical: 9, backgroundColor: M.bgSoft },
  chaperoneText: { ...TYPE.caption, color: M.textSoft, fontSize: 12 },
  unveilCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SPACE.lg, marginTop: 12,
    backgroundColor: M.bgSoft, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: M.border,
  },
  unveilIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center' },
  unveilTitle: { ...TYPE.h3, fontSize: 14.5 },
  unveilSub: { ...TYPE.caption, marginTop: 2, lineHeight: 16 },
  unveilBtn: { backgroundColor: M.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.pill },
  unveilBtnText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 13 },
  unveilEvent: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, marginVertical: 8,
  },
  unveilEventText: { ...TYPE.caption, color: M.text, fontWeight: '700' },
  waliSheet: { backgroundColor: M.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: SPACE.xl, paddingTop: 24, alignItems: 'center' },
  waliIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  waliTitle: { ...TYPE.h2, marginTop: 14, textAlign: 'center' },
  waliSub: { ...TYPE.soft, textAlign: 'center', marginTop: 6, marginBottom: 16, fontSize: 14, lineHeight: 20 },
  waliInput: { alignSelf: 'stretch', backgroundColor: M.bgInput, borderRadius: RADIUS.md, padding: 14, fontSize: 15, color: M.text, marginBottom: 16 },
  waliConfirm: { alignSelf: 'stretch' },
  waliConfirmGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: RADIUS.pill },
  waliConfirmText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
  waliCancel: { ...TYPE.body, color: M.textSoft, fontWeight: '700' },
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
