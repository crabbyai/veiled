import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withRepeat, runOnJS, Easing,
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
  thorn: 'M51 148 C 56 146, 59 142, 60 138',
  leafL: 'M49 133 C 39 133, 32 127, 31 118 C 41 116, 48 123, 49 133',
  veinL: 'M48 131 C 42 129, 37 125, 34 121',
  leafR: 'M47 162 C 57 162, 64 156, 65 147 C 55 145, 48 152, 47 162',
  veinR: 'M48 160 C 54 158, 59 154, 62 150',
  // Sepals, curling away from the base of the bud.
  sepalL: 'M38 96 C 30 101, 24 110, 22 119 C 31 116, 38 107, 41 98',
  sepalR: 'M62 96 C 70 101, 76 110, 78 119 C 69 116, 62 107, 59 98',
  bud: 'M20 54 C 16 34, 30 22, 41 35 C 44 25, 56 25, 59 35 C 70 22, 84 34, 80 54 C 80 82, 66 99, 50 99 C 34 99, 20 82, 20 54 Z',
  fold: 'M41 35 C 44 47, 56 47, 59 35',
};
const LEN = {
  stem: 93, thorn: 14, leafL: 53, veinL: 18, leafR: 53, veinR: 18,
  sepalL: 59, sepalR: 59, bud: 229, fold: 28,
};

// When each line is drawn, as a fraction of the whole. Kept together so
// the choreography can be read at a glance rather than hunted for.
const CUE = {
  stem: [0, 0.24],
  thorn: [0.2, 0.27],
  leafL: [0.2, 0.34], veinL: [0.3, 0.38],
  leafR: [0.27, 0.41], veinR: [0.37, 0.45],
  sepalL: [0.4, 0.51], sepalR: [0.44, 0.55],
  bud: [0.5, 0.78], fold: [0.76, 0.85],
  wash: [0.7, 0.92],
};

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

const GROW_MS = 2200;
const W = 6;    // the line weight, in artwork units
const VB_W = 100, VB_H = 200;

// A sparkle that pops once near the finished bud.
function Spark({ t, i, at }) {
  const r = useMemo(() => ({
    x: (noise(i, 21) - 0.5) * 78,
    y: (noise(i, 23) - 0.5) * 64,
    size: 3 + noise(i, 25) * 4,
    delay: at + noise(i, 27) * 0.1,
  }), [i, at]);
  const style = useAnimatedStyle(() => {
    const p = seg(t.value, r.delay, r.delay + 0.16);
    if (p <= 0 || p >= 1) return { opacity: 0 };
    const s = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
    return { opacity: s, transform: [{ translateX: r.x }, { translateY: r.y }, { scale: 0.5 + s }] };
  });
  return <Animated.View style={[styles.spark, { width: r.size, height: r.size, borderRadius: r.size / 2 }, style]} />;
}

// The veiled variant: a rose draws itself up the empty side of the card.
export function RoseGrow({ style, ink = INK, fill = BLUSH, onDone }) {
  const t = useSharedValue(0);
  // Measured, because the colour is revealed by a view that grows from
  // the bottom — that needs real pixels, and it is the one way to pour
  // the fill in upward that does not depend on animating a clip path.
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    t.value = withTiming(1, { duration: GROW_MS, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, []);

  // It lifts a little as it goes, rather than switching off.
  const fadeStyle = useAnimatedStyle(() => {
    const out = seg(t.value, 0.9, 1);
    return { opacity: 1 - out, transform: [{ translateY: -out * 20 }] };
  });
  // A wobble that decays, the way a stem settles after it's let go —
  // a sine that keeps the same amplitude reads as a loop, not a breath.
  const swayStyle = useAnimatedStyle(() => {
    const s = seg(t.value, 0.52, 1);
    const settle = (1 - s) * (1 - s);
    return {
      transform: [
        { scale: 0.985 + 0.015 * easeOut(seg(t.value, 0.58, 0.86)) },
        { rotate: `${Math.sin(s * Math.PI * 3) * 2.6 * settle}deg` },
      ],
    };
  });
  // The colour rises from the base of the drawing to the top of the bud.
  const washStyle = useAnimatedStyle(() => ({
    height: box.h * easeOut(seg(t.value, CUE.wash[0], CUE.wash[1])),
  }));

  // The drawing sits at the bottom of its box at the artwork's aspect,
  // which is how the fill layer is lined up with the outline exactly.
  const artW = Math.min(box.w, box.h * (VB_W / VB_H));
  const artH = artW * (VB_H / VB_W);

  return (
    <Animated.View
      style={[styles.growWrap, style, fadeStyle]}
      pointerEvents="none"
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, swayStyle]}>
        {/* The colour, poured in from the base once the outline closes */}
        {box.h > 0 ? (
          <Animated.View style={[styles.wash, washStyle]}>
            <Svg width={artW} height={artH} viewBox="0 0 100 200" style={{ position: 'absolute', bottom: 0 }}>
              <Path d={P.bud} fill={fill} />
            </Svg>
          </Animated.View>
        ) : null}

        <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="xMidYMax meet">
          <Stroke t={t} path={P.stem} len={LEN.stem} from={CUE.stem[0]} to={CUE.stem[1]} color={ink} width={W} />
          <Stroke t={t} path={P.thorn} len={LEN.thorn} from={CUE.thorn[0]} to={CUE.thorn[1]} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.leafL} len={LEN.leafL} from={CUE.leafL[0]} to={CUE.leafL[1]} color={ink} width={W} />
          <Stroke t={t} path={P.veinL} len={LEN.veinL} from={CUE.veinL[0]} to={CUE.veinL[1]} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.leafR} len={LEN.leafR} from={CUE.leafR[0]} to={CUE.leafR[1]} color={ink} width={W} />
          <Stroke t={t} path={P.veinR} len={LEN.veinR} from={CUE.veinR[0]} to={CUE.veinR[1]} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.sepalL} len={LEN.sepalL} from={CUE.sepalL[0]} to={CUE.sepalL[1]} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.sepalR} len={LEN.sepalR} from={CUE.sepalR[0]} to={CUE.sepalR[1]} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.bud} len={LEN.bud} from={CUE.bud[0]} to={CUE.bud[1]} color={ink} width={W} />
          <Stroke t={t} path={P.fold} len={LEN.fold} from={CUE.fold[0]} to={CUE.fold[1]} color={ink} width={W} />
        </Svg>

        {/* A last breath of life around the finished bud */}
        <View style={styles.sparks} pointerEvents="none">
          {[0, 1, 2, 3, 4].map((i) => <Spark key={i} t={t} i={i} at={0.84} />)}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ── Petal fall ──────────────────────────────────────────────────────
const FALL_MS = 1900;
const PETAL_COUNT = 15;

// Every petal leaves the bud and fans out on its way down, so the fall
// reads as the rose coming apart rather than as weather.
function FallingPetal({ t, i, w, h, ink, fill, from = 'bud', loop = false }) {
  const r = useMemo(() => {
    // Shed from the bud in the corner, or drift in from off the top.
    const fromX = from === 'top' ? 8 + noise(i, 31) * (w - 48) : w - 74;
    const fromY = from === 'top' ? -60 : h * 0.1;
    return {
      fromX, fromY,
      toX: 8 + noise(i, 1) * (w - 48),
      delay: from === 'top' ? noise(i, 2) : 0.3 + noise(i, 2) * 0.26,
      dur: from === 'top' ? 0.55 + noise(i, 4) * 0.42 : 0.38 + noise(i, 4) * 0.26,
      sway: 12 + noise(i, 5) * 26,
      waves: 1.4 + noise(i, 6) * 2.2,
      phase: noise(i, 8) * Math.PI * 2,
      spin: (noise(i, 9) < 0.5 ? -1 : 1) * (140 + noise(i, 10) * 260),
      rot0: noise(i, 12) * 360,
      scale: 0.66 + noise(i, 14) * 0.7,
    };
  }, [i, w, h, from]);

  const style = useAnimatedStyle(() => {
    // A looping rain wraps, so a petal whose turn has passed comes back
    // round on the next pass of the clock. A one-shot fall must not:
    // wrapping there would start petals mid-air before they've been shed.
    const raw = t.value - r.delay;
    const p = seg(loop && raw < 0 ? raw + 1 : raw, 0, r.dur);
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
        <Svg width={96} height={104} viewBox="14 14 76 112">
          <Wash t={t} from={0.28} to={0.44}>
            <Path d={P.bud} fill={fill} />
          </Wash>
          <Stroke t={t} path={P.sepalL} len={LEN.sepalL} from={0} to={0.12} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.sepalR} len={LEN.sepalR} from={0.04} to={0.16} color={ink} width={W * 0.7} />
          <Stroke t={t} path={P.bud} len={LEN.bud} from={0.08} to={0.3} color={ink} width={W} />
          <Stroke t={t} path={P.fold} len={LEN.fold} from={0.28} to={0.4} color={ink} width={W} />
        </Svg>
      </Animated.View>
      {[...Array(PETAL_COUNT)].map((_, i) => (
        <FallingPetal key={i} t={t} i={i} w={w} h={h} ink={ink} fill={fill} />
      ))}
    </View>
  );
}

// Petals falling and falling — for a moment worth marking, like a
// match. No bud and no end: it is scenery, not a beat in a sequence.
export function PetalRain({ width: w = 380, height: h = 800, count = 18, ink = INK, fill = BLUSH, style }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false);
  }, []);
  return (
    <View style={[styles.fallWrap, style]} pointerEvents="none">
      {[...Array(count)].map((_, i) => (
        <FallingPetal key={i} t={t} i={i} w={w} h={h} ink={ink} fill={fill} from="top" loop />
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
        <G fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
          <G strokeWidth={W}>
            <Path d={P.stem} />
            <Path d={P.leafL} />
            <Path d={P.leafR} />
            <Path d={P.bud} />
            <Path d={P.fold} />
          </G>
          <G strokeWidth={W * 0.7}>
            <Path d={P.thorn} />
            <Path d={P.veinL} />
            <Path d={P.veinR} />
            <Path d={P.sepalL} />
            <Path d={P.sepalR} />
          </G>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  growWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  // Anchored to the bottom and clipping: growing its height pours the
  // colour up through the drawing.
  wash: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', alignItems: 'center' },
  sparks: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '18%' },
  spark: { position: 'absolute', backgroundColor: 'rgba(255,240,232,0.95)' },
  fallWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  bud: { position: 'absolute', top: '8%', right: 16 },
  petal: { position: 'absolute', top: 0, left: 0 },
});

export default RoseGrow;
