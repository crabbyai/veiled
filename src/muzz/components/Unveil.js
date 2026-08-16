import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M, RADIUS, SPACE, TYPE, SHADOW } from '../theme';
import * as H from '../haptics';

// The Veil, in the conversation.
//
// A sister sets aside one unveiled photo when she builds her profile.
// It is shown to nobody until she decides, match by match. Time and
// conversation only decide when it is fair to *raise* the question —
// they never reveal anything on their own, and the prompt takes "not
// yet" as a complete answer.

// Shown to her when the conversation has had time to breathe, or when
// he has asked. Never auto-accepts.
export function UnveilPrompt({ visible, name, becauseHeAsked, onUnveil, onDismiss, busy }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.bg} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.icon}><Ionicons name="eye-outline" size={26} color={M.textOnPrimary} /></View>

          <Text style={styles.title}>
            {becauseHeAsked ? `${name} asked to see your photo` : `Would you like ${name} to see your photo?`}
          </Text>
          <Text style={styles.body}>
            {becauseHeAsked
              ? `You've been talking a while. ${name} has asked whether you'd unveil the photo you set aside. It stays hidden unless you say yes, and only ${name} would see it.`
              : `You've been talking a while. If you're comfortable, you can unveil the photo you set aside — only ${name} will see it.`}
          </Text>

          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={14} color={M.textSoft} />
            <Text style={styles.noteText}>Only for this conversation. You can keep it veiled as long as you like.</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Unveil my photo for ${name}`}
            onPress={() => { H.success(); onUnveil(); }}
            disabled={busy}
            style={[styles.primary, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryText}>{busy ? 'Unveiling…' : `Unveil for ${name}`}</Text>
          </Pressable>
          <Pressable onPress={() => { H.tap(); onDismiss(); }} style={styles.secondary}>
            <Text style={styles.secondaryText}>Not yet</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// His side: a single, quiet request. Asking twice isn't allowed.
export function UnveilRequestRow({ state, name, onAsk, asking }) {
  if (!state || state.theyUnveiled) return null;
  const asked = state.iAsked || asking;
  return (
    <View style={styles.row}>
      <Ionicons name={asked ? 'hourglass-outline' : 'eye-off-outline'} size={16} color={M.textSoft} />
      <Text style={styles.rowText} numberOfLines={2}>
        {asked
          ? `You've asked ${name} to unveil — it's her decision, whenever she's ready.`
          : state.ripe
            ? `${name} keeps her photos veiled. You can ask if she'd like to unveil.`
            : `${name} keeps her photos veiled until she chooses to unveil.`}
      </Text>
      {!asked && state.ripe && (
        <Pressable accessibilityRole="button" onPress={() => { H.tap(); onAsk(); }} style={styles.askBtn}>
          <Text style={styles.askText}>Ask</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: M.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: SPACE.xl, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, marginBottom: 16 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { ...TYPE.h1, fontSize: 22, textAlign: 'center' },
  body: { ...TYPE.soft, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 12 },
  noteText: { ...TYPE.caption, color: M.textSoft, flex: 1, lineHeight: 16 },
  primary: { alignSelf: 'stretch', backgroundColor: M.primary, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  primaryText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
  secondary: { paddingVertical: 15 },
  secondaryText: { ...TYPE.soft, fontWeight: '800', color: M.textSoft },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACE.lg, marginTop: 8, backgroundColor: M.bgSoft, borderWidth: 1, borderColor: M.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  rowText: { ...TYPE.caption, color: M.textSoft, flex: 1, lineHeight: 16 },
  askBtn: { backgroundColor: M.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, ...SHADOW.soft },
  askText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 12.5 },
});
