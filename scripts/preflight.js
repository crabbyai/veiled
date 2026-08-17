#!/usr/bin/env node
/* eslint-disable no-console */
// ─── Pre-submission check ───────────────────────────────────────────
// The things that get an app rejected, checked mechanically, so they
// cannot quietly come back. Run before every build:
//
//   node scripts/preflight.js
//
// Exits non-zero on anything that would fail review. Warnings are things
// worth looking at that would not, on their own, be a rejection.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const pkg = JSON.parse(read('package.json'));

let failures = 0;
let warnings = 0;
const fail = (what, why) => { failures++; console.log(`  ✗ ${what}\n      ${why}`); };
const warn = (what, why) => { warnings++; console.log(`  ! ${what}\n      ${why}`); };
const pass = (what) => console.log(`  ✓ ${what}`);
const head = (t) => console.log(`\n${t}`);

// Every file the app could reach, for "is this actually used" checks.
const sources = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) sources.push(read(rel));
  }
})('src');
const code = sources.join('\n') + read('App.js') + (fs.existsSync(path.join(ROOT, 'index.js')) ? read('index.js') : '');
const uses = (needle) => code.includes(needle);

// ── 2.1 Completeness: nothing declared that nothing uses ────────────
head('Guideline 2.1 — permissions and capabilities match the code');

// A permission string with no code behind it is what a reviewer means by
// "incomplete": the app asks for something it never does.
const PERMISSION_EVIDENCE = {
  NSCameraUsageDescription: ['react-native-webrtc', 'expo-image-picker', 'ImagePicker'],
  NSMicrophoneUsageDescription: ['expo-audio', 'react-native-webrtc'],
  NSPhotoLibraryUsageDescription: ['expo-image-picker', 'ImagePicker'],
  NSPhotoLibraryAddUsageDescription: ['expo-image-picker', 'ImagePicker'],
  NSLocationWhenInUseUsageDescription: ['expo-location', 'Location.'],
  NSFaceIDUsageDescription: ['expo-local-authentication', 'LocalAuthentication'],
  NSContactsUsageDescription: ['expo-contacts', 'Contacts.'],
  NSCalendarsUsageDescription: ['expo-calendar'],
  NSMotionUsageDescription: ['expo-sensors'],
  NSSpeechRecognitionUsageDescription: ['expo-speech'],
};
const info = app.ios.infoPlist || {};
for (const key of Object.keys(info).filter((k) => k.startsWith('NS') && k.endsWith('UsageDescription'))) {
  const evidence = PERMISSION_EVIDENCE[key];
  if (!evidence) { warn(`${key} declared`, 'No known evidence rule — check by hand that it is used.'); continue; }
  if (evidence.some(uses)) pass(`${key} is used`);
  else fail(`${key} is declared but nothing uses it`,
    `Nothing in src/ references ${evidence.join(' or ')}. Remove the string, or use it.`);
}

// UIBackgroundModes are checked closely, and `voip` obliges PushKit and
// CallKit. Declaring it without them is a rejection on its own.
const modes = info.UIBackgroundModes || [];
const hasCallKit = uses('react-native-callkeep') || uses('CallKit');
const hasVoipPush = uses('react-native-voip-push-notification');
if (modes.includes('voip') && !hasCallKit) {
  fail('UIBackgroundModes includes "voip" without CallKit',
    'Apple requires PushKit + CallKit for the voip mode. Remove it, or implement CallKit.');
} else if (modes.includes('voip')) {
  pass('voip mode is backed by CallKit');
  // iOS kills an app that takes a VoIP push without reporting a call.
  if (!hasVoipPush) warn('voip declared without a PushKit token registration',
    'Without react-native-voip-push-notification nothing wakes a closed app, so the mode does nothing.');
  else pass('PushKit token registration is present');
} else if (hasCallKit) {
  warn('CallKit is installed but the voip background mode is not declared',
    'A closed app cannot be woken for a call without it.');
}
if (modes.includes('audio') && !uses('react-native-webrtc') && !uses('expo-audio')) {
  fail('UIBackgroundModes includes "audio" with no audio in the app',
    'Remove it — background modes are checked against what the app does.');
} else if (modes.includes('audio')) pass('audio mode is backed by real audio');

// A native module that is installed but never imported still ships its
// permissions and frameworks, and review sees them.
const NATIVE = ['expo-camera', 'expo-local-authentication', 'expo-location', 'expo-contacts',
  'expo-av', 'react-native-iap', 'expo-sensors', 'expo-calendar',
  'react-native-callkeep', 'react-native-voip-push-notification', 'react-native-webrtc',
  'react-native-purchases'];
for (const dep of NATIVE.filter((d) => pkg.dependencies[d])) {
  if (!uses(dep)) fail(`${dep} is installed but never imported`,
    'It still contributes frameworks and permissions to the build. Remove it, or use it.');
  else pass(`${dep} is used`);
}

// ── 2.1 Completeness: nothing fake on screen ────────────────────────
head('Guideline 2.1 — no placeholder content in a shipping build');
const config = read('src/muzz/config.js');
if (!config.includes('!HAS_BACKEND && process.env.EXPO_PUBLIC_DEMO_MODE')) {
  fail('Demo mode can be on with a backend configured',
    'Sample profiles must be impossible in a build that has a real API.');
} else pass('sample profiles cannot appear in a build with a backend');
if (!process.env.EXPO_PUBLIC_API_URL) {
  warn('EXPO_PUBLIC_API_URL is not set in this shell',
    'The build must have it, or the app ships with no backend and an empty deck.');
} else pass(`API points at ${process.env.EXPO_PUBLIC_API_URL}`);
if (process.env.EXPO_PUBLIC_DEMO_MODE === '1') {
  fail('EXPO_PUBLIC_DEMO_MODE=1 in this shell', 'Never build for the store with demo mode on.');
} else pass('demo mode is off');

// ── 3.1.1 Payments ──────────────────────────────────────────────────
head('Guideline 3.1.1 — digital goods go through in-app purchase');
const gold = read('src/muzz/screens/GoldScreen.js');
if (/https?:\/\/[^\s'"]*\/(checkout|billing|subscribe|pay)/i.test(code)) {
  fail('An external payment link appears in the app',
    'Digital goods cannot be sold outside IAP. Remove the link.');
} else pass('no external payment links');
if (gold.includes('iapEnabled') && gold.includes('purchases.purchase')) {
  pass('the paywall only charges through the store SDK');
} else {
  warn('Could not confirm the paywall routes through IAP', 'Check GoldScreen by hand.');
}

// ── 5.1.1(v) Account deletion ───────────────────────────────────────
head('Guideline 5.1.1(v) — account deletion is reachable in the app');
if (uses('deleteAccount')) pass('deleteAccount is wired up');
else fail('No account deletion found', 'An account-creating app must let people delete it in-app.');

// ── Encryption declaration ──────────────────────────────────────────
head('Export compliance');
if (info.ITSAppUsesNonExemptEncryption === false) pass('ITSAppUsesNonExemptEncryption is declared');
else fail('ITSAppUsesNonExemptEncryption is not declared false',
  'Without it every build stops and waits for an answer before it can be submitted.');

// ── Version and build ───────────────────────────────────────────────
head('Version');
const eas = JSON.parse(read('eas.json'));
if (eas.cli && eas.cli.appVersionSource === 'remote') pass('build numbers are managed by EAS');
else warn('appVersionSource is not "remote"', 'Hand-edited build numbers collide with what EAS has already used.');
if (info.CFBundleVersion || app.ios.buildNumber) {
  warn('A build number is pinned in app.json', 'With remote versioning EAS owns this — remove it to avoid a clash.');
} else pass('no hand-pinned build number');

// ── Native module duplication ───────────────────────────────────────
head('Dependencies');
try {
  const out = execSync('npx expo-doctor 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  if (/Found duplicates for/.test(out)) {
    fail('Duplicate native modules', 'Two versions of one native module is the white-screen bug. Run npx expo-doctor.');
  } else pass('no duplicate native modules');
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  if (/Found duplicates for/.test(out)) fail('Duplicate native modules', 'Run npx expo-doctor for the list.');
  else warn('expo-doctor could not complete', 'Network-restricted environments fail its remote checks; run it locally.');
}

// ── Result ──────────────────────────────────────────────────────────
console.log(`\n${failures ? '✗' : '✓'} ${failures} blocking, ${warnings} to look at`);
if (failures) {
  console.log('\nFix the blocking items before building. Each one is a rejection.');
  process.exit(1);
}
console.log('\nNothing blocking. Read store/DEPLOY.md for the rest of the submission.');
