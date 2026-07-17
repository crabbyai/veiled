import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect, Circle, G } from 'react-native-svg';

// ─── Islamic geometric pattern ──────────────────────────────────────
// A tessellating 8-point star (khatam / Rub el Hizb) motif used as a
// subtle texture on photo surfaces and, above all, on The Veil — so the
// frosted layer reads like a carved mashrabiya screen rather than a flat
// fill. Pure SVG, so it scales crisply at any size.

let _id = 0;

function starPath(cx, cy, R, r, points = 8) {
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = i * step - Math.PI / 2;
    const x = (cx + rad * Math.cos(a)).toFixed(2);
    const y = (cy + rad * Math.sin(a)).toFixed(2);
    d += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
  }
  return d + 'Z';
}

export function IslamicPattern({ color = '#FFFFFF', opacity = 0.07, tile = 46, strokeWidth = 1 }) {
  const id = React.useMemo(() => `veilptn${_id++}`, []);
  const c = tile / 2;
  const star = starPath(c, c, tile * 0.44, tile * 0.18);
  // A second star straddling the tile corners knits the motif together
  // so it reads as one continuous lattice when tiled.
  const cornerStar = starPath(0, 0, tile * 0.30, tile * 0.12);
  const cornerStar2 = starPath(tile, tile, tile * 0.30, tile * 0.12);

  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <G stroke={color} strokeWidth={strokeWidth} fill="none" opacity={opacity} strokeLinejoin="round">
            <Path d={star} />
            <Path d={cornerStar} />
            <Path d={cornerStar2} />
            <Circle cx={c} cy={c} r={tile * 0.05} fill={color} stroke="none" />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
