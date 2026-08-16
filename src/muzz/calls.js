import { Platform } from 'react-native';

// ─── Calls ──────────────────────────────────────────────────────────
// WebRTC, wrapped so the rest of the app deals in "start a call" and
// "here is a stream" rather than in peer connections.
//
// The media never touches our server: the two devices negotiate a direct
// connection and only the offer, the answer and the ICE candidates go
// through the socket. What that means in practice is that a call between
// two phones on the same kind of network usually connects on STUN alone,
// and the rest need a TURN relay — see TURN below.
//
// react-native-webrtc is a native module. It is loaded lazily and every
// entry point reports failure rather than throwing, so a build without
// it (and the web bundle, where calls aren't offered) degrades to
// "calling unavailable" instead of a crash.

let rtc = null;
let loadFailed = false;

function lib() {
  if (rtc || loadFailed) return rtc;
  try {
    rtc = require('react-native-webrtc');
  } catch {
    loadFailed = true;
    rtc = null;
  }
  return rtc;
}

export const canCall = () => Platform.OS !== 'web' && !!lib();

// STUN lets two devices discover their public address, which is enough
// for most home networks. It is NOT enough behind a symmetric NAT or
// stricter mobile carriers — those need a TURN relay, and without one
// those calls will ring, negotiate, and then connect to silence. Set
// EXPO_PUBLIC_TURN_URL / _USER / _PASS to a TURN server before relying
// on calls in the wild.
const TURN_URL = process.env.EXPO_PUBLIC_TURN_URL || '';
const TURN_USER = process.env.EXPO_PUBLIC_TURN_USERNAME || '';
const TURN_PASS = process.env.EXPO_PUBLIC_TURN_PASSWORD || '';

export const hasRelay = () => !!TURN_URL;

const iceServers = () => {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (TURN_URL) servers.push({ urls: TURN_URL, username: TURN_USER, credential: TURN_PASS });
  return servers;
};

// Ask for the camera and microphone and return the local stream.
// `video` false gives an audio-only call.
export async function getLocalStream({ video }) {
  const r = lib();
  if (!r) throw new Error('Calling is unavailable in this build');
  return r.mediaDevices.getUserMedia({
    audio: true,
    video: video
      ? { width: 1280, height: 720, frameRate: 30, facingMode: 'user' }
      : false,
  });
}

// A peer connection wired to a signalling transport. `send` is called
// with (event, payload) and should put it on the socket; feed what comes
// back in through the returned handlers.
export function createPeer({ stream, onRemoteStream, onState, send }) {
  const r = lib();
  if (!r) throw new Error('Calling is unavailable in this build');

  const pc = new r.RTCPeerConnection({ iceServers: iceServers() });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.addEventListener('track', (e) => {
    if (e.streams && e.streams[0] && onRemoteStream) onRemoteStream(e.streams[0]);
  });
  pc.addEventListener('icecandidate', (e) => {
    if (e.candidate) send('call:ice', { candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
  });
  pc.addEventListener('connectionstatechange', () => {
    if (onState) onState(pc.connectionState);
  });

  return {
    pc,
    // The caller offers.
    async offer() {
      const desc = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(desc);
      send('call:offer', { sdp: { type: desc.type, sdp: desc.sdp } });
    },
    // The callee answers what it was offered.
    async answerTo(sdp) {
      await pc.setRemoteDescription(new r.RTCSessionDescription(sdp));
      const desc = await pc.createAnswer();
      await pc.setLocalDescription(desc);
      send('call:answer', { sdp: { type: desc.type, sdp: desc.sdp } });
    },
    async acceptAnswer(sdp) {
      await pc.setRemoteDescription(new r.RTCSessionDescription(sdp));
    },
    async addCandidate(candidate) {
      // Candidates can arrive before the remote description is set;
      // WebRTC queues them, but a malformed one must not kill the call.
      try { await pc.addIceCandidate(new r.RTCIceCandidate(candidate)); } catch {}
    },
    close() {
      try { pc.getSenders().forEach((s) => s.track && s.track.stop()); } catch {}
      try { pc.close(); } catch {}
    },
  };
}

export function stopStream(stream) {
  try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {}
}

// Flip between the front and back cameras on the track already being
// sent, so the far end doesn't need to renegotiate.
export function switchCamera(stream) {
  try {
    const track = stream && stream.getVideoTracks()[0];
    if (track && track._switchCamera) track._switchCamera();
  } catch {}
}

export function setMuted(stream, muted) {
  try { stream.getAudioTracks().forEach((t) => { t.enabled = !muted; }); } catch {}
}

export function setVideoEnabled(stream, on) {
  try { stream.getVideoTracks().forEach((t) => { t.enabled = !!on; }); } catch {}
}

// The <RTCView> component, or null where calling isn't available.
export const VideoView = () => {
  const r = lib();
  return r ? r.RTCView : null;
};

export const newCallId = () =>
  `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
