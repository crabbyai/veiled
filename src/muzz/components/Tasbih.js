import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { M, isDark } from '../theme';
import { SPRING } from '../motion';

// ─── The tasbih ─────────────────────────────────────────────────────
// A strand of thirty-three beads on a cord, an imame at the head of it,
// and a tassel. Counting turns the strand through your thumb: it rotates
// by exactly one bead each time, the beads you've passed are the dark
// ones, and the imame comes back round every thirty-three — which is how
// you feel a round end without reading a number.

const BEADS = 33;
const STEP = 360 / BEADS;

// Beads catch light at the top left. Two tones: passed and to come.
const ON_HI = isDark ? '#F5F5F6' : '#5B5B5F';
const ON_LO = isDark ? '#9A9AA0' : '#111111';
const OFF_HI = isDark ? '#3A3A3C' : '#FFFFFF';
const OFF_LO = isDark ? '#232325' : '#E2E2E4';
const CORD = isDark ? '#3A3A3C' : '#D8D8DC';

export default function Tasbih({ count = 0, size = 286, children }) {
  const cx = size / 2;
  const R = size / 2 - 26;          // the cord's radius
  const bead = size * 0.038;        // ordinary bead
  const imame = bead * 1.5;         // the head of the strand

  // One continuous angle rather than count % 33, so the wrap from the
  // last bead to the first turns onward instead of unwinding the whole
  // strand backwards.
  const rot = useSharedValue(0);
  const swing = useSharedValue(0);
  const turn = useSharedValue(0);
  useEffect(() => {
    const target = -count * STEP;
    // A reset (or a big jump) snaps; a single bead springs.
    if (Math.abs(target - rot.value) > 360) rot.value = target;
    else rot.value = withSpring(target, { damping: 13, stiffness: 220, mass: 0.6 });
    swing.value = withSequence(
      withTiming(count % 2 ? 1 : -1, { duration: 90 }),
      withSpring(0, { damping: 6, stiffness: 90, mass: 0.7 })
    );
    // The strand has come all the way round — mark it.
    if (count > 0 && count % BEADS === 0) {
      turn.value = withSequence(
        withTiming(1, { duration: 130 }),
        withSpring(0, { damping: 11, stiffness: 130 })
      );
    }
  }, [count]);

  const strandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }, { scale: 1 + turn.value * 0.045 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: turn.value * 0.5, transform: [{ scale: 0.9 + turn.value * 0.25 }] }));
  // The tassel hangs, so it pivots from where it is tied on.
  const tasselStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 34 }, { rotate: `${swing.value * 7}deg` }, { translateY: -34 }],
  }));

  const passed = count % BEADS;
  const positions = useMemo(
    () => [...Array(BEADS)].map((_, i) => {
      const a = (i / BEADS) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * R, y: cx + Math.sin(a) * R, deg: (i * STEP) };
    }),
    [cx, R]
  );

  return (
    <View style={{ width: size, height: size }}>
      {/* A ring of light when the strand completes a turn */}
      <Animated.View style={[styles.halo, { borderRadius: size / 2 }, haloStyle]} pointerEvents="none" />

      {/* The strand — this is the part that turns */}
      <Animated.View style={[StyleSheet.absoluteFill, strandStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="on" cx="35%" cy="28%" r="72%">
              <Stop offset="0" stopColor={ON_HI} />
              <Stop offset="1" stopColor={ON_LO} />
            </RadialGradient>
            <RadialGradient id="off" cx="35%" cy="28%" r="72%">
              <Stop offset="0" stopColor={OFF_HI} />
              <Stop offset="1" stopColor={OFF_LO} />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cx} r={R} fill="none" stroke={CORD} strokeWidth={1.5} />
          {positions.map((p, i) => (
            i === 0 ? (
              // The imame: longer, and always dark, so the head of the
              // strand is findable as it comes round.
              <G key={i}>
                <Circle cx={p.x} cy={p.y - imame * 0.42} r={imame * 0.72} fill="url(#on)" />
                <Circle cx={p.x} cy={p.y + imame * 0.42} r={imame * 0.72} fill="url(#on)" />
              </G>
            ) : (
              <Circle key={i} cx={p.x} cy={p.y} r={bead} fill={i <= passed && passed > 0 ? 'url(#on)' : 'url(#off)'} />
            )
          ))}
        </Svg>
      </Animated.View>

      {/* The tassel, tied below and left to hang */}
      <Animated.View style={[styles.tassel, { top: size - 14, left: cx - 20 }, tasselStyle]} pointerEvents="none">
        <Svg width={40} height={68} viewBox="0 0 40 68">
          <Path d="M20 0 L20 14" stroke={CORD} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx="20" cy="19" r="5.5" fill={ON_LO} />
          <Path
            d="M20 25 C 12 34, 10 48, 12 62 M20 25 C 17 36, 16 50, 17 64 M20 25 C 23 36, 24 50, 23 64 M20 25 C 28 34, 30 48, 28 62"
            stroke={ON_LO} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.8}
          />
        </Svg>
      </Animated.View>

      {/* Where your thumb sits. It has to clear the topmost bead — the
          imame passes under here every thirty-three, and a marker
          hidden behind it is no marker at all. */}
      <View style={[styles.marker, { left: cx - 8, top: 0 }]} pointerEvents="none">
        <Svg width={16} height={11} viewBox="0 0 16 11">
          <Path d="M8 10 L1.5 1 L14.5 1 Z" fill={M.primary} />
        </Svg>
      </View>

      {/* Whatever the caller puts in the middle */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.centre}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderColor: M.primary },
  tassel: { position: 'absolute' },
  marker: { position: 'absolute' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
