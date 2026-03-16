/**
 * Verify E2E code coverage meets the minimum threshold on the four target files.
 *
 * Reads coverage/coverage-summary.json produced by @cypress/code-coverage and
 * checks that each target file's line coverage percentage is >= THRESHOLD.
 * Exits with code 1 if any file is below the threshold or missing from the report.
 *
 * Usage: node scripts/check-e2e-coverage.js
 */

import { readFileSync, existsSync } from 'fs';

const THRESHOLD = 50;
const SUMMARY_PATH = 'coverage/coverage-summary.json';

const TARGET_FILES = [
  'client/src/views/tools/MapEditorView.vue',
  'client/src/views/tools/ScenarioEditorView.vue',
  'server/src/routes/mapEditor.js',
  'server/src/routes/scenarioEditor.js',
];

if (!existsSync(SUMMARY_PATH)) {
  console.error(`ERROR: ${SUMMARY_PATH} not found. Run 'npm run test:e2e:coverage' first.`);
  process.exit(1);
}

const summary = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'));
const entries = Object.entries(summary);

let failed = false;

for (const target of TARGET_FILES) {
  const entry = entries.find(([k]) => k.replace(/\\/g, '/').endsWith(target));
  if (!entry) {
    console.error(`MISSING  ${target} — not found in coverage report`);
    failed = true;
    continue;
  }
  const pct = entry[1].lines.pct;
  if (pct < THRESHOLD) {
    console.error(`FAIL     ${target}: ${pct}% lines (threshold: ${THRESHOLD}%)`);
    failed = true;
  } else {
    console.log(`PASS     ${target}: ${pct}% lines`);
  }
}

process.exit(failed ? 1 : 0);
