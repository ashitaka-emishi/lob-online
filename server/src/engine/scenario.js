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
 * startup; use `getScenario()` for cached access from route handlers.
 * Each call to this function reads from disk — no caching here.
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

// ─── Lazy cache (#393) ────────────────────────────────────────────────────────

let _cache = null;

/**
 * Return the default scenario, loading from disk on first call and caching the
 * result. Use this instead of calling loadScenario() directly from route handlers.
 *
 * @returns {import('zod').infer<typeof ScenarioSchema>} Validated, frozen scenario data.
 */
export function getScenario() {
  if (!_cache) _cache = loadScenario();
  return _cache;
}

/**
 * Invalidate the lazy scenario cache. The next getScenario() call re-reads from
 * disk. Called by the scenario editor after a successful save (#337).
 *
 * Also removes the default path from the loadScenario() call-count guard Set so
 * the subsequent reload does not emit a spurious console.warn about duplicate loads.
 */
export function clearScenarioCache() {
  // Reset the loadScenario call-count guard so the reload does not emit a warning.
  _loadedScenarioPaths.delete(DEFAULT_SCENARIO_PATH);
  _cache = null;
}
