import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

// Veiled's mark: the logo illustration, cut out of its background by
// scripts/make-mark.js so it sits on any screen.
//
// It replaces the flat drawn glyph that used to stand in for it. The
// artwork is wider than it is tall and the subject sits slightly right
// of centre, so `size` means height and the frame is given room either
// side rather than squashing her to a square.
const MARK = require('../../../assets/art/logo-mark.png');
const RATIO = 386 / 261; // the artwork's aspect

export function VeiledMark({ size = 64, style, opacity = 1 }) {
  return (
    <View style={[{ height: size, width: size * RATIO, opacity }, styles.wrap, style]}>
      <Image source={MARK} style={styles.img} resizeMode="contain" accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
});

export default VeiledMark;
