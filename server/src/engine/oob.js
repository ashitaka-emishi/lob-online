import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { OOBSchema } from '../schemas/oob.schema.js';
import { LeadersSchema } from '../schemas/leaders.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Single-scenario hardcode: path is relative to this file's location (server/src/engine/).
// When multi-scenario support lands, replace with an ACTIVE_SCENARIO env var or paths.js util.
const DEFAULT_OOB_PATH = join(__dirname, '../../../data/modules/south-mountain/oob.json');
const DEFAULT_LEADERS_PATH = join(__dirname, '../../../data/modules/south-mountain/leaders.json');

/**
 * Load and validate oob.json. Reads and parses the file synchronously on each call.
 * Not cached — re-reads on every call so dev-mode edits via the OOB editor take effect
 * without restart. For production, consider a module-level cache if per-request latency matters.
 *
 * @param {string} [oobPath] - Override the default path (for tests).
 * @returns {import('zod').infer<typeof OOBSchema>} Validated OOB data.
 * @throws {Error} If the file is missing, unreadable, or fails Zod validation.
 */
export function loadOob(oobPath = DEFAULT_OOB_PATH) {
  const raw = readFileSync(oobPath, 'utf8');
  const parsed = JSON.parse(raw);
  return OOBSchema.parse(parsed);
}

/**
 * Load and validate leaders.json. Reads and parses the file synchronously on each call.
 * Not cached — re-reads on every call so dev-mode edits via the leaders editor take effect
 * without restart. For production, consider a module-level cache if per-request latency matters.
 *
 * @param {string} [leadersPath] - Override the default path (for tests).
 * @returns {import('zod').infer<typeof LeadersSchema>} Validated leaders data.
 * @throws {Error} If the file is missing, unreadable, or fails Zod validation.
 */
export function loadLeaders(leadersPath = DEFAULT_LEADERS_PATH) {
  const raw = readFileSync(leadersPath, 'utf8');
  const parsed = JSON.parse(raw);
  return LeadersSchema.parse(parsed);
}

/**
 * Build a flat map of unitId → { side, type, weapon, gunType } from a loaded OOB.
 * Used by handlers that need to resolve unit affiliation or weapon class from state unit IDs.
 *
 * LOB §5.5 — fire combat uses weapon type to determine range shifts and ammo-type shifts.
 *
 * @param {import('zod').infer<import('../schemas/oob.schema.js').OOBSchema>} oob
 * @returns {Map<string, { side: 'union'|'confederate', type: string, weapon: string|null, gunType: string|null }>}
 */
export function buildUnitSideMap(oob) {
  const map = new Map();

  function addUnit(unit, side) {
    map.set(unit.id, {
      side,
      type: unit.type ?? 'artillery',
      weapon: unit.weapon ?? null,
      gunType: unit.gunType ?? null,
    });
  }

  function walkBrigade(brigade, side) {
    for (const r of brigade.regiments ?? []) addUnit(r, side);
    for (const b of brigade.batteries ?? []) addUnit(b, side);
  }

  function walkArtilleryGroup(artGroup, side) {
    for (const group of Object.values(artGroup ?? {})) {
      for (const b of group.batteries ?? []) addUnit(b, side);
    }
  }

  function walkDivision(div, side) {
    for (const brig of div.brigades ?? []) walkBrigade(brig, side);
    walkArtilleryGroup(div.artillery, side);
    for (const b of div.batteries ?? []) addUnit(b, side);
  }

  // Union
  for (const corps of oob.union.corps ?? []) {
    for (const unit of corps.corpsUnits ?? []) addUnit(unit, 'union');
    walkArtilleryGroup(corps.artillery, 'union');
    for (const div of corps.divisions ?? []) walkDivision(div, 'union');
  }
  // Union cavalry
  for (const brig of oob.union.cavalryDivision?.brigades ?? []) walkBrigade(brig, 'union');
  walkArtilleryGroup(oob.union.cavalryDivision?.artillery, 'union');

  // Confederate
  for (const div of oob.confederate.divisions ?? []) walkDivision(div, 'confederate');
  for (const unit of oob.confederate.independent?.cavalry ?? []) addUnit(unit, 'confederate');
  for (const b of oob.confederate.independent?.artillery ?? []) addUnit(b, 'confederate');
  for (const b of oob.confederate.reserveArtillery?.batteries ?? []) addUnit(b, 'confederate');
  for (const brig of oob.confederate.independentBrigades ?? []) {
    for (const r of brig.regiments ?? []) addUnit(r, 'confederate');
    walkArtilleryGroup(brig.artillery, 'confederate');
  }

  return map;
}
