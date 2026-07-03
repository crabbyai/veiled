import React from 'react';
import { StatusBar } from 'react-native';
import MuzzNavigator from './src/muzz/MuzzNavigator';

// Veiled — the marriage app for hijabis & niqabis. Built to out-Muzz
// Muzz: an AI Butterfly auto-matches you with compatible people (no
// swiping required), and The Veil keeps sisters' photos frosted until
// they choose to unveil them for a match.
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <MuzzNavigator />
    </>
  );
}
