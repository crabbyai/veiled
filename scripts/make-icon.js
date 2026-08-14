#!/usr/bin/env node
/**
 * make-icon.js — generate Veiled's app icon from the logo artwork.
 *
 * Source: assets/art/logo-niqabi.jpeg — the niqabi illustration with its
 * white sticker outline. The artwork is wider than it is tall, so we take
 * a square crop around the subject rather than letterboxing her into a
 * band across the middle of the icon. The artwork keeps its own dark
 * background, sampled from a corner pixel and extended to fill any
 * padding, so there is no visible seam around the placed image.
 *
 * The App Store icon must be opaque (no alpha channel), so everything is
 * flattened onto that background and written without transparency.
 *
 *   node scripts/make-icon.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHROME = '/opt/pw-browsers/chromium';
const SRC = path.join(ROOT, 'assets/art/logo-niqabi.jpeg');

// The square crop taken from the source, in fractions of its width and
// height: centred on the subject and running to the bottom edge, so she
// sits in the frame like a portrait rather than floating in it.
const CROP = { cx: 0.505, cy: 0.5 };

// `fit` is the fraction of the icon the crop fills. iOS masks icons to a
// rounded square (a full-bleed portrait is fine) while Android masks to a
// circle, so the adaptive foreground is drawn much smaller to survive it.
const TARGETS = [
  { file: 'assets/icon.png', size: 1024, fit: 1 },
  { file: 'store/icon/icon-1024.png', size: 1024, fit: 1 },
  { file: 'assets/adaptive-icon.png', size: 1024, fit: 0.66 },
  { file: 'assets/splash-icon.png', size: 1024, fit: 0.78 },
  { file: 'assets/favicon.png', size: 64, fit: 1 },
];

const page_html = (dataUri, size, fit) => `
<style>html,body{margin:0;padding:0;overflow:hidden}canvas{display:block}</style>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
  window.done = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ctx = document.getElementById('c').getContext('2d');
      // Sample the artwork's own background from a corner so the square
      // we paint behind it matches and the edges disappear.
      const probe = document.createElement('canvas');
      probe.width = img.width; probe.height = img.height;
      const pctx = probe.getContext('2d');
      pctx.drawImage(img, 0, 0);
      const [r, g, b] = pctx.getImageData(2, 2, 1, 1).data;
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(0, 0, ${size}, ${size});

      // Square crop from the source, clamped to stay inside the artwork.
      const side = Math.min(img.width, img.height);
      const sx = Math.max(0, Math.min(img.width - side, ${CROP.cx} * img.width - side / 2));
      const sy = Math.max(0, Math.min(img.height - side, ${CROP.cy} * img.height - side / 2));

      const box = ${size} * ${fit};
      const off = (${size} - box) / 2;
      ctx.drawImage(img, sx, sy, side, side, off, off, box, box);
      resolve(true);
    };
    img.src = '${dataUri}';
  });
</script>`;

(async () => {
  let chromium;
  try {
    chromium = require('playwright-core').chromium;
  } catch {
    console.error('playwright-core is required: npm i -D playwright-core');
    process.exit(1);
  }
  if (!fs.existsSync(SRC)) { console.error(`missing source artwork: ${SRC}`); process.exit(1); }
  const dataUri = `data:image/jpeg;base64,${fs.readFileSync(SRC).toString('base64')}`;

  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  for (const { file, size, fit } of TARGETS) {
    const out = path.join(ROOT, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(page_html(dataUri, size, fit), { waitUntil: 'load' });
    await page.waitForFunction('window.done !== undefined');
    await page.evaluate('window.done');
    // omitBackground:false keeps the PNG opaque — Apple rejects alpha.
    await page.screenshot({ path: out, omitBackground: false });
    await page.close();
    console.log(`  wrote ${file} (${size}x${size})`);
  }
  await browser.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
