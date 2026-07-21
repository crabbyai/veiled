import React from 'react';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Ellipse, Circle } from 'react-native-svg';

// ─── Veiled figures ─────────────────────────────────────────────────
// Elegant, modest illustrated figures used across the app:
//  · NiqabiFigure — black niqab with a beaded arch trim and a warm eye
//    veil opening: expressive brown almond eyes, full lashes, defined
//    brows, soft nose-bridge shading. The app mascot and niqabi art.
//  · HijabiFigure — gracefully wrapped hijab framing a serene face
//    (closed lashes, soft smile). Used on hijabi profile cards.
// Both are drawn in a 100 x 120 viewBox and scale crisply anywhere.

let _gid = 0;

// Flowing outer drape shared by both figures: soft crown, gentle
// shoulder flare, floor-length hem.
const DRAPE =
  'M50 8 C 33 8 23 21 20 39 C 17 57 15 88 12 118 L 88 118 '
  + 'C 85 88 83 57 80 39 C 77 21 67 8 50 8 Z';

// Inner face-dome of the niqab (the arch the beaded trim follows).
const ARCH =
  'M31 72 L31 40 C 31 23.5 39 15.5 50 15.5 C 61 15.5 69 23.5 69 40 '
  + 'L69 72 Q 50 78 31 72 Z';

export function NiqabiFigure({
  width = '100%', height = '100%',
  colorA = '#2A2A2E', colorB = '#0E0E10',
  face = '#E9BD92', line = 'rgba(255,255,255,0.16)',
  preserveAspectRatio = 'xMidYMax meet',
}) {
  const id = React.useMemo(() => `nq${_gid++}`, []);
  const brow = '#3A2415';
  const lash = '#14100C';
  return (
    <Svg width={width} height={height} viewBox="0 0 100 120" preserveAspectRatio={preserveAspectRatio}>
      <Defs>
        <SvgGrad id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colorA} />
          <Stop offset="1" stopColor={colorB} />
        </SvgGrad>
      </Defs>
      {/* Outer drape */}
      <Path d={DRAPE} fill={`url(#${id})`} />
      {/* Inner face dome, slightly deeper tone */}
      <Path d={ARCH} fill={colorB} opacity={0.85} />
      {/* Beaded arch trim */}
      <Path
        d={ARCH} fill="none" stroke={line} strokeWidth={2.1}
        strokeDasharray="0.4 3.2" strokeLinecap="round"
      />
      {/* Eye veil opening — warm skin band */}
      <Path
        d="M33.5 41 C 40 38.4 60 38.4 66.5 41 C 67.1 46.5 66.6 50 66 52.6 C 58 55.2 42 55.2 34 52.6 C 33.4 50 32.9 46.5 33.5 41 Z"
        fill={face}
      />
      {/* Nose-bridge shading */}
      <Path d="M47.6 43.8 L52.4 43.8 L51.4 52.4 L48.6 52.4 Z" fill="#C99568" opacity={0.55} />
      {/* Brows */}
      <Path d="M36.5 41.6 Q 41 38.7 45.6 40.9" stroke={brow} strokeWidth={2.1} fill="none" strokeLinecap="round" />
      <Path d="M54.4 40.9 Q 59 38.7 63.5 41.6" stroke={brow} strokeWidth={2.1} fill="none" strokeLinecap="round" />
      {/* Eyes — white sclera, brown iris, catchlight */}
      <Path d="M37 46.2 Q 41 42.5 45.6 45.4 Q 41.5 49.7 37 46.2 Z" fill="#FFFFFF" />
      <Path d="M63 46.2 Q 59 42.5 54.4 45.4 Q 58.5 49.7 63 46.2 Z" fill="#FFFFFF" />
      <Circle cx="41.2" cy="45.9" r="2.5" fill="#6E3F1C" stroke={brow} strokeWidth="0.7" />
      <Circle cx="58.8" cy="45.9" r="2.5" fill="#6E3F1C" stroke={brow} strokeWidth="0.7" />
      <Circle cx="41.2" cy="45.9" r="1.1" fill="#1A0F08" />
      <Circle cx="58.8" cy="45.9" r="1.1" fill="#1A0F08" />
      <Circle cx="42" cy="45" r="0.55" fill="#FFFFFF" />
      <Circle cx="59.6" cy="45" r="0.55" fill="#FFFFFF" />
      {/* Upper lash lines + outer flicks */}
      <Path d="M37 46 Q 41 42.3 45.7 45.1" stroke={lash} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M63 46 Q 59 42.3 54.3 45.1" stroke={lash} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M37.3 45.5 Q 35.6 44.2 34.5 44.4" stroke={lash} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Path d="M38.2 44.5 Q 36.9 43.1 36 43.1" stroke={lash} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      <Path d="M62.7 45.5 Q 64.4 44.2 65.5 44.4" stroke={lash} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Path d="M61.8 44.5 Q 63.1 43.1 64 43.1" stroke={lash} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      {/* Soft lower lash lines */}
      <Path d="M38 47.8 Q 41.5 49.6 45 47.5" stroke="#6B4A2E" strokeWidth={0.8} fill="none" opacity={0.7} />
      <Path d="M62 47.8 Q 58.5 49.6 55 47.5" stroke="#6B4A2E" strokeWidth={0.8} fill="none" opacity={0.7} />
      {/* Niqab edge under the eye veil */}
      <Path d="M34 53.2 Q 50 56.8 66 53.2" stroke={colorB} strokeWidth={1.6} fill="none" opacity={0.9} />
      {/* Outer fold lines */}
      <Path d="M27 46 C 24 68 22 92 21 114" stroke={line} strokeWidth="1.4" fill="none" />
      <Path d="M73 46 C 76 68 78 92 79 114" stroke={line} strokeWidth="1.4" fill="none" />
    </Svg>
  );
}

export function HijabiFigure({ width = '100%', height = '100%', colorA = '#6B6B6E', colorB = '#2E2E30', face = '#F2ECE4', line = 'rgba(255,255,255,0.16)', preserveAspectRatio = 'xMidYMax meet' }) {
  const id = React.useMemo(() => `hj${_gid++}`, []);
  return (
    <Svg width={width} height={height} viewBox="0 0 100 120" preserveAspectRatio={preserveAspectRatio}>
      <Defs>
        <SvgGrad id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colorA} />
          <Stop offset="1" stopColor={colorB} />
        </SvgGrad>
      </Defs>
      {/* Hijab drape */}
      <Path d={DRAPE} fill={`url(#${id})`} />
      {/* Face opening */}
      <Ellipse cx="50" cy="42" rx="15" ry="18" fill={face} />
      {/* Under-chin wrap */}
      <Path d="M34 51 Q50 66 66 51 L 66 60 Q50 74 34 60 Z" fill={`url(#${id})`} />
      {/* Hijab rim highlight framing the face */}
      <Path d="M35.5 47 C 34 30 41 24 50 24 C 59 24 66 30 64.5 47" stroke={line} strokeWidth="1.8" fill="none" />
      {/* Serene features: brows, closed lashes, soft smile */}
      <Path d="M40.5 36.5 Q44 34.6 47.5 36.2" stroke="#1A161E" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M52.5 36.2 Q56 34.6 59.5 36.5" stroke="#1A161E" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.75" />
      <Path d="M40 42 Q43.5 45.4 47 42" stroke="#1A161E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M53 42 Q56.5 45.4 60 42" stroke="#1A161E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M45.5 52.5 Q50 55.8 54.5 52.5" stroke="#1A161E" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.85" />
      {/* Fold lines */}
      <Path d="M38 66 C 33 82 30 98 28 114" stroke={line} strokeWidth="1.4" fill="none" />
      <Path d="M62 66 C 67 82 70 98 72 114" stroke={line} strokeWidth="1.4" fill="none" />
    </Svg>
  );
}

// Convenience: pick the right figure for a veil style.
export function VeilFigure({ veil, ...props }) {
  return veil === 'Niqab' ? <NiqabiFigure {...props} /> : <HijabiFigure {...props} />;
}
