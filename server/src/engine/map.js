/**
 * Map data loader for the LOB v2.0 rules engine.
 *
 * Provides loadMap() and buildHexIndex() as a shared utility so all engine
 * modules (movement, LOS, future combat resolution) consume the same loader
 * rather than each owning their own file I/O code.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { MapSchema } from '../schemas/map.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Default path to map.json, relative to this file. */
const DEFAULT_MAP_PATH = join(__dirname, '../../../data/scenarios/south-mountain/map.json');

// ─── Map loader ────────────────────────────────────────────────────────────────

/**
 * Load and validate map.json.
 * Returns a frozen plain object. Call once at startup; pass the result to engine functions.
 *
 * @param {string} [mapPath] - Override the default path (for tests).
 * @returns {import('zod').infer<typeof MapSchema>} Validated, frozen map data.
 * @throws {Error} If the file is missing, unreadable, or fails Zod validation.
 */
export function loadMap(mapPath = DEFAULT_MAP_PATH) {
  let raw;
  try {
    raw = readFileSync(mapPath, 'utf8');
  } catch (err) {
    throw new Error(`map.js: failed to read map file at "${mapPath}": ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`map.js: failed to parse JSON at "${mapPath}": ${err.message}`);
  }

  const result = MapSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`map.js: map.json failed schema validation:\n${issues}`);
  }

  return Object.freeze(result.data);
}

// ─── Hex index ─────────────────────────────────────────────────────────────────

/**
 * Build a Map<hexId, hexEntry> from loaded map data for O(1) lookup.
 * Call once after loadMap(); pass the result to hexEntryCost and friends.
 *
 * mapData.hexes is a z.array(HexEntry) — iterate directly, do not use Object.values().
 *
 * @param {object} mapData - result of loadMap()
 * @returns {Map<string, object>}
 */
export function buildHexIndex(mapData) {
  const index = new Map();
  for (const hex of mapData.hexes) {
    index.set(hex.hex, hex);
  }
  return index;
}
