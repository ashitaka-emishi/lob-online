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

/**
 * Build a flat map of leaderId → side from a loaded leaders data structure.
 * LOB §10.3 — initiative rolls are limited to the active player's own leaders.
 *
 * @param {import('zod').infer<typeof LeadersSchema>} leaders
 * @returns {Map<string, 'union'|'confederate'>}
 */
export function buildLeaderSideMap(leaders) {
  const map = new Map();
  const unionGroups = ['army', 'corps', 'cavalry', 'divisions', 'brigades'];
  for (const group of unionGroups) {
    for (const leader of leaders.union[group] ?? []) map.set(leader.id, 'union');
  }
  const confGroups = ['wing', 'divisions', 'brigades'];
  for (const group of confGroups) {
    for (const leader of leaders.confederate[group] ?? []) map.set(leader.id, 'confederate');
  }
  return map;
}

/**
 * Walk the OOB tree and return the unit object with matching id.
 * LOB §5.3 — needed to look up printed strengthPoints for SP computation.
 * LOB §6.1 — needed to look up morale rating for each unit being checked.
 * LOB §7.0d — needed to resolve attacker morale rating for Closing Roll threshold.
 *
 * @param {object} oob - validated OOB data
 * @param {string} unitId
 * @returns {object|null}
 */
export function findOobUnit(oob, unitId) {
  function searchList(list) {
    for (const item of list ?? []) {
      if (item.id === unitId) return item;
    }
    return null;
  }

  function searchBrigade(brigade) {
    return searchList(brigade.regiments) ?? searchList(brigade.batteries);
  }

  function searchArtilleryGroup(artGroup) {
    for (const group of Object.values(artGroup ?? {})) {
      const found = searchList(group.batteries);
      if (found) return found;
    }
    return null;
  }

  function searchDivision(div) {
    for (const brig of div.brigades ?? []) {
      const found = searchBrigade(brig);
      if (found) return found;
    }
    return searchArtilleryGroup(div.artillery) ?? searchList(div.batteries);
  }

  // Union
  for (const corps of oob.union.corps ?? []) {
    const found =
      searchList(corps.corpsUnits) ??
      searchArtilleryGroup(corps.artillery) ??
      corps.divisions?.reduce((acc, d) => acc ?? searchDivision(d), null);
    if (found) return found;
  }
  const cavFound =
    oob.union.cavalryDivision?.brigades?.reduce((acc, b) => acc ?? searchBrigade(b), null) ??
    searchArtilleryGroup(oob.union.cavalryDivision?.artillery);
  if (cavFound) return cavFound;

  // Confederate
  for (const div of oob.confederate.divisions ?? []) {
    const found = searchDivision(div);
    if (found) return found;
  }
  const indFound =
    searchList(oob.confederate.independent?.cavalry) ??
    searchList(oob.confederate.independent?.artillery) ??
    searchList(oob.confederate.reserveArtillery?.batteries);
  if (indFound) return indFound;

  for (const brig of oob.confederate.independentBrigades ?? []) {
    const found = searchList(brig.regiments) ?? searchArtilleryGroup(brig.artillery);
    if (found) return found;
  }

  return null;
}
