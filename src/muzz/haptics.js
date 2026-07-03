import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Safe haptics wrapper — no-ops on web, never throws.
const ok = Platform.OS !== 'web';

export const tap = () => { try { ok && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} };
export const press = () => { try { ok && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} };
export const heavy = () => { try { ok && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {} };
export const success = () => { try { ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} };
export const warn = () => { try { ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {} };
export const select = () => { try { ok && Haptics.selectionAsync(); } catch {} };
