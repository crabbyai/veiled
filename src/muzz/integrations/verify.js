// ─── Identity / selfie verification (client) ────────────────────────
// Asks the backend to open a provider session, then launches the
// provider's flow. Falls back to opening a hosted verification URL. The
// backend flips selfie_verified when the provider webhook confirms.

import { Linking } from 'react-native';
import * as api from '../api';

// Returns { started, provider } or { started:false, reason }.
export async function startVerification() {
  if (!api.isConfigured()) return { started: false, reason: 'offline' };
  try {
    const session = await api.verificationStart(); // { provider, sessionToken, inquiryId?, hostedUrl? }
    if (session.provider === 'persona') {
      // With react-native-persona installed you'd launch the native flow:
      //   const Persona = require('react-native-persona');
      //   Persona.default.fromInquiry(session.inquiryId).sessionToken(session.sessionToken).build().start();
      // Fallback: open Persona hosted flow.
      if (session.inquiryId) {
        await Linking.openURL(`https://withpersona.com/verify?inquiry-id=${session.inquiryId}`).catch(() => {});
        return { started: true, provider: 'persona' };
      }
    }
    if (session.provider === 'onfido' && session.hostedUrl) {
      await Linking.openURL(session.hostedUrl).catch(() => {});
      return { started: true, provider: 'onfido' };
    }
    return { started: false, reason: 'unconfigured' };
  } catch (e) {
    return { started: false, reason: e?.message || 'error' };
  }
}
