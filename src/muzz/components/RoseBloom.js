import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { M } from '../theme';

// A Rose, drawn and animated, for the swipe-up on the deck.
//
// Two variants, because the card underneath is two different things:
//   RoseGrow  — she's veiled, so the card is mostly empty beside her.
//               A stem climbs up that empty space and opens into a rose
//               level with her face.
//   PetalFall — her photo is showing, and a plant drawn over a face
//               covers the very thing you swiped for. Petals drift down
//               across the card instead, leaving her visible.
//
// Both run off a single 0→1 clock so there is exactly one completion
// callback, and the caller can count on `onDone` firing once.

const ROSE_OUTER = M.roseDeep;
const ROSE_MID = M.rose;
const ROSE_CORE = '#B8324A';
const ROSE_HI = 'rgba(255,255,255,0.2)';
const STEM = '#4E7C59';
const STEM_DARK = '#385C41';

// Sub-progress: where `v` sits between `a` and `b`, clamped.
function seg(v, a, b) {
  'worklet';
  if (v <= a) return 0;
  if (v >= b) return 1;
  return (v - a) / (b - a);
}
function easeOut(p) {
  'worklet';
  return 1 - Math.pow(1 - p, 3);
}
// Overshoots past 1 and settles — the pop a bud makes when it opens.
function pop(p) {
  'worklet';
  const q = 1 - p;
  return 1 + 2.2 * q * q * q - 3.1 * q * q * q * q;
}

// Deterministic noise, so a petal's path is stable across re-renders.
const noise = (i, salt) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ── The flower head ─────────────────────────────────────────────────
// Drawn at 100×100 and scaled by the caller: two rings of cupped,
// notched petals under a furled bud. The furl is what makes it read as
// a rose rather than a daisy, so it is drawn large and light against
// the darker petals.
//
// `part` splits it so the rings and the bud can open on their own
// timings — 'all' for a static rose.
const OUTER_PETAL = 'M50 54 C 24 46, 18 18, 43 7 C 46 12, 54 12, 57 7 C 82 18, 76 46, 50 54 Z';
const INNER_PETAL = 'M50 52 C 33 46, 29 27, 50 19 C 71 27, 67 46, 50 52 Z';

function RoseHead({ size, part = 'all' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {part !== 'bud' && (
        <G>
          {[18, 90, 162, 234, 306].map((a) => (
            <Path key={`o${a}`} d={OUTER_PETAL} fill={ROSE_OUTER} transform={`rotate(${a} 50 50)`} />
          ))}
          {[54, 126, 198, 270, 342].map((a) => (
            <Path key={`i${a}`} d={INNER_PETAL} fill={ROSE_MID} transform={`rotate(${a} 50 50)`} />
          ))}
        </G>
      )}
      {part !== 'petals' && (
        <G>
          <Circle cx="50" cy="47" r="18" fill={ROSE_MID} />
          <Path d="M50 31 A16 16 0 1 1 35 52" stroke={ROSE_CORE} strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <Path d="M56 37 A10.5 10.5 0 1 1 43 51" stroke={ROSE_CORE} strokeWidth="3.6" fill="none" strokeLinecap="round" />
          <Path d="M52 43 A5 5 0 1 1 47 51" stroke={ROSE_CORE} strokeWidth="3" fill="none" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

function Leaf({ flip }) {
  return (
    <Svg width={38} height={22} viewBox="0 0 38 22" style={flip ? { transform: [{ scaleX: -1 }] } : null}>
      <Path d="M1 20 C 6 3, 26 -3, 37 3 C 29 19, 12 24, 1 20 Z" fill={STEM} />
      <Path d="M1 20 C 13 15, 27 9, 37 3" stroke={STEM_DARK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// A leaf that unfurls from the stem at `at` (0–1 up the stem).
function GrowingLeaf({ t, at, flip, start }) {
  const style = useAnimatedStyle(() => {
    const p = easeOut(seg(t.value, start, start + 0.16));
    const fade = 1 - seg(t.value, 0.84, 1);
    return {
      opacity: p * fade,
      transform: [
        { translateX: flip ? 14 * p : -14 * p },
        { rotate: `${(flip ? -1 : 1) * (34 - 34 * p)}deg` },
        { scale: 0.4 + 0.6 * p },
      ],
    };
  });
  return (
    <Animated.View style={[styles.leaf, { bottom: `${at * 100}%` }, flip ? styles.leafRight : styles.leafLeft, style]}>
      <Leaf flip={flip} />
    </Animated.View>
  );
}

// A mote of pollen lifting off the open flower.
function Mote({ t, i, start }) {
  const r = useMemo(() => ({
    x: (noise(i, 3) - 0.5) * 62,
    rise: 44 + noise(i, 7) * 46,
    size: 3 + noise(i, 11) * 3.5,
    delay: start + noise(i, 13) * 0.12,
  }), [i, start]);
  const style = useAnimatedStyle(() => {
    const p = seg(t.value, r.delay, r.delay + 0.34);
    return {
      opacity: p === 0 ? 0 : (p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75),
      transform: [{ translateX: r.x * p }, { translateY: -r.rise * easeOut(p) }, { scale: 0.6 + p * 0.6 }],
    };
  });
  return <Animated.View style={[styles.mote, { width: r.size, height: r.size, borderRadius: r.size / 2 }, style]} />;
}

const GROW_MS = 1750;
const STEM_H = 148;

// The veiled variant: a rose grows up the empty side of the card.
export function RoseGrow({ style, size = 84, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: GROW_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: 1 - seg(t.value, 0.84, 1) }));

  const swayStyle = useAnimatedStyle(() => {
    const s = seg(t.value, 0.42, 1);
    return { transform: [{ rotate: `${Math.sin(s * Math.PI * 2.2) * 2.4}deg` }] };
  });

  const stemStyle = useAnimatedStyle(() => {
    const g = easeOut(seg(t.value, 0, 0.36));
    return { transform: [{ translateY: (STEM_H / 2) * (1 - g) }, { scaleY: g }] };
  });

  const headStyle = useAnimatedStyle(() => {
    const p = seg(t.value, 0.3, 0.62);
    return { opacity: p === 0 ? 0 : 1, transform: [{ scale: p === 0 ? 0 : pop(p) }, { rotate: `${-24 + 24 * easeOut(p)}deg` }] };
  });

  const coreStyle = useAnimatedStyle(() => {
    const p = easeOut(seg(t.value, 0.46, 0.74));
    return { opacity: p, transform: [{ scale: 0.55 + 0.45 * p }] };
  });

  return (
    <Animated.View style={[styles.growWrap, style, fadeStyle]} pointerEvents="none">
      <Animated.View style={[styles.plant, swayStyle]}>
        <Animated.View style={[styles.stem, { height: STEM_H }, stemStyle]} />
        <GrowingLeaf t={t} at={0.28} start={0.2} flip={false} />
        <GrowingLeaf t={t} at={0.52} start={0.3} flip />
        <Animated.View style={[styles.head, { width: size, height: size, marginBottom: STEM_H - size * 0.42 }, headStyle]}>
          {/* The rings of petals open first, the furled bud after. */}
          <RoseHead size={size} part="petals" />
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, coreStyle]}>
            <RoseHead size={size} part="bud" />
          </Animated.View>
          <View style={styles.motes} pointerEvents="none">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <Mote key={i} t={t} i={i} start={0.5} />)}
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// ── Petal fall ──────────────────────────────────────────────────────
const FALL_MS = 1850;
const PETAL_COUNT = 16;

function FallingPetal({ t, i, w, h }) {
  const r = useMemo(() => ({
    x: 12 + noise(i, 1) * (w - 44),
    delay: noise(i, 2) * 0.34,
    dur: 0.44 + noise(i, 4) * 0.3,
    sway: 16 + noise(i, 5) * 30,
    waves: 1.4 + noise(i, 6) * 2.2,
    phase: noise(i, 8) * Math.PI * 2,
    spin: (noise(i, 9) < 0.5 ? -1 : 1) * (140 + noise(i, 10) * 260),
    rot0: noise(i, 12) * 360,
    scale: 0.62 + noise(i, 14) * 0.75,
    tone: noise(i, 15),
  }), [i, w, h]);

  const style = useAnimatedStyle(() => {
    const p = seg(t.value, r.delay, r.delay + r.dur);
    if (p <= 0 || p >= 1) return { opacity: 0 };
    const fade = p < 0.14 ? p / 0.14 : p > 0.82 ? (1 - p) / 0.18 : 1;
    return {
      opacity: fade,
      transform: [
        { translateX: r.x + Math.sin(p * Math.PI * r.waves + r.phase) * r.sway },
        { translateY: -50 + p * (h + 100) },
        { rotate: `${r.rot0 + p * r.spin}deg` },
        { scale: r.scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.petal, style]}>
      <Svg width={24} height={18} viewBox="0 0 24 18">
        <Path
          d="M12 0 C 4 3, 1 10, 4 15 C 7 19, 17 19, 20 15 C 23 10, 20 3, 12 0 Z"
          fill={r.tone > 0.55 ? ROSE_MID : r.tone > 0.25 ? ROSE_OUTER : ROSE_CORE}
        />
        <Path d="M12 1.5 C 9 6, 8 11, 9 17" stroke={ROSE_HI} strokeWidth="0.9" fill="none" />
        <Path d="M12 1.5 C 15 6, 16 11, 15 17" stroke={ROSE_HI} strokeWidth="0.9" fill="none" />
      </Svg>
    </Animated.View>
  );
}

// The photo variant: a rose flares at her shoulder and scatters.
export function PetalFall({ style, width: w = 320, height: h = 560, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: FALL_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  const burstStyle = useAnimatedStyle(() => {
    const p = seg(t.value, 0, 0.3);
    const out = seg(t.value, 0.24, 0.46);
    if (p === 0) return { opacity: 0 };
    return { opacity: (p < 0.5 ? p / 0.5 : 1) * (1 - out), transform: [{ scale: 0.3 + pop(p) * 0.85 }, { rotate: `${-30 + 30 * easeOut(p)}deg` }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    const p = seg(t.value, 0.04, 0.34);
    return { opacity: p * (1 - p) * 1.6, transform: [{ scale: 0.6 + p * 1.5 }] };
  });

  return (
    <View style={[styles.fallWrap, style]} pointerEvents="none">
      {/* The rose flares near the top corner, not over the middle: on
          this variant her photo is showing, and that is the one thing
          the animation must not cover. */}
      <Animated.View style={[styles.burst, styles.glow, glowStyle]} />
      <Animated.View style={[styles.burst, burstStyle]}>
        <RoseHead size={76} />
      </Animated.View>
      {[...Array(PETAL_COUNT)].map((_, i) => <FallingPetal key={i} t={t} i={i} w={w} h={h} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  growWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  plant: { alignItems: 'center', justifyContent: 'flex-end' },
  stem: { width: 5, borderRadius: 3, backgroundColor: STEM },
  leaf: { position: 'absolute' },
  leafLeft: { right: '50%', marginRight: 1 },
  leafRight: { left: '50%', marginLeft: 1 },
  head: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  motes: { ...StyleSheet.absoluteFillObject },
  mote: { position: 'absolute', top: '42%', left: '46%', backgroundColor: 'rgba(255,214,224,0.9)' },
  fallWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  burst: { position: 'absolute', top: '9%', right: 20, alignItems: 'center', justifyContent: 'center' },
  glow: { width: 150, height: 150, borderRadius: 75, marginTop: -38, marginRight: -38, backgroundColor: ROSE_MID },
  petal: { position: 'absolute', top: 0, left: 0 },
});

export default RoseGrow;
