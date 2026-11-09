import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('../packages/test-fixtures/node_modules/pngjs');

const iconsDir = path.resolve('apps/editor/public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Generate icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <linearGradient id="fold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect x="32" y="32" width="448" height="448" rx="96" fill="url(#bg)"/>
  <path d="M144 112 H304 L368 176 V400 H144 Z" fill="#ffffff" rx="12"/>
  <path d="M304 112 V176 H368 Z" fill="url(#fold)"/>
  <rect x="180" y="220" width="152" height="24" rx="6" fill="#ef4444"/>
  <rect x="180" y="268" width="100" height="18" rx="5" fill="#94a3b8"/>
  <rect x="180" y="306" width="130" height="18" rx="5" fill="#94a3b8"/>
  <rect x="180" y="344" width="80" height="18" rx="5" fill="#94a3b8"/>
</svg>
`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created icon.svg');

// 2. Function to generate PNG icon
function generatePng(size, filename) {
  const png = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const u = x / size;
      const v = y / size;

      // Squircle background margin 0.06 to 0.94, radius ~0.18
      const inBgX = u >= 0.06 && u <= 0.94;
      const inBgY = v >= 0.06 && v <= 0.94;

      if (!inBgX || !inBgY) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Check corner rounding
      const cornerR = 0.18;
      let insideSquircle = true;
      const cx = u < 0.06 + cornerR ? 0.06 + cornerR : u > 0.94 - cornerR ? 0.94 - cornerR : u;
      const cy = v < 0.06 + cornerR ? 0.06 + cornerR : v > 0.94 - cornerR ? 0.94 - cornerR : v;
      const dist = Math.hypot(u - cx, v - cy);
      if (dist > cornerR) {
        insideSquircle = false;
      }

      if (!insideSquircle) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Background color: vibrant blue gradient
      let r = Math.round(37 + (29 - 37) * v);
      let g = Math.round(99 + (78 - 99) * v);
      let b = Math.round(235 + (216 - 235) * v);
      let a = 255;

      // Document shape: x: [0.28, 0.72], y: [0.22, 0.78]
      const docLeft = 0.28;
      const docRight = 0.72;
      const docTop = 0.22;
      const docBottom = 0.78;
      const foldSize = 0.12;

      const inDocBounds = u >= docLeft && u <= docRight && v >= docTop && v <= docBottom;
      const inFoldCutout =
        u > docRight - foldSize &&
        v < docTop + foldSize &&
        u - (docRight - foldSize) + (docTop + foldSize - v) > foldSize;

      if (inDocBounds && !inFoldCutout) {
        // Document body: white
        r = 255;
        g = 255;
        b = 255;

        // Red accent bar: x in [0.35, 0.65], y in [0.42, 0.47]
        if (u >= 0.35 && u <= 0.65 && v >= 0.42 && v <= 0.47) {
          r = 239;
          g = 68;
          b = 68;
        } else if (u >= 0.35 && u <= 0.55 && v >= 0.52 && v <= 0.55) {
          // Line 1: slate
          r = 148;
          g = 163;
          b = 184;
        } else if (u >= 0.35 && u <= 0.62 && v >= 0.59 && v <= 0.62) {
          // Line 2: slate
          r = 148;
          g = 163;
          b = 184;
        } else if (u >= 0.35 && u <= 0.5 && v >= 0.66 && v <= 0.69) {
          // Line 3: slate
          r = 148;
          g = 163;
          b = 184;
        }
      } else if (
        u >= docRight - foldSize &&
        u <= docRight &&
        v >= docTop &&
        v <= docTop + foldSize
      ) {
        // Fold corner triangle
        const foldDist = u - (docRight - foldSize) + (v - docTop);
        if (foldDist <= foldSize) {
          r = 203;
          g = 213;
          b = 225;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Created ${filename} (${size}x${size}, ${buffer.length} bytes)`);
}

generatePng(192, 'icon-192.png');
generatePng(512, 'icon-512.png');
