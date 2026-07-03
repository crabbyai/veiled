import React from 'react';
import { StatusBar } from 'react-native';
import MuzzNavigator from './src/muzz/MuzzNavigator';

// Muzz·ai — a Muzz dating + social clone whose headline feature is an
// AI Butterfly that automatically matches you with compatible people.
// No swiping required. (The original Androgenic looksmaxxing app remains
// available under src/navigation/AppNavigator.js.)
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <MuzzNavigator />
    </>
  );
}
