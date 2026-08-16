#!/usr/bin/env node
/**
 * make-mark.js — cut the logo artwork out of its background.
 *
 * assets/art/logo-niqabi.jpeg is the illustration on a flat dark card.
 * The app draws the mark on light and dark screens alike, so it needs a
 * transparent version.
 *
 * A plain colour key won't do it: the niqab itself is nearly as dark as
 * the background. What saves us is the white sticker outline — it
 * completely encloses the subject. So we flood-fill inward from the
 * edges, clearing background-coloured pixels and stopping at anything
 * bright. The fill can't cross the outline, so the black of the niqab
 * is never touched.
 *
 *   node scripts/make-mark.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHROME = '/opt/pw-browsers/chromium';
const SRC = path.join(ROOT, 'assets/art/logo-niqabi.jpeg');
const OUT = path.join(ROOT, 'assets/art/logo-mark.png');

// How close to the sampled background a pixel must be to count as
// background, and how bright a pixel must be to act as a wall.
const BG_TOLERANCE = 42;
const WALL_BRIGHTNESS = 110;

const page_html = (dataUri) => `
<canvas id="c"></canvas>
<script>
  window.done = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.getElementById('c');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      const W = c.width, H = c.height;
      const bg = [d[0], d[1], d[2]];

      const idx = (x, y) => (y * W + x) * 4;
      const isBg = (i) =>
        Math.abs(d[i] - bg[0]) < ${BG_TOLERANCE} &&
        Math.abs(d[i + 1] - bg[1]) < ${BG_TOLERANCE} &&
        Math.abs(d[i + 2] - bg[2]) < ${BG_TOLERANCE};
      const isWall = (i) => (d[i] + d[i + 1] + d[i + 2]) / 3 > ${WALL_BRIGHTNESS};

      // Flood fill inward from the top and side edges only. The subject
      // is cropped by the bottom of the frame, so her outline is open
      // down there — seeding the bottom row lets the fill walk straight
      // inside and eat the black of the niqab, which is close enough to
      // the background colour to match it.
      const seen = new Uint8Array(W * H);
      const stack = [];
      for (let x = 0; x < W; x++) stack.push([x, 0]);
      for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y]);

      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const p = y * W + x;
        if (seen[p]) continue;
        seen[p] = 1;
        const i = idx(x, y);
        if (isWall(i) || !isBg(i)) continue;   // the outline stops us
        d[i + 3] = 0;                          // clear it
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }

      // Soften the cut edge: any surviving pixel touching a cleared one
      // gets partial alpha, so the mark doesn't look scissored out.
      const alpha = new Uint8ClampedArray(W * H);
      for (let p = 0; p < W * H; p++) alpha[p] = d[p * 4 + 3];
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const p = y * W + x;
          if (alpha[p] === 0) continue;
          let clear = 0;
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            if (alpha[(y + dy) * W + (x + dx)] === 0) clear++;
          }
          if (clear) d[p * 4 + 3] = Math.max(0, 255 - clear * 64);
        }
      }

      ctx.putImageData(id, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = '${dataUri}';
  });
</script>`;

(async () => {
  const { chromium } = require('playwright-core');
  if (!fs.existsSync(SRC)) { console.error(`missing ${SRC}`); process.exit(1); }
  const dataUri = `data:image/jpeg;base64,${fs.readFileSync(SRC).toString('base64')}`;

  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(page_html(dataUri), { waitUntil: 'load' });
  await page.waitForFunction('window.done !== undefined');
  const out = await page.evaluate('window.done');
  await browser.close();

  fs.writeFileSync(OUT, Buffer.from(out.split(',')[1], 'base64'));
  console.log(`  wrote ${path.relative(ROOT, OUT)}`);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
