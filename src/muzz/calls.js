import { Platform } from 'react-native';
import * as api from './api';
import { createPeerFlow } from './callFlow';

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
// on most home networks. It is NOT enough behind symmetric NAT or some
// mobile carriers — those need a TURN relay.
//
// The relay's credentials come from the server when a call starts, not
// from the bundle: a long-lived TURN password compiled into an app can
// be lifted out of it and used to relay anyone's traffic on your bill.
const FALLBACK = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

let cached = null;   // { iceServers, relay, at }
const CACHE_MS = 5 * 60000;

// Fetch how to reach the other device. Falls back to plain STUN if the
// server can't be reached — a call that might not connect beats no call
// at all, and `relay` says which it is so the screen can be honest.
export async function fetchIce() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached;
  try {
    const res = await api.iceServers();
    const servers = Array.isArray(res.iceServers) && res.iceServers.length ? res.iceServers : FALLBACK;
    cached = { iceServers: servers, relay: !!res.relay, at: Date.now() };
  } catch {
    cached = { iceServers: FALLBACK, relay: false, at: Date.now() };
  }
  return cached;
}

// What the last fetch said about whether a relay is available. Only
// meaningful after fetchIce() — before that it is honestly unknown.
export const hasRelay = () => !!(cached && cached.relay);

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
//
// The sequence itself lives in callFlow.js, which is free of anything
// platform-specific so it can be run against a real WebRTC stack in a
// test. This only supplies react-native-webrtc's constructors.
export function createPeer(opts) {
  const r = lib();
  if (!r) throw new Error('Calling is unavailable in this build');
  return createPeerFlow({
    RTCPeerConnection: r.RTCPeerConnection,
    RTCSessionDescription: r.RTCSessionDescription,
    RTCIceCandidate: r.RTCIceCandidate,
    ...opts,
    iceServers: opts.iceServers || FALLBACK,
  });
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
