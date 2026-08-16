import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { getPerson } from '../store';
import * as realtime from '../realtime';
import * as api from '../api';
import * as H from '../haptics';

// ─── An incoming call ───────────────────────────────────────────────
// Mounted once, above everything, so a call can arrive whatever screen
// someone is on. It only announces the call — answering hands off to
// the call screen, which owns the media.
//
// It stops ringing on its own after RING_MS: a call nobody answers must
// not buzz a phone in a pocket indefinitely.
const RING_MS = 35000;

export default function IncomingCall({ navRef }) {
  const insets = useSafeAreaInsets();
  const [call, setCall] = useState(null);   // { callId, from, mode, person }
  const timer = useRef(null);

  useEffect(() => {
    const off = realtime.onCallEvent(async (event, payload) => {
      if (event === 'call:incoming') {
        // Who is ringing: map their server id back to a local person.
        let person = null;
        try {
          const { matches } = await api.matches();
          const m = matches.find((x) => x.person.id === payload.from);
          if (m) person = getPerson(api.toLocalId(m.person.id)) || m.person;
        } catch {}
        setCall({ ...payload, person });
        H.heavy();
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          realtime.signal('call:decline', { callId: payload.callId, reason: 'missed' });
          setCall(null);
        }, RING_MS);
      } else if (event === 'call:ended') {
        // They gave up before it was answered.
        setCall((c) => (c && c.callId === payload.callId ? null : c));
      }
    });
    return () => { off(); clearTimeout(timer.current); };
  }, []);

  const decline = () => {
    if (!call) return;
    H.tap();
    realtime.signal('call:decline', { callId: call.callId, reason: 'declined' });
    clearTimeout(timer.current);
    setCall(null);
  };

  const accept = () => {
    if (!call) return;
    H.press();
    clearTimeout(timer.current);
    const c = call;
    setCall(null);
    navRef.current?.navigate('MuzzCall', {
      personId: c.person ? c.person.id : null,
      video: c.mode === 'video',
      incoming: { callId: c.callId, mode: c.mode },
    });
  };

  if (!call) return null;
  const name = call.person ? call.person.name : 'Someone';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.bg}>
        <Animated.View entering={FadeIn} style={[styles.card, { marginTop: insets.top + 20 }]}>
          <Pulse />
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.kind}>
            Incoming {call.mode === 'video' ? 'video call' : 'call'}
          </Text>
          <View style={styles.row}>
            <Pressable onPress={decline} style={[styles.btn, styles.decline]} accessibilityRole="button" accessibilityLabel="Decline">
              <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
            <Pressable onPress={accept} style={[styles.btn, styles.accept]} accessibilityRole="button" accessibilityLabel="Answer">
              <Ionicons name={call.mode === 'video' ? 'videocam' : 'call'} size={26} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Pulse() {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withSequence(withTiming(1.12, { duration: 620 }), withTiming(1, { duration: 620 })), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.bell, style]}>
      <Ionicons name="call" size={26} color={M.textOnPrimary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(8,8,10,0.7)', alignItems: 'center' },
  card: {
    width: '92%', backgroundColor: M.bg, borderRadius: RADIUS.xl,
    padding: SPACE.xl, alignItems: 'center',
  },
  bell: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: M.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...TYPE.h1, marginTop: 14 },
  kind: { ...TYPE.soft, marginTop: 4 },
  row: { flexDirection: 'row', gap: 34, marginTop: 22 },
  btn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: '#E0263C' },
  accept: { backgroundColor: '#12B76A' },
});
