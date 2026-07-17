import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { M, GRAD, RADIUS, SHADOW, gradFor } from '../theme';
import { mediaUrl } from '../api';
import { IslamicPattern } from './Pattern';
import * as H from '../haptics';

// ── Photo surface ────────────────────────────────────────────────────
// Renders a real image when `uri` is given, otherwise a deterministic
// gradient with a soft person silhouette (`silhouette`) or initial.
// `veiled` draws The Veil: a frosted layer that hides the photo until
// she unveils it for a match (pass `veilLabel` to explain it inline).
export function PhotoTile({ seed = '', name = '', style, rounded = RADIUS.lg, gradient, children, dim = false, silhouette, uri, veiled = false, veilLabel, pattern = false }) {
  const g = gradient || gradFor(seed || name);
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const src = uri ? mediaUrl(uri) : null;
  return (
    <View style={[{ borderRadius: rounded, overflow: 'hidden', backgroundColor: g[1] }, style]}>
      {src ? (
        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={veiled ? 60 : 0} />
      ) : (
        <>
          <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {/* soft mesh accent for depth */}
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'transparent', 'rgba(0,0,0,0.10)']}
            start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill}
          />
          {pattern && !veiled && <IslamicPattern color="#FFFFFF" opacity={0.06} tile={54} />}
          {silhouette ? (
            <View style={styles.silhouette}>
              <Ionicons name="person" size={silhouette} color="rgba(255,255,255,0.20)" />
            </View>
          ) : !children && !veiled && (
            <View style={styles.center}>
              <Text style={styles.initial}>{initial}</Text>
            </View>
          )}
        </>
      )}
      {veiled && (
        <LinearGradient colors={GRAD.veil} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.center}>
          {/* The Veil as a mashrabiya screen */}
          <IslamicPattern color="#FFFFFF" opacity={0.16} tile={44} strokeWidth={1.1} />
          <View style={styles.veilIcon}>
            <Ionicons name="eye-off" size={20} color="#fff" />
          </View>
          {!!veilLabel && <Text style={styles.veilText}>{veilLabel}</Text>}
        </LinearGradient>
      )}
      {dim && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} />}
      {children}
    </View>
  );
}

// ── Veil badge ───────────────────────────────────────────────────────
// Small pill showing her veil style — Hijab or Niqab. Worn with pride.
export function VeilBadge({ veil, size = 'md', style }) {
  if (!veil) return null;
  const isNiqab = veil === 'Niqab';
  const small = size === 'sm';
  return (
    <View style={[styles.veilBadge, isNiqab && { backgroundColor: M.veilDeep }, small && { paddingHorizontal: 8, paddingVertical: 3 }, style]}>
      <Ionicons name={isNiqab ? 'moon' : 'sparkles'} size={small ? 10 : 12} color="#fff" style={{ marginRight: 4 }} />
      <Text style={[styles.veilBadgeText, small && { fontSize: 10 }]}>{isNiqab ? 'Niqabi' : 'Hijabi'}</Text>
    </View>
  );
}

// ── Round avatar ─────────────────────────────────────────────────────
export function Avatar({ name = '', seed, size = 44, ring, online, uri }) {
  return (
    <View>
      <PhotoTile
        seed={seed || name}
        name={name}
        uri={uri}
        rounded={size / 2}
        style={[{ width: size, height: size }, ring && { borderWidth: 2.5, borderColor: ring }]}
      />
      {online && (
        <View style={[styles.dot, { width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13 }]} />
      )}
    </View>
  );
}

// ── Verified tick ────────────────────────────────────────────────────
export function Verified({ size = 16 }) {
  return (
    <View style={[styles.verified, { width: size + 2, height: size + 2, borderRadius: (size + 2) / 2 }]}>
      <Ionicons name="checkmark" size={size - 5} color="#fff" />
    </View>
  );
}

// ── Primary gradient button ──────────────────────────────────────────
export function GButton({ label, icon, onPress, gradient = GRAD.primary, style, textStyle, disabled, small }) {
  return (
    <Pressable
      onPress={() => { if (!disabled) { H.press(); onPress && onPress(); } }}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      <LinearGradient
        colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.gbtn, small && { paddingVertical: 11 }, SHADOW.primary]}
      >
        {icon && <Ionicons name={icon} size={18} color={M.textOnPrimary} style={{ marginRight: 8 }} />}
        <Text style={[styles.gbtnText, small && { fontSize: 14 }, textStyle]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ── Secondary / outline button ───────────────────────────────────────
export function OButton({ label, icon, onPress, style, tint = M.text }) {
  return (
    <Pressable
      onPress={() => { H.tap(); onPress && onPress(); }}
      style={({ pressed }) => [styles.obtn, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      {icon && <Ionicons name={icon} size={18} color={tint} style={{ marginRight: 8 }} />}
      <Text style={[styles.obtnText, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

// ── Chip / pill ──────────────────────────────────────────────────────
export function Chip({ label, icon, active, onPress, color = M.primary }) {
  return (
    <Pressable
      onPress={onPress ? () => { H.select(); onPress(); } : undefined}
      style={[
        styles.chip,
        active
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: M.bgSoft, borderColor: M.border },
      ]}
    >
      {icon && <Ionicons name={icon} size={13} color={active ? '#fff' : M.textSoft} style={{ marginRight: 5 }} />}
      <Text style={[styles.chipText, { color: active ? '#fff' : M.textSoft }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  silhouette: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  initial: { color: 'rgba(255,255,255,0.92)', fontWeight: '800', fontSize: 22 },
  dot: {
    position: 'absolute', right: -1, bottom: -1, backgroundColor: M.online,
    borderWidth: 2, borderColor: '#fff',
  },
  verified: { backgroundColor: M.blue, alignItems: 'center', justifyContent: 'center' },
  gbtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, paddingHorizontal: 22, borderRadius: RADIUS.pill,
  },
  gbtnText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
  obtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 22, borderRadius: RADIUS.pill,
    borderWidth: 1.5, borderColor: M.border, backgroundColor: M.bg,
  },
  obtnText: { fontWeight: '700', fontSize: 15 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: RADIUS.pill, borderWidth: 1, marginRight: 8, marginBottom: 8,
  },
  chipText: { fontWeight: '700', fontSize: 13 },
  veilIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
  },
  veilText: {
    color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center',
    marginTop: 8, paddingHorizontal: 14, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6,
  },
  veilBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.pill, backgroundColor: 'rgba(17,17,17,0.92)',
  },
  veilBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11.5 },
});
