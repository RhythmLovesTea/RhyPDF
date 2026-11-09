import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DIST_DIR = path.resolve('apps/editor/dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

if (!fs.existsSync(ASSETS_DIR)) {
  console.error(`Bundle directory not found: ${ASSETS_DIR}. Please run 'pnpm build' first.`);
  process.exit(1);
}

const BUDGETS = [
  {
    name: 'Main App Bundle (index-*.js)',
    match: /^index-.*\.js$/,
    maxGzipKb: 300,
    maxRawKb: 1000
  },
  {
    name: 'Worker Thread Bundle (worker-*.js)',
    match: /^worker-.*\.js$/,
    maxRawKb: 250
  },
  {
    name: 'Stylesheet (index-*.css)',
    match: /^index-.*\.css$/,
    maxGzipKb: 25,
    maxRawKb: 100
  },
  {
    name: 'PDFium WebAssembly (pdfium-*.wasm)',
    match: /^pdfium-.*\.wasm$/,
    maxRawKb: 5500
  }
];

const files = fs.readdirSync(ASSETS_DIR);
const report = [];
let exceeded = false;

for (const budget of BUDGETS) {
  const matchedFile = files.find((f) => budget.match.test(f));
  if (!matchedFile) {
    report.push({
      Target: budget.name,
      File: 'NOT FOUND',
      'Raw (KB)': '-',
      'Gzip (KB)': '-',
      Budget: '-',
      Status: 'FAIL'
    });
    exceeded = true;
    continue;
  }

  const filePath = path.join(ASSETS_DIR, matchedFile);
  const content = fs.readFileSync(filePath);
  const rawKb = (content.length / 1024).toFixed(2);
  const gzipKb = (zlib.gzipSync(content).length / 1024).toFixed(2);

  let passed = true;
  let budgetDesc = '';

  if (budget.maxGzipKb) {
    budgetDesc += `Gzip <= ${budget.maxGzipKb} KB `;
    if (parseFloat(gzipKb) > budget.maxGzipKb) passed = false;
  }
  if (budget.maxRawKb) {
    budgetDesc += `Raw <= ${budget.maxRawKb} KB`;
    if (parseFloat(rawKb) > budget.maxRawKb) passed = false;
  }

  if (!passed) exceeded = true;

  report.push({
    Target: budget.name,
    File: matchedFile,
    'Raw (KB)': rawKb,
    'Gzip (KB)': gzipKb,
    Budget: budgetDesc.trim(),
    Status: passed ? 'PASS' : 'FAIL'
  });
}

console.log('\n=== Bundle Size Budget Report ===\n');
console.table(report);

if (exceeded) {
  console.error('\nBundle size budget check FAILED: One or more budgets were exceeded.\n');
  process.exit(1);
}

console.log('\nBundle size budget check PASSED: All assets are within target size budgets.\n');
process.exit(0);
