import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { M, RADIUS, SPACE, TYPE } from '../theme';
import { useMuzz } from '../store';
import { VeilGlyph } from '../components/Butterfly';
import * as H from '../haptics';

const PRIVACY_URL = 'https://crabbyai.github.io/veiled-support/privacy.html';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const MIN_PASSWORD = 6; // matches the server

// Create an account or sign back in. Veiled needs one: your profile,
// matches and conversations live on the server so they follow you
// between devices, and only a signed-in member can be shown to others.
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useMuzz();
  const [mode, setMode] = useState('up'); // 'up' = create, 'in' = sign in
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const creating = mode === 'up';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = emailOk && password.length >= MIN_PASSWORD && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = creating
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setBusy(false);
    if (res.ok) { H.success(); return; }
    H.warn();
    setError(res.error || 'Something went wrong. Please try again.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: SPACE.xl, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown} style={styles.head}>
          <VeilGlyph color={M.text} size={64} />
          <Text style={styles.title}>{creating ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.sub}>
            {creating
              ? 'Marriage-minded, and only for those who mean it.'
              : 'Sign in to pick up where you left off.'}
          </Text>
        </Animated.View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={(v) => { setEmail(v); setError(null); }}
          placeholder="you@example.com"
          placeholderTextColor={M.textMuted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.pwRow}>
          <TextInput
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
            placeholder={`At least ${MIN_PASSWORD} characters`}
            placeholderTextColor={M.textMuted}
            style={[styles.input, styles.pwInput]}
            secureTextEntry={!showPw}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType={creating ? 'newPassword' : 'password'}
            autoComplete={creating ? 'password-new' : 'password'}
            onSubmitEditing={submit}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            onPress={() => { H.tap(); setShowPw((v) => !v); }}
            style={styles.pwEye}
          >
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={M.textSoft} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={16} color={M.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={creating ? 'Create account' : 'Sign in'}
          accessibilityState={{ disabled: !ready }}
          onPress={submit}
          style={[styles.cta, !ready && styles.ctaOff]}
        >
          <Text style={[styles.ctaText, !ready && styles.ctaTextOff]}>
            {busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable onPress={() => { H.tap(); setMode(creating ? 'in' : 'up'); setError(null); }} style={styles.switch}>
          <Text style={styles.switchText}>
            {creating ? 'Already have an account? Sign in' : 'New to Veiled? Create an account'}
          </Text>
        </Pressable>

        {creating && (
          <Text style={styles.legal}>
            You must be 18 or over to use Veiled. By continuing you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>Terms of Use</Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>Privacy Policy</Text>.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  head: { alignItems: 'center', marginBottom: 34 },
  title: { ...TYPE.h1, marginTop: 18, textAlign: 'center' },
  sub: { ...TYPE.soft, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  label: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '800', marginBottom: 8, marginTop: 16 },
  input: { ...TYPE.body, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, paddingHorizontal: 16, paddingVertical: 15 },
  pwRow: { justifyContent: 'center' },
  pwInput: { paddingRight: 52 },
  pwEye: { position: 'absolute', right: 6, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  errorText: { ...TYPE.soft, color: M.danger, fontWeight: '700', flex: 1 },
  cta: { backgroundColor: M.primary, borderRadius: RADIUS.pill, paddingVertical: 17, alignItems: 'center', marginTop: 26 },
  ctaOff: { backgroundColor: M.border },
  ctaText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
  ctaTextOff: { color: M.textMuted },
  switch: { paddingVertical: 18, alignItems: 'center' },
  switchText: { ...TYPE.soft, fontWeight: '800', color: M.text },
  legal: { ...TYPE.caption, color: M.textMuted, textAlign: 'center', lineHeight: 17, marginTop: 6 },
  legalLink: { color: M.text, fontWeight: '700', textDecorationLine: 'underline' },
});
