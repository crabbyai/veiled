import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Ellipse, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  Easing, interpolate,
} from 'react-native-reanimated';

const AView = Animated.View;

// A flapping, gently-bobbing butterfly. `size` controls overall scale.
export default function Butterfly({ size = 120, idle = true, colorA = '#C084FC', colorB = '#F5325B' }) {
  const flap = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    flap.value = withRepeat(
      withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    if (idle) {
      bob.value = withRepeat(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        -1, true
      );
    }
  }, [idle]);

  const leftWing = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${interpolate(flap.value, [0, 1], [-8, 58])}deg` }],
  }));
  const rightWing = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${interpolate(flap.value, [0, 1], [8, -58])}deg` }],
  }));
  const container = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [0, -10]) },
      { rotate: `${interpolate(bob.value, [0, 1], [-3, 3])}deg` },
    ],
  }));

  const w = size;
  const wingW = w * 0.46;
  const wingH = w * 0.78;

  return (
    <AView style={[{ width: w, height: w, alignItems: 'center', justifyContent: 'center' }, container]}>
      {/* Left wing */}
      <AView style={[{ position: 'absolute', right: '50%' }, leftWing]}>
        <Wing width={wingW} height={wingH} colorA={colorA} colorB={colorB} flip />
      </AView>
      {/* Right wing */}
      <AView style={[{ position: 'absolute', left: '50%' }, rightWing]}>
        <Wing width={wingW} height={wingH} colorA={colorA} colorB={colorB} />
      </AView>
      {/* Body + antennae */}
      <Svg width={w * 0.16} height={w * 0.9} viewBox="0 0 20 110" style={{ position: 'absolute' }}>
        <Defs>
          <SvgGrad id="body" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3A2B5C" />
            <Stop offset="1" stopColor="#16121C" />
          </SvgGrad>
        </Defs>
        <Path d="M6 18 Q3 6 10 4 Q17 6 14 18" stroke="#6B5B95" strokeWidth="2" fill="none" />
        <Circle cx="6" cy="4" r="2.4" fill="#8B5CF6" />
        <Circle cx="14" cy="4" r="2.4" fill="#F5325B" />
        <Ellipse cx="10" cy="55" rx="6" ry="42" fill="url(#body)" />
        <Circle cx="10" cy="18" r="7" fill="#2A2140" />
      </Svg>
    </AView>
  );
}

function Wing({ width, height, colorA, colorB, flip }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 200" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Defs>
        <SvgGrad id={flip ? 'wgL' : 'wgR'} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colorA} />
          <Stop offset="1" stopColor={colorB} />
        </SvgGrad>
      </Defs>
      {/* Upper wing lobe */}
      <Path
        d="M6 96 C 0 30, 60 -8, 110 18 C 124 40, 110 78, 70 92 C 44 100, 18 100, 6 96 Z"
        fill={flip ? 'url(#wgL)' : 'url(#wgR)'} opacity="0.96"
      />
      {/* Lower wing lobe */}
      <Path
        d="M8 104 C 2 150, 40 198, 86 182 C 110 170, 100 128, 62 110 C 40 100, 18 100, 8 104 Z"
        fill={flip ? 'url(#wgL)' : 'url(#wgR)'} opacity="0.88"
      />
      {/* Spots */}
      <Circle cx="86" cy="46" r="11" fill="#FFFFFF" opacity="0.85" />
      <Circle cx="86" cy="46" r="5" fill="#16121C" opacity="0.55" />
      <Circle cx="64" cy="150" r="7" fill="#FFFFFF" opacity="0.7" />
    </Svg>
  );
}
