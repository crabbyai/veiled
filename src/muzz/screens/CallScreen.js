import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { getPerson, useMuzz } from '../store';
import { PhotoTile } from '../components/ui';
import * as realtime from '../realtime';
import * as api from '../api';
import {
  canCall, hasRelay, fetchIce, getLocalStream, createPeer, stopStream,
  switchCamera, setMuted as setStreamMuted, setVideoEnabled, VideoView, newCallId,
} from '../calls';
import * as callkit from '../callkit';
import * as H from '../haptics';

const { width, height } = Dimensions.get('window');

// ─── A call ─────────────────────────────────────────────────────────
// Real WebRTC. This screen owns one call from ringing to hang-up: it
// takes the camera and microphone, negotiates with the other device
// over the socket, and shows whatever comes back.
//
// `route.params`:
//   personId          who to call
//   video             true for a video call
//   incoming          { callId, mode } when answering rather than placing
//
// Every path out of here — declined, failed, hung up, backed out of —
// has to stop the local tracks and close the peer, or the camera light
// stays on after the screen is gone.
export default function CallScreen({ route, navigation }) {
  const { personId, video: wantVideo, incoming } = route.params || {};
  const person = getPerson(personId);
  const insets = useSafeAreaInsets();
  const { matches } = useMuzz();

  const [phase, setPhase] = useState(incoming ? 'answering' : 'calling');
  // calling | ringing | answering | connecting | active | ended
  const [note, setNote] = useState(null);      // why it ended, if it did
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(!!wantVideo);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peer = useRef(null);
  const stream = useRef(null);
  const callId = useRef(incoming ? incoming.callId : newCallId());
  const isVideo = incoming ? incoming.mode === 'video' : !!wantVideo;
  const finished = useRef(false);

  const RTCView = VideoView();

  // Tear everything down exactly once, whatever route we leave by.
  const teardown = useCallback((reason) => {
    if (finished.current) return;
    finished.current = true;
    try { realtime.signal('call:end', { callId: callId.current }); } catch {}
    // The system UI outlives this screen unless it is told, and a call
    // left open there keeps the phone in a call it isn't in.
    callkit.reportEnded(callId.current);
    if (peer.current) { peer.current.close(); peer.current = null; }
    if (stream.current) { stopStream(stream.current); stream.current = null; }
    if (reason) setNote(reason);
  }, []);

  const leave = useCallback((reason) => {
    teardown(reason);
    setPhase('ended');
    // Let the reason land before the screen goes.
    setTimeout(() => { if (navigation.canGoBack()) navigation.goBack(); }, reason ? 1200 : 0);
  }, [teardown, navigation]);

  // ── Set the call up ───────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!canCall()) { setPhase('unavailable'); return; }

      let local;
      try {
        local = await getLocalStream({ video: isVideo });
      } catch {
        if (alive) { setPhase('denied'); }
        return;
      }
      if (!alive) { stopStream(local); return; }
      stream.current = local;
      setLocalStream(local);

      // Ask the server how to reach them before negotiating — this is
      // what carries the TURN credential.
      const { iceServers } = await fetchIce();
      if (!alive) { stopStream(local); return; }

      const send = (event, payload) => realtime.signal(event, { callId: callId.current, ...payload });
      peer.current = createPeer({
        stream: local,
        iceServers,
        onRemoteStream: (s) => { if (alive) { setRemoteStream(s); setPhase('active'); } },
        onState: (st) => {
          if (!alive) return;
          if (st === 'connected') setPhase('active');
          // 'failed' is the end of the road: ICE has run out of options.
          if (st === 'failed') leave(hasRelay()
            ? "Couldn't connect"
            : "Couldn't connect — this network needs a relay");
        },
        send,
      });

      if (incoming) {
        // Answering: tell them we picked up. Their offer follows.
        realtime.signal('call:accept', { callId: callId.current });
        setPhase('connecting');
      } else {
        // Placing: find their server id, ring, then offer once accepted.
        const serverId = await serverIdFor(personId);
        if (!alive) return;
        if (!serverId) { leave('Could not reach them'); return; }
        // Tell the system too, so the call shows in Recents and the
        // audio session is the one a call expects.
        callkit.reportOutgoing({ callId: callId.current, name: person?.name, video: isVideo });
        const res = await realtime.ring(serverId, { mode: isVideo ? 'video' : 'audio', callId: callId.current });
        if (!alive) return;
        if (!res.ok) {
          leave(res.error === 'offline' ? `${person?.name || 'They'} isn't online` : "Couldn't start the call");
          return;
        }
        setPhase('ringing');
      }
    })();

    return () => { alive = false; teardown(); };
  }, []);

  // ── Signalling ────────────────────────────────────────────────────
  useEffect(() => {
    const off = realtime.onCallEvent(async (event, payload) => {
      if (!payload || payload.callId !== callId.current) return;
      const p = peer.current;
      try {
        if (event === 'call:accepted' && p) { setPhase('connecting'); await p.offer(); }
        else if (event === 'call:offer' && p) await p.answerTo(payload.sdp);
        else if (event === 'call:answer' && p) await p.acceptAnswer(payload.sdp);
        else if (event === 'call:ice' && p) await p.addCandidate(payload.candidate);
        else if (event === 'call:ended') {
          leave(payload.reason === 'declined' ? 'Call declined'
            : payload.reason === 'disconnected' ? 'They lost connection'
              : null);
        }
      } catch {
        leave("Couldn't connect");
      }
    });
    return off;
  }, [leave]);

  // The clock only runs while the call is actually up.
  useEffect(() => {
    if (phase !== 'active') return undefined;
    callkit.reportConnected(callId.current);
    H.success();
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setStreamMuted(stream.current, next);
    callkit.setMuted(callId.current, next);
    H.tap();
  };
  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    setVideoEnabled(stream.current, next);
    H.tap();
  };

  if (!person) return null;

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const status = {
    calling: 'Calling…',
    ringing: 'Ringing…',
    answering: 'Connecting…',
    connecting: 'Connecting…',
    active: mmss,
    ended: note || 'Call ended',
    denied: 'Veiled needs the microphone and camera',
    unavailable: 'Calling needs the full app',
  }[phase] || '';

  const showVideo = isVideo && phase === 'active' && remoteStream && RTCView;

  return (
    <View style={styles.container}>
      {/* Them */}
      {showVideo ? (
        <RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <>
          <PhotoTile
            seed={person.id} name={person.name} rounded={0}
            uri={person.photos && person.photos[0]}
            veiled={!!person.photoVeiled}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.scrim} />
        </>
      )}

      {/* Me, in the corner, while a video call is running */}
      {isVideo && camOn && localStream && RTCView && phase !== 'ended' ? (
        <Animated.View entering={FadeIn} style={[styles.self, { top: insets.top + 16 }]}>
          <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror zOrder={1} />
        </Animated.View>
      ) : null}

      <View style={[styles.head, { paddingTop: insets.top + 28 }]}>
        {!showVideo && <Ring active={phase === 'ringing' || phase === 'calling'} />}
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.status}>{status}</Text>
        {phase === 'denied' ? (
          <Text style={styles.hint}>Turn them on in Settings › Veiled, then try again.</Text>
        ) : null}
        {phase === 'unavailable' ? (
          <Text style={styles.hint}>Calls don't run in the web preview or Expo Go — they need a full build.</Text>
        ) : null}
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 26 }]}>
        <Ctl icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Unmute' : 'Mute'} on={muted} onPress={toggleMute} disabled={!localStream} />
        {isVideo ? (
          <Ctl icon={camOn ? 'videocam' : 'videocam-off'} label="Camera" on={!camOn} onPress={toggleCam} disabled={!localStream} />
        ) : null}
        {isVideo ? (
          <Ctl icon="camera-reverse" label="Flip" onPress={() => { switchCamera(stream.current); H.tap(); }} disabled={!localStream || !camOn} />
        ) : null}
        <Pressable
          onPress={() => { H.heavy(); leave(); }}
          style={styles.hangUp}
          accessibilityRole="button"
          accessibilityLabel="End call"
        >
          <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </Pressable>
      </View>
    </View>
  );
}

// A pulse behind the avatar while it's ringing — something to watch
// that says the call is live rather than stuck.
function Ring({ active }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = active
      ? withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)
      : 0;
  }, [active]);
  const a = useAnimatedStyle(() => ({ opacity: (1 - p.value) * 0.5, transform: [{ scale: 0.7 + p.value * 0.8 }] }));
  const b = useAnimatedStyle(() => ({ opacity: (1 - Math.min(1, p.value + 0.35)) * 0.4, transform: [{ scale: 0.7 + (p.value + 0.35) * 0.8 }] }));
  if (!active) return null;
  return (
    <View style={styles.ringWrap} pointerEvents="none">
      <Animated.View style={[styles.ringPulse, a]} />
      <Animated.View style={[styles.ringPulse, b]} />
    </View>
  );
}

function Ctl({ icon, label, on, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.ctl, on && styles.ctlOn, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.9 }] }]}
    >
      <Ionicons name={icon} size={24} color={on ? '#111' : '#fff'} />
    </Pressable>
  );
}

// The local person id maps to a server user id through the match list.
async function serverIdFor(personId) {
  try {
    const { matches } = await api.matches();
    const m = matches.find((x) => api.toLocalId(x.person.id) === personId);
    return m ? m.person.id : null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0D' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,8,10,0.62)' },
  head: { alignItems: 'center', paddingHorizontal: SPACE.xl },
  ringWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  ringPulse: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  status: { ...TYPE.body, color: 'rgba(255,255,255,0.82)', marginTop: 6, fontVariant: ['tabular-nums'] },
  hint: { ...TYPE.caption, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10, lineHeight: 17 },
  self: {
    position: 'absolute', right: 16, width: 104, height: 150, borderRadius: RADIUS.md,
    overflow: 'hidden', backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  controls: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18,
  },
  ctl: {
    width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ctlOn: { backgroundColor: '#fff' },
  hangUp: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#E0263C',
    alignItems: 'center', justifyContent: 'center',
  },
});
