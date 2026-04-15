/**
 * Scenario loader for the LOB v2.0 rules engine.
 *
 * Reads scenario.json from disk, validates it with the Zod schema, and returns
 * a frozen object that all engine modules consume. The path is configurable so
 * tests can inject a minimal fixture without touching the real data file.
 *
 * The `movementCosts` block is the authoritative digitization of the SM movement
 * chart and is never hardcoded in engine logic — all engine modules read it here.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { ScenarioSchema } from '../schemas/scenario.schema.js';
import { assertContainedPath } from '../utils/pathGuard.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Default path to scenario.json, relative to this file. */
const DEFAULT_SCENARIO_PATH = join(
  __dirname,
  '../../../data/scenarios/south-mountain/scenario.json'
);

// #293 — startup-only guard: warn if loadScenario() is called more than once per path.
const _loadedScenarioPaths = new Set();

/**
 * Load and validate scenario.json.
 *
 * Returns a frozen plain object. Engine modules should call this once at
 * startup and pass the result through as needed — no singleton or lazy-load
 * pattern is used so that test injection stays straightforward.
 *
 * @param {string} [scenarioPath] - Override the default path (for tests).
 * @returns {import('zod').infer<typeof ScenarioSchema>} Validated, frozen scenario data.
 * @throws {Error} If the file is missing, unreadable, or fails Zod validation.
 */
export function loadScenario(scenarioPath = DEFAULT_SCENARIO_PATH) {
  // LOB §startup — call once at server init; per-request calls are a misuse pattern (#293)
  if (_loadedScenarioPaths.has(scenarioPath)) {
    console.warn(
      `[scenario.js] loadScenario() called more than once for path "${scenarioPath}". ` +
        'Call once at startup and pass the result to engine functions.'
    );
  }
  _loadedScenarioPaths.add(scenarioPath);
  // Security (#284) — containment guard: resolve and verify before any file I/O
  assertContainedPath(scenarioPath, 'scenario.js');

  let raw;
  try {
    raw = readFileSync(scenarioPath, 'utf8');
  } catch (err) {
    throw new Error(`scenario.js: failed to read scenario file: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`scenario.js: failed to parse JSON: ${err.message}`);
  }

  const result = ScenarioSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`scenario.js: scenario.json failed schema validation:\n${issues}`);
  }

  return Object.freeze(result.data);
}
