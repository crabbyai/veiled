import React, { useEffect } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate,
} from 'react-native-reanimated';
import { NiqabiFigure } from './Figures';

const AView = Animated.View;

// ─── The Matchmaker mascot ──────────────────────────────────────────
// An elegant veiled niqabi figure (see Figures.js) with a gentle,
// serene idle motion. Kept under the original file/prop names so every
// call site (size, idle, colorA→colorB gradient) works unchanged.

// Static glyph for the tab bar / small marks: the drape + eye veil.
export function VeilGlyph({ size = 26, color = '#111' }) {
  const eye = (() => {
    let h = (color || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6) return '#F5F5F6';
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#1C1C20' : '#F2F2F4';
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 120">
      <Path
        d="M50 8 C 33 8 23 21 20 39 C 17 57 15 88 12 118 L 88 118 C 85 88 83 57 80 39 C 77 21 67 8 50 8 Z"
        fill={color}
      />
      <Rect x="30" y="38.5" width="40" height="13.5" rx="6.75" fill={eye} />
      <Path d="M35.5 45.2 Q40.5 41.4 45.5 45.2 Q40.5 48.8 35.5 45.2 Z" fill={color} />
      <Path d="M54.5 45.2 Q59.5 41.4 64.5 45.2 Q59.5 48.8 54.5 45.2 Z" fill={color} />
    </Svg>
  );
}

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
      { rotate: `${interpolate(bob.value, [0, 1], [-1.6, 1.6])}deg` },
    ],
  }));

  return (
    <AView style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, container]}>
      <NiqabiFigure width={size * 0.82} height={size} colorA={colorA} colorB={colorB} preserveAspectRatio="xMidYMid meet" />
    </AView>
  );
}
