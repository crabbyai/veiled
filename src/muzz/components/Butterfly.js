import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate,
} from 'react-native-reanimated';

const AView = Animated.View;

// ─── The Matchmaker — a veiled niqabi silhouette ────────────────────
// Veiled's mascot: a serene, veiled figure with a niqab eye-slit. Kept
// under the original file/prop names so every call site (size, idle,
// colorA→colorB gradient) updates in place.

// The veil silhouette: head + shoulders draped as a khimar/niqab bell.
export const VEIL_PATH =
  'M14 116 C 12 84 13 58 22 42 C 28 25 38 17 50 17 C 62 17 72 25 78 42 '
  + 'C 87 58 88 84 86 116 Z';

// Choose an eye-slit colour that contrasts with the veil fill.
function eyeColorFor(hex) {
  if (typeof hex !== 'string') return '#F5F5F6';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return '#F5F5F6';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? '#1C1C20' : '#F2F2F4';
}

// Static glyph — used for tab bar / small marks.
export function VeilGlyph({ size = 26, color = '#111' }) {
  const eye = eyeColorFor(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 118">
      <Path d={VEIL_PATH} fill={color} />
      <Path d="M35 49 Q50 43 65 49 Q50 55 35 49 Z" fill={eye} opacity={0.95} />
    </Svg>
  );
}

// Animated mascot — a gentle, calm bob + sway.
export default function Butterfly({ size = 120, idle = true, colorA = '#2A2A2E', colorB = '#0E0E10' }) {
  const bob = useSharedValue(0);

  useEffect(() => {
    if (idle) {
      bob.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        -1, true
      );
    }
  }, [idle]);

  const container = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [0, -8]) },
      { rotate: `${interpolate(bob.value, [0, 1], [-2, 2])}deg` },
    ],
  }));

  const eye = eyeColorFor(colorA);
  const w = size;

  return (
    <AView style={[{ width: w, height: w, alignItems: 'center', justifyContent: 'center' }, container]}>
      <Svg width={w * 0.82} height={w} viewBox="0 0 100 118">
        <Defs>
          <SvgGrad id="veilFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colorA} />
            <Stop offset="1" stopColor={colorB} />
          </SvgGrad>
        </Defs>
        {/* Veil */}
        <Path d={VEIL_PATH} fill="url(#veilFill)" />
        {/* Soft inner drape fold for depth */}
        <Path
          d="M50 24 C 40 24 33 33 30 46 C 27 62 27 86 29 112"
          stroke={eye} strokeOpacity={0.12} strokeWidth={2} fill="none"
        />
        <Path
          d="M50 24 C 60 24 67 33 70 46 C 73 62 73 86 71 112"
          stroke={eye} strokeOpacity={0.12} strokeWidth={2} fill="none"
        />
        {/* Niqab eye-slit */}
        <Path d="M34 50 Q50 43 66 50 Q50 57 34 50 Z" fill={eye} opacity={0.95} />
        <Ellipse cx="44" cy="50" rx="2.1" ry="2.4" fill={colorB} opacity={0.55} />
        <Ellipse cx="56" cy="50" rx="2.1" ry="2.4" fill={colorB} opacity={0.55} />
      </Svg>
    </AView>
  );
}
