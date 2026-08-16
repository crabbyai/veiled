import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, runOnJS, Easing,
} from 'react-native-reanimated';
import { M } from '../theme';

// A Rose, drawn line by line, for the swipe-up on the deck.
//
// Two variants, because the card underneath is two different things:
//   RoseGrow  — she's veiled, so the card is mostly empty beside her.
//               A rose draws itself into that space, stem first, and
//               fills with colour once the outline closes.
//   PetalFall — her photo is showing, and a whole flower drawn over a
//               face covers the very thing you swiped for. The head
//               draws small in the corner and scatters into petals.
//
// Every stroke is a real path revealed along its own length, so it
// reads as a hand drawing rather than a shape popping in. Both run off
// a single 0→1 clock, so `onDone` fires exactly once.

const RED = M.rose;
const GREEN = '#4E7C59';

// ── The artwork ─────────────────────────────────────────────────────
// Drawn at 140×330: a scalloped flower head over a leaning stem with
// two leaves. `LEN` is each path's measured length, which is what the
// dash offset animates over — a wrong number here makes a stroke
// appear part-drawn, so they are measured, not guessed.
const P = {
  stem: 'M66 322 C 69 268, 73 214, 70 136',
  leafL: 'M70 250 C 48 246, 32 230, 29 210 C 51 208, 66 224, 70 250 Z',
  leafLv: 'M69 248 C 57 239, 45 229, 33 216',
  leafR: 'M71 204 C 93 200, 107 184, 110 164 C 88 162, 73 178, 71 204 Z',
  leafRv: 'M72 202 C 84 193, 96 183, 106 170',
  // The petal silhouette, and the single unbroken spiral inside it —
  // one stroke wrapping from the outside in, which is what makes it a
  // rose and not a daisy.
  cup: 'M70 16 C 92 8, 116 22, 118 46 C 134 60, 130 88, 110 100 C 106 122, 82 132, 64 122 C 42 128, 22 112, 22 90 C 6 76, 10 50, 30 40 C 36 20, 54 10, 70 16 Z',
  furl: 'M92 92 C 74 104, 50 96, 44 78 C 38 58, 52 38, 74 36 C 92 35, 104 48, 102 64 C 100 79, 86 88, 74 84 C 63 80, 60 68, 66 60 C 71 53, 82 54, 84 62',
};
const LEN = { stem: 187, leafL: 126, leafLv: 49, leafR: 123, leafRv: 47, cup: 363, furl: 254 };

const PETAL = 'M13 1 C 5 4, 2 11, 5 16 C 8 20, 18 20, 21 16 C 24 11, 21 4, 13 1 Z';

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

// One stroke, revealed along its length between `from` and `to`.
function Stroke({ t, path, len, from, to, color, width = 3.2 }) {
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

const GROW_MS = 2000;

// The veiled variant: a rose draws itself up the empty side of the card.
export function RoseGrow({ style, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: GROW_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: 1 - seg(t.value, 0.88, 1) }));
  // A breath of movement once it's drawn, so it doesn't sit dead still.
  const swayStyle = useAnimatedStyle(() => {
    const s = seg(t.value, 0.6, 1);
    return { transform: [{ rotate: `${Math.sin(s * Math.PI * 2) * 1.6}deg` }] };
  });

  return (
    <Animated.View style={[styles.growWrap, style, fadeStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, swayStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 140 330" preserveAspectRatio="xMidYMax meet">
          {/* Colour arrives last, under the lines that were drawn first */}
          <Wash t={t} from={0.62} to={0.84}>
            <Path d={P.leafL} fill={GREEN} opacity={0.3} />
            <Path d={P.leafR} fill={GREEN} opacity={0.3} />
            <Path d={P.cup} fill={RED} opacity={0.22} />
          </Wash>
          <Stroke t={t} path={P.stem} len={LEN.stem} from={0} to={0.3} color={GREEN} />
          <Stroke t={t} path={P.leafR} len={LEN.leafR} from={0.18} to={0.34} color={GREEN} />
          <Stroke t={t} path={P.leafRv} len={LEN.leafRv} from={0.28} to={0.38} color={GREEN} width={2.4} />
          <Stroke t={t} path={P.leafL} len={LEN.leafL} from={0.24} to={0.4} color={GREEN} />
          <Stroke t={t} path={P.leafLv} len={LEN.leafLv} from={0.34} to={0.44} color={GREEN} width={2.4} />
          <Stroke t={t} path={P.cup} len={LEN.cup} from={0.34} to={0.6} color={RED} />
          <Stroke t={t} path={P.furl} len={LEN.furl} from={0.54} to={0.82} color={RED} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

// ── Petal fall ──────────────────────────────────────────────────────
const FALL_MS = 2000;
const PETAL_COUNT = 16;

// Every petal leaves the flower head and fans out on its way down, so
// the fall reads as the rose coming apart rather than weather.
function FallingPetal({ t, i, w, h }) {
  const r = useMemo(() => {
    const fromX = w - 68;      // where the drawn head sits
    const fromY = h * 0.1;
    return {
      fromX, fromY,
      toX: 8 + noise(i, 1) * (w - 48),
      delay: 0.26 + noise(i, 2) * 0.28,
      dur: 0.4 + noise(i, 4) * 0.28,
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
    return {
      opacity: fade,
      transform: [
        { translateX: r.fromX + (r.toX - r.fromX) * spread + Math.sin(p * Math.PI * r.waves + r.phase) * r.sway },
        { translateY: r.fromY + p * (h - r.fromY + 70) },
        { rotate: `${r.rot0 + p * r.spin}deg` },
        { scale: r.scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.petal, style]}>
      <Svg width={32} height={25} viewBox="0 0 26 20">
        <Path d={PETAL} fill={RED} opacity={0.34} />
        <Path d={PETAL} fill="none" stroke={RED} strokeWidth={1.9} strokeLinejoin="round" />
        <Path d="M13 3 C 10 8, 9.5 13, 10.5 18" fill="none" stroke={RED} strokeWidth={1.2} opacity={0.6} />
        <Path d="M13 3 C 16 8, 16.5 13, 15.5 18" fill="none" stroke={RED} strokeWidth={1.2} opacity={0.6} />
      </Svg>
    </Animated.View>
  );
}

// The photo variant: the head draws in the corner, then comes apart.
export function PetalFall({ style, width: w = 320, height: h = 560, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: FALL_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  // It draws, holds for a beat, then lets go and lifts away as the
  // petals it shed drift down past her.
  const headStyle = useAnimatedStyle(() => {
    const go = seg(t.value, 0.36, 0.62);
    return {
      opacity: 1 - go,
      transform: [{ scale: 1 + go * 0.5 }, { translateY: -go * 26 }, { rotate: `${go * 14}deg` }],
    };
  });

  return (
    <View style={[styles.fallWrap, style]} pointerEvents="none">
      {/* The head only — a whole stem drawn across her face is exactly
          what this variant exists to avoid. */}
      <Animated.View style={[styles.head, headStyle]}>
        <Svg width={104} height={104} viewBox="0 0 140 140">
          <Wash t={t} from={0.24} to={0.4}>
            <Path d={P.cup} fill={RED} opacity={0.22} />
          </Wash>
          <Stroke t={t} path={P.cup} len={LEN.cup} from={0} to={0.22} color={RED} />
          <Stroke t={t} path={P.furl} len={LEN.furl} from={0.16} to={0.42} color={RED} />
        </Svg>
      </Animated.View>
      {[...Array(PETAL_COUNT)].map((_, i) => <FallingPetal key={i} t={t} i={i} w={w} h={h} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  growWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  fallWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  head: { position: 'absolute', top: '8%', right: 16 },
  petal: { position: 'absolute', top: 0, left: 0 },
});

export default RoseGrow;
