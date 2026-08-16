import { Platform } from 'react-native';

// ─── Voice notes ────────────────────────────────────────────────────
// A thin wrapper over expo-audio's recorder so the chat screen deals in
// start/stop and a file, not in audio session state.
//
// expo-audio is a native module: it is loaded lazily and every entry
// point reports failure rather than throwing, so a build without it (or
// the web bundle, where recording is not offered) degrades to "voice
// notes unavailable" instead of a crash on a screen people use daily.

let mod = null;
let loadFailed = false;

function audio() {
  if (mod || loadFailed) return mod;
  try {
    mod = require('expo-audio');
  } catch {
    loadFailed = true;
    mod = null;
  }
  return mod;
}

// Recording is native-only here. The browser can record, but the
// permission and format story is different enough that offering a
// half-working button is worse than not offering one.
export const canRecord = () => Platform.OS !== 'web' && !!audio();

// Ask once, when the microphone is first reached for — never at launch.
export async function requestPermission() {
  const a = audio();
  if (!a) return false;
  try {
    const res = await a.AudioModule.requestRecordingPermissionsAsync();
    return !!res.granted;
  } catch {
    return false;
  }
}

// Put the session into a state where recording works and playback is
// still audible with the ringer switch off.
export async function beginSession() {
  const a = audio();
  if (!a) return false;
  try {
    await a.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    return true;
  } catch {
    return false;
  }
}

// Hand the session back to playback once recording is done, or the
// speaker stays routed to the earpiece on iOS.
export async function endSession() {
  const a = audio();
  if (!a) return;
  try {
    await a.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  } catch {}
}

export const RECORDING_PRESET = () => {
  const a = audio();
  return a ? a.RecordingPresets.HIGH_QUALITY : null;
};

// What a recorded file should be called and typed when uploaded.
export function fileInfoFor(uri) {
  const name = (uri || '').split('?')[0].split('/').pop() || 'voice.m4a';
  const ext = (name.split('.').pop() || 'm4a').toLowerCase();
  const type = ext === 'webm' ? 'audio/webm'
    : ext === 'wav' ? 'audio/wav'
      : ext === 'mp3' ? 'audio/mpeg'
        : 'audio/m4a';
  return { name, type };
}

// The longest a single note may run. Past this the recorder stops
// itself — nobody means to send a twenty-minute voice note, and the
// upload limit would refuse it anyway.
export const MAX_MS = 3 * 60000;

export const formatDuration = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
