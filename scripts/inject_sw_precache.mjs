import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const distDir = path.join(repoRoot, 'apps/editor/dist');
const distSw = path.join(distDir, 'sw.js');
const assetsDir = path.join(distDir, 'assets');

if (fs.existsSync(distSw) && fs.existsSync(assetsDir)) {
  const assetFiles = fs
    .readdirSync(assetsDir)
    .filter((f) => !f.endsWith('.map'))
    .map((f) => `/assets/${f}`);

  let swCode = fs.readFileSync(distSw, 'utf-8');
  swCode = swCode.replace('/* __PRECACHE_DYNAMIC_ASSETS__ */ []', JSON.stringify(assetFiles));
  fs.writeFileSync(distSw, swCode, 'utf-8');
  console.log(`[SW-Precache] Injected ${assetFiles.length} build assets into ${distSw}`);
} else {
  console.warn(`[SW-Precache] Could not find dist directory: ${distDir}`);
}
