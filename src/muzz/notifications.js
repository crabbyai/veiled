// ─── Push notifications ─────────────────────────────────────────────
// Registers the device's Expo push token with the backend (native only)
// and provides local notifications for in-app events. All calls are
// safe no-ops on web or when permissions are denied.

import { Platform } from 'react-native';
import * as api from './api';

const isNative = Platform.OS !== 'web';

let Notifications = null;
function lib() {
  if (!isNative) return null;
  if (!Notifications) {
    try { Notifications = require('expo-notifications'); } catch { return null; }
  }
  return Notifications;
}

export async function registerForPush() {
  const N = lib();
  if (!N || !api.isConfigured()) return null;
  try {
    const { status } = await N.requestPermissionsAsync();
    if (status !== 'granted') return null;
    const { data: token } = await N.getExpoPushTokenAsync();
    if (token && (await api.isAvailable())) {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/dating/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await api.loadToken()}`,
        },
        body: JSON.stringify({ token, platform: Platform.OS }),
      }).catch(() => {});
    }
    return token;
  } catch {
    return null;
  }
}

export async function localNotify(title, body) {
  const N = lib();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({ content: { title, body, sound: 'default' }, trigger: null });
  } catch {}
}
