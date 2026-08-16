import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, runOnJS, Easing,
} from 'react-native-reanimated';
import { M } from '../theme';

// The Rose: one bud on a curved stem with two small leaves, drawn in a
// heavy even line with a soft fill — the shape a rose takes when it's an
// icon rather than a botanical study.
//
// It is used two ways on the deck, because the card underneath is two
// different things:
//   RoseGrow  — she's veiled, so the card is mostly empty beside her.
//               The rose draws itself into that space, stem first, and
//               fills with colour once the outline closes.
//   PetalFall — her photo is showing, and a whole flower drawn over a
//               face covers the very thing you swiped for. The bud
//               draws small in the corner and comes apart into petals.
//
// Every line is a real path revealed along its own measured length, so
// it reads as a hand drawing rather than a shape popping in. Both run
// off a single 0→1 clock, so `onDone` fires exactly once.

// The drawn line and the colour inside it. Over a photo the line has to
// be the light one — a dark outline on a dark card disappears — so both
// are props and the deck passes its own pair.
export const INK = '#171114';
export const BLUSH = '#F6D9C8';

// ── The artwork ─────────────────────────────────────────────────────
// Drawn at 100×200. `LEN` is each path's measured length, which is what
// the dash offset animates over: a wrong number here leaves a line
// looking half-drawn, so they are measured, not guessed.
const P = {
  // Bottom-up, so the stem draws the way a stem grows.
  stem: 'M48 191 C 46 152, 53 126, 50 99',
  leafL: 'M49 133 C 39 133, 32 127, 31 118 C 41 116, 48 123, 49 133',
  leafR: 'M47 162 C 57 162, 64 156, 65 147 C 55 145, 48 152, 47 162',
  bud: 'M20 54 C 16 34, 30 22, 41 35 C 44 25, 56 25, 59 35 C 70 22, 84 34, 80 54 C 80 82, 66 99, 50 99 C 34 99, 20 82, 20 54 Z',
  fold: 'M41 35 C 44 47, 56 47, 59 35',
};
const LEN = { stem: 93, leafL: 53, leafR: 53, bud: 229, fold: 28 };

// A single petal, in the same heavy line, for the fall.
const PETAL = 'M13 2 C 5 5, 3 12, 6 16 C 9 20, 17 20, 20 16 C 23 12, 21 5, 13 2 Z';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

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
// Slow at both ends — how a hand actually moves along a stroke.
function easeInOut(p) {
  'worklet';
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

// Deterministic noise, so a petal's path is stable across re-renders.
const noise = (i, salt) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// One line, revealed along its length between `from` and `to`.
function Stroke({ t, path, len, from, to, color, width }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - easeInOut(seg(t.value, from, to))),
  }));
  return (
    <AnimatedPath
      d={path}
      stroke={color}
      strokeWidth={width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={len}
      animatedProps={animatedProps}
    />
  );
}

// The colour, washed in behind the outline once it has closed.
function Wash({ t, from, to, children }) {
  const animatedProps = useAnimatedProps(() => ({ opacity: seg(t.value, from, to) }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

const GROW_MS = 1900;
const W = 6;   // the line weight, in artwork units

// The veiled variant: a rose draws itself up the empty side of the card.
export function RoseGrow({ style, ink = INK, fill = BLUSH, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: GROW_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  // It lifts a little as it goes, rather than switching off.
  const fadeStyle = useAnimatedStyle(() => {
    const out = seg(t.value, 0.86, 1);
    return { opacity: 1 - out, transform: [{ translateY: -out * 20 }] };
  });
  // A wobble that decays, the way a stem settles after it's let go —
  // a sine that keeps the same amplitude reads as a loop, not a breath.
  const swayStyle = useAnimatedStyle(() => {
    const s = seg(t.value, 0.5, 1);
    const settle = (1 - s) * (1 - s);
    return {
      transform: [
        { scale: 0.985 + 0.015 * easeOut(seg(t.value, 0.55, 0.82)) },
        { rotate: `${Math.sin(s * Math.PI * 3) * 2.6 * settle}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.growWrap, style, fadeStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, swayStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="xMidYMax meet">
          {/* Colour arrives last, under the line that was drawn first */}
          <Wash t={t} from={0.66} to={0.86}>
            <Path d={P.bud} fill={fill} />
          </Wash>
          <Stroke t={t} path={P.stem} len={LEN.stem} from={0} to={0.3} color={ink} width={W} />
          <Stroke t={t} path={P.leafL} len={LEN.leafL} from={0.22} to={0.38} color={ink} width={W} />
          <Stroke t={t} path={P.leafR} len={LEN.leafR} from={0.3} to={0.46} color={ink} width={W} />
          <Stroke t={t} path={P.bud} len={LEN.bud} from={0.42} to={0.76} color={ink} width={W} />
          <Stroke t={t} path={P.fold} len={LEN.fold} from={0.74} to={0.86} color={ink} width={W} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

// ── Petal fall ──────────────────────────────────────────────────────
const FALL_MS = 1900;
const PETAL_COUNT = 15;

// Every petal leaves the bud and fans out on its way down, so the fall
// reads as the rose coming apart rather than as weather.
function FallingPetal({ t, i, w, h, ink, fill }) {
  const r = useMemo(() => {
    const fromX = w - 74;      // where the drawn bud sits
    const fromY = h * 0.1;
    return {
      fromX, fromY,
      toX: 8 + noise(i, 1) * (w - 48),
      delay: 0.3 + noise(i, 2) * 0.26,
      dur: 0.38 + noise(i, 4) * 0.26,
      sway: 12 + noise(i, 5) * 26,
      waves: 1.4 + noise(i, 6) * 2.2,
      phase: noise(i, 8) * Math.PI * 2,
      spin: (noise(i, 9) < 0.5 ? -1 : 1) * (140 + noise(i, 10) * 260),
      rot0: noise(i, 12) * 360,
      scale: 0.66 + noise(i, 14) * 0.7,
    };
  }, [i, w, h]);

  const style = useAnimatedStyle(() => {
    const p = seg(t.value, r.delay, r.delay + r.dur);
    if (p <= 0 || p >= 1) return { opacity: 0 };
    const fade = p < 0.14 ? p / 0.14 : p > 0.82 ? (1 - p) / 0.18 : 1;
    // Drift sideways early, then fall away — a petal loses its sideways
    // momentum before it loses its height.
    const spread = easeOut(p);
    // Petals tumble: they turn edge-on and back as they fall, which is
    // what stops fifteen of them looking like one sprite repeated.
    const edge = 0.45 + 0.55 * Math.abs(Math.cos(p * Math.PI * r.waves * 1.6 + r.phase));
    return {
      opacity: fade,
      transform: [
        { translateX: r.fromX + (r.toX - r.fromX) * spread + Math.sin(p * Math.PI * r.waves + r.phase) * r.sway },
        { translateY: r.fromY + p * (h - r.fromY + 70) },
        { rotate: `${r.rot0 + p * r.spin}deg` },
        { scale: r.scale },
        { scaleX: edge },
      ],
    };
  });

  return (
    <Animated.View style={[styles.petal, style]}>
      <Svg width={30} height={26} viewBox="0 0 26 22">
        <Path d={PETAL} fill={fill} />
        <Path d={PETAL} fill="none" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

// The photo variant: the bud draws in the corner, then comes apart.
export function PetalFall({ style, width: w = 320, height: h = 560, ink = INK, fill = BLUSH, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: FALL_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  // It draws, holds for a beat, then lets go and lifts away as the
  // petals it shed drift down past her.
  const budStyle = useAnimatedStyle(() => {
    const go = seg(t.value, 0.4, 0.66);
    return {
      opacity: 1 - go,
      transform: [{ scale: 1 + go * 0.5 }, { translateY: -go * 26 }, { rotate: `${go * 14}deg` }],
    };
  });

  return (
    <View style={[styles.fallWrap, style]} pointerEvents="none">
      {/* The bud only — a whole stem drawn across her face is exactly
          what this variant exists to avoid. */}
      <Animated.View style={[styles.bud, budStyle]}>
        <Svg width={86} height={86} viewBox="8 14 84 93">
          <Wash t={t} from={0.28} to={0.44}>
            <Path d={P.bud} fill={fill} />
          </Wash>
          <Stroke t={t} path={P.bud} len={LEN.bud} from={0} to={0.28} color={ink} width={W} />
          <Stroke t={t} path={P.fold} len={LEN.fold} from={0.26} to={0.4} color={ink} width={W} />
        </Svg>
      </Animated.View>
      {[...Array(PETAL_COUNT)].map((_, i) => (
        <FallingPetal key={i} t={t} i={i} w={w} h={h} ink={ink} fill={fill} />
      ))}
    </View>
  );
}

// The same rose, standing still — for panels and sheets.
export function RoseMark({ size = 96, ink = INK, fill = BLUSH, style }) {
  return (
    <View style={[{ width: size / 2, height: size }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 200">
        <Path d={P.bud} fill={fill} />
        <G fill="none" stroke={ink} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round">
          <Path d={P.stem} />
          <Path d={P.leafL} />
          <Path d={P.leafR} />
          <Path d={P.bud} />
          <Path d={P.fold} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  growWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  fallWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  bud: { position: 'absolute', top: '8%', right: 16 },
  petal: { position: 'absolute', top: 0, left: 0 },
});

export default RoseGrow;
