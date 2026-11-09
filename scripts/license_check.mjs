import { execSync } from 'child_process';

const ALLOWED_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'MPL-2.0',
  'BlueOak-1.0.0',
  'Python-2.0',
  'Zlib',
  'CC-BY-4.0',
  'Unlicense'
]);

const FORBIDDEN_PATTERNS = [/GPL/i, /AGPL/i, /SSPL/i, /Commons Clause/i];

console.log('Running automated license compliance check...');

let rawJson = '';
try {
  rawJson = execSync('pnpm licenses list --json', {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
} catch (err) {
  console.error('Failed to run pnpm licenses list:', err.message);
  process.exit(1);
}

const licenseMap = JSON.parse(rawJson);
const violations = [];
let totalPackages = 0;

for (const [license, packages] of Object.entries(licenseMap)) {
  for (const pkg of packages) {
    totalPackages++;
    const isForbidden = FORBIDDEN_PATTERNS.some((pat) => pat.test(license));
    const parts = license
      .replace(/[()]/g, '')
      .split(/\s+(?:AND|OR)\s+/i)
      .map((s) => s.trim());
    const isAllowed = ALLOWED_LICENSES.has(license) || parts.every((p) => ALLOWED_LICENSES.has(p));

    if (isForbidden || !isAllowed) {
      violations.push({ name: pkg.name, version: pkg.versions?.[0], license });
    }
  }
}

if (violations.length > 0) {
  console.error(`License check FAILED: Found ${violations.length} non-compliant packages:`);
  console.table(violations);
  process.exit(1);
}

console.log(
  `License check PASSED: All ${totalPackages} packages adhere to approved permissive licenses.`
);
process.exit(0);
