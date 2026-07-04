import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { M, GRAD, RADIUS, SPACE, SHADOW, TYPE } from '../theme';
import { useMuzz } from '../store';
import { GButton } from '../components/ui';
import * as H from '../haptics';

const { width } = Dimensions.get('window');

// Selfie verification: mimics a real pose-match liveness check. On
// success the profile earns the verified tick. The selfie itself is
// never shown on the profile — it only proves the person is real.
const POSES = [
  { icon: 'happy-outline', label: 'Look straight ahead' },
  { icon: 'arrow-back-outline', label: 'Turn slightly left' },
  { icon: 'hand-left-outline', label: 'Raise your right hand' },
];

export default function VerifyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, setMe } = useMuzz();
  const [phase, setPhase] = useState(me.selfieVerified ? 'done' : 'intro'); // intro | scanning | done
  const [pose, setPose] = useState(0);

  const scan = useSharedValue(0);
  useEffect(() => {
    if (phase !== 'scanning') return;
    scan.value = 0;
    scan.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    let p = 0;
    const iv = setInterval(() => {
      p += 1;
      if (p < POSES.length) { setPose(p); H.select(); }
      else {
        clearInterval(iv);
        setMe({ selfieVerified: true });
        setPhase('done');
        H.success();
      }
    }, 1100);
    return () => clearInterval(iv);
  }, [phase]);

  const scanLine = useAnimatedStyle(() => ({
    transform: [{ translateY: 30 + scan.value * (width * 0.6 - 60) }],
    opacity: 0.5 + scan.value * 0.5,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.hBtn}>
          <Ionicons name="chevron-back" size={28} color={M.text} />
        </Pressable>
        <Text style={styles.title}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={[styles.ring, phase === 'done' && { borderColor: M.success }]}>
          {phase === 'scanning' && <Animated.View style={[styles.scanLine, scanLine]} />}
          <Ionicons
            name={phase === 'done' ? 'checkmark' : phase === 'scanning' ? POSES[pose].icon : 'person-outline'}
            size={64}
            color={phase === 'done' ? M.success : M.text}
          />
          {phase === 'done' && (
            <Animated.View entering={FadeIn} style={styles.tick}><Ionicons name="shield-checkmark" size={26} color={M.textOnPrimary} /></Animated.View>
          )}
        </View>

        {phase === 'intro' && (
          <Animated.View entering={FadeInDown} style={styles.copy}>
            <Text style={styles.h}>Get verified</Text>
            <Text style={styles.p}>
              A quick selfie proves you're a real person. Follow the poses on screen — your selfie is used only to verify you and is never shown on your profile.
            </Text>
            <View style={styles.points}>
              {['Match the pose prompts', 'Takes about 5 seconds', 'Earns the verified tick — members trust verified profiles 3× more'].map((t) => (
                <View key={t} style={styles.point}>
                  <Ionicons name="checkmark-circle" size={18} color={M.success} />
                  <Text style={styles.pointText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {phase === 'scanning' && (
          <Animated.View entering={FadeIn} style={styles.copy}>
            <Text style={styles.h}>{POSES[pose].label}</Text>
            <Text style={styles.p}>Hold still while we check…</Text>
          </Animated.View>
        )}

        {phase === 'done' && (
          <Animated.View entering={FadeInDown} style={styles.copy}>
            <Text style={styles.h}>You're verified</Text>
            <Text style={styles.p}>
              Your profile now carries the verified tick. You'll appear more in Discover and members will trust your profile more.
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {phase === 'intro' && <GButton label="Start verification" icon="camera" onPress={() => { H.press(); setPhase('scanning'); }} />}
        {phase === 'scanning' && <Text style={styles.scanning}>Verifying…</Text>}
        {phase === 'done' && <GButton label="Done" icon="checkmark" onPress={() => navigation.goBack()} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: M.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingBottom: 10 },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPE.h2 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xxl },
  ring: {
    width: width * 0.6, height: width * 0.6, borderRadius: width * 0.3, borderWidth: 4, borderColor: M.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: M.bgSoft, overflow: 'hidden',
  },
  scanLine: { position: 'absolute', left: 20, right: 20, height: 3, borderRadius: 2, backgroundColor: M.success },
  tick: { position: 'absolute', bottom: 26, right: 26, width: 44, height: 44, borderRadius: 22, backgroundColor: M.success, alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  copy: { alignItems: 'center', marginTop: 30 },
  h: { ...TYPE.h1, fontSize: 24, textAlign: 'center' },
  p: { ...TYPE.soft, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  points: { alignSelf: 'stretch', gap: 12, marginTop: 22 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointText: { ...TYPE.body, flex: 1, fontWeight: '600' },
  footer: { paddingHorizontal: SPACE.xl, paddingTop: 12 },
  scanning: { ...TYPE.body, color: M.textSoft, textAlign: 'center', fontWeight: '700', paddingVertical: 16 },
});
