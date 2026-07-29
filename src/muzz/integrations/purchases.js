// ─── In-app purchases (Veiled Gold, Roses) ──────────────────────────
// Thin wrapper over RevenueCat (react-native-purchases). Falls back to a
// no-op "unavailable" state on web / when the SDK or key is missing, so
// the paywall UI still renders. Every purchase is verified server-side
// via api.billingVerify so entitlements can't be spoofed.

import { Platform } from 'react-native';
import * as api from '../api';

const RC_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let Purchases = null;
let ready = false;

function lib() {
  if (Platform.OS === 'web') return null;
  if (!Purchases) { try { Purchases = require('react-native-purchases').default; } catch { return null; } }
  return Purchases;
}

export function isAvailable() {
  return !!lib() && !!RC_KEY;
}

// Call once after login with the server user id so entitlements attach.
export async function init(appUserId) {
  const P = lib();
  if (!P || !RC_KEY) return false;
  try {
    P.configure({ apiKey: RC_KEY, appUserID: appUserId ? String(appUserId) : undefined });
    ready = true;
    return true;
  } catch (e) {
    console.warn('[purchases] init failed', e.message);
    return false;
  }
}

// Returns available packages (Gold subscriptions, Rose packs) or [].
export async function getOfferings() {
  const P = lib();
  if (!P || !ready) return [];
  try {
    const offerings = await P.getOfferings();
    return offerings?.current?.availablePackages || [];
  } catch { return []; }
}

// Purchase a package, then verify the receipt with our backend.
export async function purchase(pkg) {
  const P = lib();
  if (!P || !ready) return { ok: false, error: 'unavailable' };
  try {
    const { customerInfo, productIdentifier } = await P.purchasePackage(pkg);
    // Hand the platform receipt to the server for authoritative granting.
    await api.billingVerify({
      platform: Platform.OS,
      productId: productIdentifier,
      // RevenueCat manages the receipt; still notify the server to sync.
      revenueCatUserId: customerInfo?.originalAppUserId,
    }).catch(() => {});
    return { ok: true, customerInfo };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message };
  }
}

export async function restore() {
  const P = lib();
  if (!P || !ready) return { ok: false };
  try { const info = await P.restorePurchases(); return { ok: true, info }; } catch (e) { return { ok: false, error: e?.message }; }
}
