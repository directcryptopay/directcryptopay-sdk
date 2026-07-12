#!/usr/bin/env node
/**
 * Reproducible-publish guard for @directcryptopay/sdk.
 *
 * Runs `npm pack --dry-run --json` and asserts that the tarball that WOULD be
 * published contains exactly the expected files and nothing sensitive or
 * development-only. Exits non-zero on any violation so it can gate CI before
 * `npm publish`. Does not publish anything.
 */
import { execSync } from 'node:child_process';

const EXPECTED = new Set([
  'package.json',
  'README.md',
  'LICENSE',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/dcp-sdk.umd.js',
  'dist/dcp.d.ts',
  'dist/types.d.ts',
  'dist/core/config.d.ts',
  'dist/core/iframe.d.ts',
]);

// Anything matching these must never ship in the package.
const FORBIDDEN = [
  /\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /(^|\/)secret/i,
  /\.tsbuildinfo$/i,
  /(^|\/)node_modules\//,
  /(^|\/)src\//,
  /(^|\/)test/i,
  /\.map$/i,
];

// --ignore-scripts avoids re-running the `prepack` build (whose stdout would
// otherwise be interleaved with the JSON). Build dist BEFORE calling this.
const raw = execSync('npm pack --dry-run --json --ignore-scripts', { encoding: 'utf8' });
const meta = JSON.parse(raw)[0];
const files = meta.files.map((f) => f.path.replace(/^package\//, ''));

let ok = true;
const report = [];

// 1. Forbidden files
for (const f of files) {
  if (FORBIDDEN.some((re) => re.test(f))) {
    ok = false;
    report.push(`FORBIDDEN file in tarball: ${f}`);
  }
}

// 2. Unexpected files
for (const f of files) {
  if (!EXPECTED.has(f)) {
    ok = false;
    report.push(`UNEXPECTED file in tarball: ${f}`);
  }
}

// 3. Missing expected files
for (const f of EXPECTED) {
  if (!files.includes(f)) {
    ok = false;
    report.push(`MISSING expected file: ${f}`);
  }
}

console.log(`Tarball: ${meta.filename}`);
console.log(`Files (${files.length}): ${files.sort().join(', ')}`);
if (report.length) {
  console.error('\nverify:pack FAILED');
  for (const r of report) console.error(' - ' + r);
} else {
  console.log('\nverify:pack PASSED — tarball is clean and reproducible.');
}
process.exit(ok ? 0 : 1);
