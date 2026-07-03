import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, SafeAreaView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInRight, FadeInDown } from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { INTERESTS, VALUES, INTENTIONS, SECTS, PRAYER_LEVELS, HALAL_DIET } from '../data';
import { useMuzz } from '../store';
import { GButton, Chip } from '../components/ui';
import Butterfly from '../components/Butterfly';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { completeOnboarding } = useMuzz();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('27');
  const [gender, setGender] = useState('Man');
  const [job, setJob] = useState('');
  const [intention, setIntention] = useState('Marriage');
  const [interests, setInterests] = useState([]);
  const [values, setValues] = useState([]);
  const [bio, setBio] = useState('');
  const [sect, setSect] = useState('Sunni');
  const [prayerLevel, setPrayerLevel] = useState('Usually prays');
  const [halalDiet, setHalalDiet] = useState('Mostly halal');
  const [wali, setWali] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const steps = ['Welcome', 'You', 'Looking for', 'Deen', 'Interests', 'Values', 'Verify', 'Butterfly'];
  const total = steps.length;
  const STEP = { welcome: 0, you: 1, looking: 2, deen: 3, interests: 4, values: 5, verify: 6, done: 7 };

  const toggle = (arr, set, v, max) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else if (!max || arr.length < max) set([...arr, v]);
    H.select();
  };

  const canNext = () => {
    if (step === STEP.you) return name.trim().length > 1;
    if (step === STEP.interests) return interests.length >= 3;
    if (step === STEP.values) return values.length >= 2;
    if (step === STEP.verify) return verified;
    return true;
  };

  const runVerification = () => {
    H.press();
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerified(true); H.success(); }, 1800);
  };

  const next = () => {
    H.press();
    if (step < total - 1) setStep(step + 1);
    else completeOnboarding({
      name: name.trim(), age: Number(age) || 27, gender, job: job.trim(),
      intention, interests, values, bio: bio.trim(),
      sect, prayerLevel, halalDiet, waliEnabled: wali, selfieVerified: verified,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* progress */}
      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progressSeg, { backgroundColor: i <= step ? M.primary : M.border }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <Animated.View entering={FadeIn} style={styles.welcome}>
            <View style={styles.bfWrap}><Butterfly size={150} /></View>
            <Text style={styles.logo}>butterfly<Text style={{ color: M.butterfly }}>·ai</Text></Text>
            <Text style={styles.welcomeTitle}>Dating, without the swiping</Text>
            <Text style={styles.welcomeSub}>
              Meet your AI Butterfly. It learns who you are, then quietly finds the people you'll actually click with — and brings them to you.
            </Text>
            <View style={styles.featureList}>
              {[
                ['sparkles', 'Auto-matching — no endless swiping'],
                ['shield-checkmark', 'Verified, marriage-minded community'],
                ['people', 'Muzz Social to share your world'],
              ].map(([ic, t]) => (
                <View key={t} style={styles.featureRow}>
                  <View style={styles.featureIcon}><Ionicons name={ic} size={16} color={M.primary} /></View>
                  <Text style={styles.featureText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeInRight}>
            <Text style={styles.q}>Tell us about you</Text>
            <Text style={styles.label}>First name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={M.textMuted} style={styles.input} />
            <Text style={styles.label}>Age</Text>
            <TextInput value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" style={styles.input} />
            <Text style={styles.label}>I am a</Text>
            <View style={styles.row}>
              {['Man', 'Woman'].map((g) => (
                <Chip key={g} label={g} active={gender === g} onPress={() => setGender(g)} />
              ))}
            </View>
            <Text style={styles.label}>Job / occupation</Text>
            <TextInput value={job} onChangeText={setJob} placeholder="What do you do?" placeholderTextColor={M.textMuted} style={styles.input} />
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInRight}>
            <Text style={styles.q}>What are you here for?</Text>
            <Text style={styles.helper}>The butterfly prioritises people who want the same.</Text>
            {INTENTIONS.map((opt) => (
              <Pressable key={opt} onPress={() => { setIntention(opt); H.select(); }} style={[styles.bigOpt, intention === opt && styles.bigOptActive]}>
                <Text style={[styles.bigOptText, intention === opt && { color: M.primary }]}>{opt}</Text>
                {intention === opt && <Ionicons name="checkmark-circle" size={22} color={M.primary} />}
              </Pressable>
            ))}
          </Animated.View>
        )}

        {step === STEP.deen && (
          <Animated.View entering={FadeInRight}>
            <Text style={styles.q}>Your deen</Text>
            <Text style={styles.helper}>Faith compatibility is at the heart of good matches.</Text>
            <Text style={styles.label}>Sect</Text>
            <View style={styles.wrap}>
              {SECTS.map((s) => <Chip key={s} label={s} active={sect === s} onPress={() => setSect(s)} />)}
            </View>
            <Text style={styles.label}>How often do you pray?</Text>
            <View style={styles.wrap}>
              {PRAYER_LEVELS.map((p) => <Chip key={p} label={p} active={prayerLevel === p} onPress={() => setPrayerLevel(p)} />)}
            </View>
            <Text style={styles.label}>Do you eat halal?</Text>
            <View style={styles.wrap}>
              {HALAL_DIET.map((d) => <Chip key={d} label={d} active={halalDiet === d} onPress={() => setHalalDiet(d)} />)}
            </View>
            <Pressable onPress={() => { setWali(!wali); H.select(); }} style={[styles.bigOpt, { marginTop: 18 }, wali && styles.bigOptActive]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.bigOptText, wali && { color: M.primary }]}>Add a Wali / chaperone</Text>
                <Text style={styles.helper2}>A guardian can be invited to observe your chats.</Text>
              </View>
              <Ionicons name={wali ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={wali ? M.primary : M.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {step === STEP.interests && (
          <Animated.View entering={FadeInRight}>
            <Text style={styles.q}>What do you love?</Text>
            <Text style={styles.helper}>Pick at least 3 — these teach the butterfly.</Text>
            <View style={styles.wrap}>
              {INTERESTS.map((i) => (
                <Chip key={i} label={i} active={interests.includes(i)} onPress={() => toggle(interests, setInterests, i, 8)} />
              ))}
            </View>
          </Animated.View>
        )}

        {step === STEP.values && (
          <Animated.View entering={FadeInRight}>
            <Text style={styles.q}>What matters to you?</Text>
            <Text style={styles.helper}>Pick at least 2 values.</Text>
            <View style={styles.wrap}>
              {VALUES.map((v) => (
                <Chip key={v} label={v} active={values.includes(v)} color={M.butterfly} onPress={() => toggle(values, setValues, v, 5)} />
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 20 }]}>A line about you (optional)</Text>
            <TextInput value={bio} onChangeText={setBio} placeholder="Say something real…" placeholderTextColor={M.textMuted} multiline style={[styles.input, { height: 90, textAlignVertical: 'top' }]} />
          </Animated.View>
        )}

        {step === STEP.verify && (
          <Animated.View entering={FadeInRight} style={styles.welcome}>
            <View style={[styles.selfieRing, verified && { borderColor: M.success }]}>
              <Ionicons
                name={verified ? 'checkmark' : verifying ? 'scan' : 'camera'}
                size={44} color={verified ? M.success : M.primary}
              />
            </View>
            <Text style={styles.welcomeTitle}>
              {verified ? 'You’re verified!' : 'Selfie verification'}
            </Text>
            <Text style={styles.welcomeSub}>
              {verified
                ? 'Your profile now carries the blue verified tick. Members trust verified profiles 3x more.'
                : 'Everyone on the app is real. Take a quick selfie matching the pose — it’s never shown on your profile.'}
            </Text>
            {!verified && (
              <GButton
                label={verifying ? 'Checking…' : 'Take selfie'}
                icon={verifying ? undefined : 'camera'}
                onPress={runVerification}
                disabled={verifying}
                style={{ alignSelf: 'stretch', marginTop: 26 }}
              />
            )}
          </Animated.View>
        )}

        {step === STEP.done && (
          <Animated.View entering={FadeIn} style={styles.welcome}>
            <View style={styles.bfWrap}><Butterfly size={160} /></View>
            <Text style={styles.welcomeTitle}>Your butterfly is ready</Text>
            <Text style={styles.welcomeSub}>
              {name ? `Nice to meet you, ${name}. ` : ''}I've learned {interests.length} interests and {values.length} values. From now on, I'll fly out and bring your best matches straight to you — no swiping required.
            </Text>
            <Animated.View entering={FadeInDown.delay(300)} style={styles.statRow}>
              {[['Interests', interests.length], ['Values', values.length], ['Daily picks', '∞']].map(([l, v]) => (
                <View key={l} style={styles.stat}>
                  <Text style={styles.statVal}>{v}</Text>
                  <Text style={styles.statLabel}>{l}</Text>
                </View>
              ))}
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && step < total - 1 && (
          <Pressable onPress={() => { setStep(step - 1); H.tap(); }} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={M.textSoft} />
          </Pressable>
        )}
        <GButton
          label={step === 0 ? 'Get started' : step === total - 1 ? 'Release the butterfly' : 'Continue'}
          icon={step === total - 1 ? 'sparkles' : undefined}
          onPress={next}
          gradient={step === total - 1 ? GRAD.butterfly : GRAD.primary}
          style={{ flex: 1 }}
          disabled={!canNext()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: M.bg },
  progressRow: { flexDirection: 'row', paddingHorizontal: SPACE.xl, paddingTop: 12, gap: 5 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  scroll: { padding: SPACE.xl, paddingBottom: 30, flexGrow: 1 },
  welcome: { alignItems: 'center', paddingTop: 10 },
  bfWrap: { height: 170, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 34, fontWeight: '900', color: M.primary, letterSpacing: -1, marginTop: 4 },
  welcomeTitle: { ...TYPE.h1, fontSize: 26, textAlign: 'center', marginTop: 18 },
  welcomeSub: { ...TYPE.soft, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12, paddingHorizontal: 6 },
  featureList: { marginTop: 26, alignSelf: 'stretch', gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: M.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  featureText: { ...TYPE.body, fontWeight: '600' },
  q: { ...TYPE.hero, fontSize: 27, marginBottom: 6 },
  helper: { ...TYPE.soft, marginBottom: 18 },
  helper2: { ...TYPE.soft, fontSize: 12.5, marginTop: 3 },
  selfieRing: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: M.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: M.primarySoft, marginTop: 20,
  },
  label: { ...TYPE.caption, color: M.textSoft, marginTop: 16, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: M.bgInput, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: M.text, fontWeight: '600',
  },
  row: { flexDirection: 'row', marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  bigOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: M.bgSoft, borderRadius: RADIUS.md, padding: 18, marginBottom: 12,
    borderWidth: 1.5, borderColor: M.border,
  },
  bigOptActive: { borderColor: M.primary, backgroundColor: M.primarySoft },
  bigOptText: { ...TYPE.h3 },
  statRow: { flexDirection: 'row', marginTop: 30, gap: 14 },
  stat: { flex: 1, backgroundColor: M.bgSoft, borderRadius: RADIUS.md, paddingVertical: 18, alignItems: 'center' },
  statVal: { fontSize: 26, fontWeight: '900', color: M.butterfly },
  statLabel: { ...TYPE.caption, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', padding: SPACE.xl, gap: 12 },
  back: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: M.border, alignItems: 'center', justifyContent: 'center' },
});
