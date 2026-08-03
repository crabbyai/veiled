#!/usr/bin/env node
/**
 * configure-launch.js — set the real-world values Veiled needs before it
 * can be submitted to the App Store, in one command.
 *
 *   node scripts/configure-launch.js \
 *     --support-email you@yourdomain.com \
 *     --privacy-url https://yourdomain.com/privacy \
 *     --terms-url https://yourdomain.com/terms \
 *     --asc-app-id 1234567890 \
 *     --api-url https://api.yourdomain.com
 *
 * Every flag is optional — only what you pass gets changed. Run it again
 * any time to update a value. Use --check to see the current values
 * without changing anything.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const p = (f) => path.join(ROOT, f);

// --- parse args -------------------------------------------------------
const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    if (key === 'check') { opt.check = true; continue; }
    opt[key] = args[i + 1];
    i++;
  }
}

const FILES = {
  settings: 'src/muzz/screens/SettingsScreen.js',
  gold: 'src/muzz/screens/GoldScreen.js',
  eas: 'eas.json',
  env: '.env',
  app: 'app.json',
  payments: 'backend/services/payments.js',
};

const read = (f) => (fs.existsSync(p(f)) ? fs.readFileSync(p(f), 'utf8') : null);
const write = (f, s) => fs.writeFileSync(p(f), s);

const changes = [];

// Replace `const NAME = '...'` in a JS file.
function setConst(file, name, value) {
  const src = read(file);
  if (src == null) return false;
  const re = new RegExp(`(const ${name} = ')([^']*)(')`);
  if (!re.test(src)) return false;
  const before = src.match(re)[2];
  if (before === value) return false;
  write(file, src.replace(re, `$1${value}$3`));
  changes.push(`${file}: ${name} ${before} -> ${value}`);
  return true;
}

function currentConst(file, name) {
  const src = read(file);
  if (src == null) return null;
  const m = src.match(new RegExp(`const ${name} = '([^']*)'`));
  return m ? m[1] : null;
}

// --- --check ----------------------------------------------------------
if (opt.check) {
  const easJson = read(FILES.eas) ? JSON.parse(read(FILES.eas)) : {};
  const ascId = easJson?.submit?.production?.ios?.ascAppId;
  const env = read(FILES.env) || '';
  const apiUrl = (env.match(/^EXPO_PUBLIC_API_URL=(.*)$/m) || [])[1];
  const appJson = read(FILES.app) ? JSON.parse(read(FILES.app)) : {};
  const rows = [
    ['Bundle ID', appJson?.expo?.ios?.bundleIdentifier],
    ['Support email', currentConst(FILES.settings, 'SUPPORT_EMAIL')],
    ['Privacy URL (Settings)', currentConst(FILES.settings, 'PRIVACY_URL')],
    ['Privacy URL (Paywall)', currentConst(FILES.gold, 'PRIVACY_URL')],
    ['Terms URL (Settings)', currentConst(FILES.settings, 'TERMS_URL')],
    ['Terms URL (Paywall)', currentConst(FILES.gold, 'TERMS_URL')],
    ['App Store Connect app ID', ascId],
    ['Backend API URL (.env)', apiUrl || '(not set — app runs in offline demo mode)'],
  ];
  console.log('\nCurrent launch configuration\n');
  let unset = 0;
  for (const [label, val] of rows) {
    const bad = !val || /veiledapp\.com|adeelahmedrahman\.github\.io|SET_AFTER_CREATING/.test(String(val));
    if (bad && !String(val).includes('not set')) unset++;
    console.log(`  ${bad ? '✗' : '✓'} ${label.padEnd(26)} ${val || '(unset)'}`);
  }
  console.log(unset ? `\n${unset} value(s) still need replacing before submitting.\n`
                    : '\nAll launch values are set.\n');
  process.exit(0);
}

// --- apply ------------------------------------------------------------
if (opt['support-email']) setConst(FILES.settings, 'SUPPORT_EMAIL', opt['support-email']);
if (opt['privacy-url']) {
  setConst(FILES.settings, 'PRIVACY_URL', opt['privacy-url']);
  setConst(FILES.gold, 'PRIVACY_URL', opt['privacy-url']);
}
if (opt['terms-url']) {
  setConst(FILES.settings, 'TERMS_URL', opt['terms-url']);
  setConst(FILES.gold, 'TERMS_URL', opt['terms-url']);
}

// Bundle ID is permanent once an App Store Connect record exists, so when
// reusing an existing record the app must adopt that record's bundle ID.
// It appears in several places — change them together or the build breaks.
if (opt['bundle-id']) {
  const id = String(opt['bundle-id']).trim();
  if (!/^[A-Za-z0-9.-]+$/.test(id) || !id.includes('.')) {
    console.error(`\nRefusing to set an invalid bundle ID: "${id}"`);
    console.error('It must be reverse-DNS, e.g. com.yourcompany.veiled\n');
    process.exit(1);
  }
  const appSrc = read(FILES.app);
  if (appSrc) {
    const j = JSON.parse(appSrc);
    const before = j.expo?.ios?.bundleIdentifier;
    if (before !== id) {
      // Rewrite every occurrence of the old id (iOS bundle, Android
      // package, Apple Pay merchant id, proguard rule).
      const updated = appSrc.split(before).join(id);
      write(FILES.app, updated);
      changes.push(`app.json: bundle ID ${before} -> ${id}`);
      const paySrc = read(FILES.payments);
      if (paySrc && paySrc.includes(before)) {
        write(FILES.payments, paySrc.split(before).join(id));
        changes.push(`backend/services/payments.js: default Android package -> ${id}`);
      }
    }
  }
}

if (opt['asc-app-id']) {
  const easSrc = read(FILES.eas);
  if (easSrc) {
    const j = JSON.parse(easSrc);
    j.submit = j.submit || {};
    j.submit.production = j.submit.production || {};
    j.submit.production.ios = j.submit.production.ios || {};
    const before = j.submit.production.ios.ascAppId;
    j.submit.production.ios.ascAppId = String(opt['asc-app-id']);
    write(FILES.eas, JSON.stringify(j, null, 2) + '\n');
    changes.push(`eas.json: ascAppId ${before} -> ${opt['asc-app-id']}`);
  }
}

if (opt['api-url']) {
  let env = read(FILES.env);
  if (env == null) env = read('.env.example') || '';
  if (/^EXPO_PUBLIC_API_URL=.*$/m.test(env)) {
    env = env.replace(/^EXPO_PUBLIC_API_URL=.*$/m, `EXPO_PUBLIC_API_URL=${opt['api-url']}`);
  } else {
    env += `\nEXPO_PUBLIC_API_URL=${opt['api-url']}\n`;
  }
  write(FILES.env, env);
  changes.push(`.env: EXPO_PUBLIC_API_URL -> ${opt['api-url']}`);
}

if (!changes.length) {
  console.log('Nothing changed. Pass --check to see current values, or use flags:');
  console.log('  --bundle-id --support-email --privacy-url --terms-url --asc-app-id --api-url');
  process.exit(0);
}

console.log('\nUpdated:');
changes.forEach((c) => console.log('  ' + c));
console.log('\nRun `node scripts/configure-launch.js --check` to confirm.\n');
