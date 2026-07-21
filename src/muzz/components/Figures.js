import React from 'react';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Ellipse, Rect, Circle } from 'react-native-svg';

// ─── Veiled figures ─────────────────────────────────────────────────
// Elegant, modest illustrated figures used across the app:
//  · NiqabiFigure — flowing niqab drape, kohl-lined eyes through the
//    eye-veil, a small star brooch. The app mascot and niqabi card art.
//  · HijabiFigure — gracefully wrapped hijab framing a serene face
//    (closed lashes, soft smile). Used on hijabi profile cards.
// Both are drawn in a 100 x 120 viewBox and scale crisply anywhere.

let _gid = 0;

// Flowing outer drape shared by both figures: soft crown, gentle
// shoulder flare, floor-length hem.
const DRAPE =
  'M50 8 C 33 8 23 21 20 39 C 17 57 15 88 12 118 L 88 118 '
  + 'C 85 88 83 57 80 39 C 77 21 67 8 50 8 Z';

export function NiqabiFigure({ width = '100%', height = '100%', colorA = '#2A2A2E', colorB = '#0E0E10', face = '#F2ECE4', line = 'rgba(255,255,255,0.16)', preserveAspectRatio = 'xMidYMax meet' }) {
  const id = React.useMemo(() => `nq${_gid++}`, []);
  return (
    <Svg width={width} height={height} viewBox="0 0 100 120" preserveAspectRatio={preserveAspectRatio}>
      <Defs>
        <SvgGrad id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colorA} />
          <Stop offset="1" stopColor={colorB} />
        </SvgGrad>
      </Defs>
      {/* Drape */}
      <Path d={DRAPE} fill={`url(#${id})`} />
      {/* Soft fold lines */}
      <Path d="M40 20 C 33 32 30 58 28 112" stroke={line} strokeWidth="1.6" fill="none" />
      <Path d="M60 20 C 67 32 70 58 72 112" stroke={line} strokeWidth="1.6" fill="none" />
      <Path d="M50 64 C 49 80 49 98 49 116" stroke={line} strokeWidth="1.2" fill="none" />
      {/* Eye veil opening */}
      <Rect x="30" y="38.5" width="40" height="13.5" rx="6.75" fill={face} />
      {/* Kohl-lined almond eyes */}
      <Path d="M35.5 45.2 Q40.5 40.8 45.5 45.2 Q40.5 49.4 35.5 45.2 Z" fill="#1A161E" />
      <Path d="M54.5 45.2 Q59.5 40.8 64.5 45.2 Q59.5 49.4 54.5 45.2 Z" fill="#1A161E" />
      <Circle cx="40.5" cy="45" r="1.9" fill="#5C5460" />
      <Circle cx="59.5" cy="45" r="1.9" fill="#5C5460" />
      <Circle cx="41.1" cy="44.3" r="0.6" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="60.1" cy="44.3" r="0.6" fill="#FFFFFF" opacity="0.9" />
      {/* Lash flicks */}
      <Path d="M35.8 44.4 Q33.6 42.9 32.4 43.3" stroke="#1A161E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <Path d="M64.2 44.4 Q66.4 42.9 67.6 43.3" stroke="#1A161E" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* Brow hints above the veil line */}
      <Path d="M35.5 36.2 Q40.5 33.8 45.5 36" stroke={line} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d="M54.5 36 Q59.5 33.8 64.5 36.2" stroke={line} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Star brooch */}
      <Path d="M50 68 L52 72.2 L56.2 74 L52 75.8 L50 80 L48 75.8 L43.8 74 L48 72.2 Z" fill={face} opacity="0.8" />
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
