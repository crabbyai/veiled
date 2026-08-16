import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing,
  FadeInDown, FadeIn,
} from 'react-native-reanimated';
import * as H from './haptics';

// ─── Motion ─────────────────────────────────────────────────────────
// One vocabulary for how things move, so the app feels like one app.
// Screens import these rather than inventing a spring each time; when
// the feel is wrong it is wrong in one place.

// Springs. `soft` is the default for anything settling into position;
// `snap` is for controls that should feel immediate under a finger;
// `gentle` is for large things, where a fast spring reads as a twitch.
export const SPRING = { damping: 15, stiffness: 190, mass: 0.9 };
export const SNAP = { damping: 22, stiffness: 340, mass: 0.7 };
export const GENTLE = { damping: 18, stiffness: 110, mass: 1.1 };

// The house easing curve: leaves quickly, arrives slowly. Anything that
// travels a distance uses it.
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const TIMING = { duration: 280, easing: EASE };
export const QUICK = { duration: 170, easing: EASE };

// Entrances. A list staggers by index, but only for the first handful:
// past that the delay is longer than anyone waits, and rows that arrive
// late read as lag rather than choreography.
export const STAGGER_MS = 45;
export const STAGGER_CAP = 6;
export const enterRow = (i = 0) =>
  FadeInDown.springify().damping(17).stiffness(160).delay(Math.min(i, STAGGER_CAP) * STAGGER_MS);
export const enterSheet = () => FadeInDown.springify().damping(19).stiffness(180);
// A deliberate wait — something that should arrive after the thing it
// belongs to, rather than a row taking its turn in a list.
export const enterAfter = (ms) => FadeInDown.springify().damping(17).stiffness(160).delay(ms);
export const enterSoft = (delay = 0) => FadeIn.duration(240).delay(delay);

// ── Press feedback ──────────────────────────────────────────────────
// A spring rather than a style flag: `pressed && { scale: 0.96 }` snaps
// to the new value and back, which is what makes a tap feel cheap. This
// eases down under the finger and springs back on release.
export function usePressScale(to = 0.95, spring = SNAP) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const onPressIn = useCallback(() => { s.value = withSpring(to, spring); }, [to]);
  const onPressOut = useCallback(() => { s.value = withSpring(1, spring); }, []);
  return { style, onPressIn, onPressOut };
}

// A Pressable that springs. Drop-in for the ordinary one; `haptic` picks
// which feedback fires, or false for none.
export function Bounce({
  children, onPress, style, scale = 0.95, haptic = 'tap', disabled, hitSlop, ...rest
}) {
  const press = usePressScale(scale);
  return (
    <Pressable
      onPress={disabled ? undefined : () => {
        if (haptic && H[haptic]) H[haptic]();
        onPress && onPress();
      }}
      onPressIn={disabled ? undefined : press.onPressIn}
      onPressOut={disabled ? undefined : press.onPressOut}
      hitSlop={hitSlop}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[press.style, disabled && { opacity: 0.5 }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// A number that counts up to its new value instead of jumping. Used
// where a total changes under you and the jump would be missed.
export const countTo = (v) => withTiming(v, TIMING);

export default { SPRING, SNAP, GENTLE, EASE, TIMING, QUICK };
