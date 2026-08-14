import React from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M, RADIUS, SPACE, TYPE, SHADOW } from '../theme';
import * as H from '../haptics';

// Prompt answers are set in an editorial serif; her question is her
// words, so it gets the same treatment.
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export const MIN_ANSWER = 10;
export const MAX_ANSWER = 500;
export const MAX_QUESTION = 140;

// Lift the sheet above the keyboard on device. On web the browser
// already does that, and the wrapper is worse than useless there: it
// stretches to fill the bottom-aligned backdrop, and the sheet then
// aligns to the top of *it*, leaving the sheet floating above the
// bottom edge. So on web there is no wrapper at all.
export function Avoider({ children }) {
  if (Platform.OS === 'web') return children;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{children}</KeyboardAvoidingView>;
}

// The question as it appears on her profile, with a note that a like has
// to go through it. Read-only — tapping is what opens the answer sheet.
export function CompatQuestionCard({ question, name, answered, onPress, style }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Answer ${name}'s question` : undefined}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.cardTop}>
        <Ionicons name="help-circle" size={16} color={M.butterfly} />
        <Text style={styles.cardKicker}>Compatibility Question</Text>
      </View>
      <Text style={styles.cardQ}>{question}</Text>
      {answered ? (
        <View style={styles.answeredRow}>
          <Ionicons name="checkmark-circle" size={15} color={M.success} />
          <Text style={styles.answeredText}>You answered this</Text>
        </View>
      ) : onPress ? (
        <View style={styles.cardCta}>
          <Text style={styles.cardCtaText}>Answer to like {name}</Text>
          <Ionicons name="arrow-forward" size={15} color={M.text} />
        </View>
      ) : null}
    </Pressable>
  );
}

// The sheet a man writes his answer in. `onSend(text)` fires only with an
// answer long enough to be worth reading — the whole point of the
// question is that it can't be skipped past with "hey".
export function AnswerSheet({ visible, question, name, onClose, onSend, sending }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = React.useState('');

  // Clear between people so one person's answer never opens on another.
  React.useEffect(() => { if (visible) setText(''); }, [visible, question]);

  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN_ANSWER;

  const send = () => {
    if (tooShort || sending) return;
    H.success();
    onSend(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBg} onPress={onClose}>
        <Avoider>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={() => {}}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheetIcon}><Ionicons name="help-circle" size={26} color={M.textOnPrimary} /></View>
              <Text style={styles.sheetTitle}>Answer {name}'s{'\n'}Compatibility Question</Text>
              <Text style={styles.sheetQ}>{question}</Text>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write a thoughtful answer…"
                placeholderTextColor={M.textMuted}
                style={styles.input}
                multiline
                autoFocus
                maxLength={MAX_ANSWER}
              />
              <View style={styles.meta}>
                <Text style={styles.metaText}>
                  {tooShort ? `${MIN_ANSWER - trimmed.length} more character${MIN_ANSWER - trimmed.length === 1 ? '' : 's'}` : `${trimmed.length}/${MAX_ANSWER}`}
                </Text>
                <Text style={styles.metaText}>{name} decides from your answer</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send answer"
                accessibilityState={{ disabled: tooShort || !!sending }}
                onPress={send}
                style={[styles.send, (tooShort || sending) && styles.sendOff]}
              >
                <Text style={[styles.sendText, (tooShort || sending) && styles.sendTextOff]}>
                  {sending ? 'Sending…' : 'Send answer'}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.cancel}>
                <Text style={styles.cancelText}>Not now</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Avoider>
      </Pressable>
    </Modal>
  );
}

// Her own question, on her profile: set it, reword it, or take it down.
export function QuestionEditor({ visible, initial, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = React.useState(initial || '');
  React.useEffect(() => { if (visible) setText(initial || ''); }, [visible, initial]);

  const trimmed = text.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBg} onPress={onClose}>
        <Avoider>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={() => {}}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheetIcon}><Ionicons name="help-circle" size={26} color={M.textOnPrimary} /></View>
              <Text style={styles.sheetTitle}>Your Compatibility{'\n'}Question</Text>
              <Text style={styles.sheetSub}>
                Anyone you haven't liked has to answer this before they can like your profile.
                You read the answers and decide.
              </Text>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write your own question about something important to you"
                placeholderTextColor={M.textMuted}
                style={styles.input}
                multiline
                autoFocus
                maxLength={MAX_QUESTION}
              />
              <Text style={styles.counter}>{trimmed.length}/{MAX_QUESTION}</Text>

              <Text style={styles.ideasLabel}>Ideas</Text>
              {QUESTION_IDEAS.map((q) => (
                <Pressable key={q} onPress={() => { H.select(); setText(q); }} style={styles.idea}>
                  <Text style={styles.ideaText}>{q}</Text>
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                onPress={() => { if (!trimmed) return; H.success(); onSave(trimmed); }}
                style={[styles.send, !trimmed && styles.sendOff]}
              >
                <Text style={[styles.sendText, !trimmed && styles.sendTextOff]}>
                  {initial ? 'Save question' : 'Set my question'}
                </Text>
              </Pressable>
              {initial ? (
                <Pressable onPress={() => { H.tap(); onSave(null); }} style={styles.cancel}>
                  <Text style={[styles.cancelText, { color: M.danger }]}>Remove my question</Text>
                </Pressable>
              ) : (
                <Pressable onPress={onClose} style={styles.cancel}>
                  <Text style={styles.cancelText}>Not now</Text>
                </Pressable>
              )}
            </ScrollView>
          </Pressable>
        </Avoider>
      </Pressable>
    </Modal>
  );
}

const QUESTION_IDEAS = [
  'What does an ordinary Tuesday look like in the home you want to build?',
  'How do you want to raise children in deen?',
  'What are you working on in yourself right now?',
  'How would you want us to handle a disagreement neither of us can win?',
  'What does your family need to see from a husband?',
];

const styles = StyleSheet.create({
  card: { backgroundColor: M.bg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: M.border, padding: 20, marginBottom: 16, ...SHADOW.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardKicker: { ...TYPE.caption, color: M.butterfly, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardQ: { fontFamily: SERIF, fontSize: 24, lineHeight: 32, color: M.text },
  cardCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  cardCtaText: { ...TYPE.body, fontWeight: '800', color: M.text },
  answeredRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  answeredText: { ...TYPE.soft, color: M.success, fontWeight: '800' },

  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: M.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: SPACE.xl, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: M.border, alignSelf: 'center', marginBottom: 16 },
  sheetIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: M.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { ...TYPE.h1, fontSize: 24, textAlign: 'center', marginBottom: 12 },
  sheetSub: { ...TYPE.soft, textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  sheetQ: { fontFamily: SERIF, fontSize: 22, lineHeight: 30, color: M.text, textAlign: 'center', marginBottom: 20, paddingHorizontal: 4 },
  input: { ...TYPE.body, minHeight: 110, maxHeight: 200, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, padding: 14, textAlignVertical: 'top' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 18 },
  metaText: { ...TYPE.caption, color: M.textMuted },
  counter: { ...TYPE.caption, color: M.textMuted, textAlign: 'right', marginTop: 8, marginBottom: 18 },
  ideasLabel: { ...TYPE.caption, color: M.textSoft, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '800', marginBottom: 8 },
  idea: { backgroundColor: M.bgSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: M.border, padding: 14, marginBottom: 8 },
  ideaText: { ...TYPE.soft, color: M.text, lineHeight: 20 },
  send: { backgroundColor: M.primary, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center', marginTop: 14 },
  sendOff: { backgroundColor: M.border },
  sendText: { color: M.textOnPrimary, fontWeight: '800', fontSize: 16 },
  sendTextOff: { color: M.textMuted },
  cancel: { paddingVertical: 14, alignItems: 'center' },
  cancelText: { ...TYPE.soft, fontWeight: '800', color: M.textSoft },
});
