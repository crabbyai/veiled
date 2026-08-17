import { Platform } from 'react-native';
import * as api from './api';

// ─── CallKit ────────────────────────────────────────────────────────
// The system call UI. Without it an incoming call is a modal inside the
// app, which only exists while the app is running — so a call to a phone
// in a pocket never arrives, and Apple treats the `voip` background mode
// as unearned.
//
// With it: the call rings on the lock screen, appears in Recents,
// respects Do Not Disturb, and can be answered before Veiled is open.
//
// iOS rule that shapes everything here: after a VoIP push arrives you
// MUST report a call to CallKit, immediately, on every push. Miss one
// and iOS stops delivering VoIP pushes to the app and eventually kills
// it. So `reportIncoming` is called first and questions are asked after.
//
// Both native modules are loaded lazily and every function degrades to a
// no-op, so the web bundle and any build without them still run.

let CallKeep = null;
let VoipPush = null;
let loadFailed = false;
let started = false;

function lib() {
  if (loadFailed) return null;
  if (!CallKeep) {
    try {
      CallKeep = require('react-native-callkeep').default || require('react-native-callkeep');
      if (Platform.OS === 'ios') {
        VoipPush = require('react-native-voip-push-notification').default
          || require('react-native-voip-push-notification');
      }
    } catch {
      loadFailed = true;
      return null;
    }
  }
  return CallKeep;
}

export const available = () => Platform.OS !== 'web' && !!lib();

const OPTIONS = {
  ios: {
    appName: 'Veiled',
    supportsVideo: true,
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
    includesCallsInRecents: true,
  },
  android: {
    alertTitle: 'Permission required',
    alertDescription: 'Veiled needs permission to show incoming calls',
    cancelButton: 'Cancel',
    okButton: 'OK',
    additionalPermissions: [],
    foregroundService: {
      channelId: 'app.veiled.calls',
      channelName: 'Incoming calls',
      notificationTitle: 'Veiled is running in the background',
    },
  },
};

// Called once at start-up. `handlers` are how the app hears about
// answers and hang-ups that came from the system UI rather than ours.
export async function setup({ onAnswer, onEnd, onMuted } = {}) {
  const CK = lib();
  if (!CK || started) return false;
  try {
    await CK.setup(OPTIONS);
    CK.setAvailable(true);
    started = true;
  } catch {
    return false;
  }

  // The system UI is a second way in to the same call, so both routes
  // have to end in the same place.
  CK.addEventListener('answerCall', ({ callUUID }) => { if (onAnswer) onAnswer(callUUID); });
  CK.addEventListener('endCall', ({ callUUID }) => { if (onEnd) onEnd(callUUID); });
  CK.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }) => {
    if (onMuted) onMuted(callUUID, muted);
  });

  if (VoipPush) {
    // The token that lets the server ring a closed app.
    VoipPush.addEventListener('register', (token) => {
      api.mirror(() => api.registerVoipToken(token, 'ios'));
    });
    // A push arrived. Report the call to CallKit before anything else —
    // this is the part iOS enforces.
    VoipPush.addEventListener('notification', (payload) => {
      const callId = payload && (payload.callId || payload.callUUID);
      if (!callId) return;
      reportIncoming({
        callId,
        name: (payload && payload.callerName) || 'Veiled',
        video: !!(payload && payload.video),
      });
    });
    VoipPush.registerVoipToken();
  }
  return true;
}

// Ring the phone. `callId` doubles as CallKit's UUID so the two systems
// are talking about the same call without a lookup table.
export function reportIncoming({ callId, name, video }) {
  const CK = lib();
  if (!CK) return;
  try {
    CK.displayIncomingCall(callId, name || 'Veiled', name || 'Veiled', 'generic', !!video);
  } catch {}
}

// Placing a call: tell the system, so it shows in Recents and the audio
// session is set up the way a call expects.
export function reportOutgoing({ callId, name, video }) {
  const CK = lib();
  if (!CK) return;
  try {
    CK.startCall(callId, name || 'Veiled', name || 'Veiled', 'generic', !!video);
  } catch {}
}

// The far end picked up — moves the system UI from "calling" to "in call".
export function reportConnected(callId) {
  const CK = lib();
  if (!CK) return;
  try { CK.reportConnectedOutgoingCallWithUUID(callId); } catch {}
}

// The call is over, whoever ended it. Safe to call twice.
export function reportEnded(callId) {
  const CK = lib();
  if (!CK || !callId) return;
  try { CK.endCall(callId); } catch {}
}

export function reportEndedAll() {
  const CK = lib();
  if (!CK) return;
  try { CK.endAllCalls(); } catch {}
}

// Keep the system UI's mute button and ours in step.
export function setMuted(callId, muted) {
  const CK = lib();
  if (!CK) return;
  try { CK.setMutedCall(callId, !!muted); } catch {}
}
