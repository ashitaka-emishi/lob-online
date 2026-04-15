/**
 * Movement cost calculator for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * All terrain and hexside cost data is read from `scenario.json` (loaded by
 * scenario.js). No movement costs are hardcoded here.
 *
 * Coordinate system: flat-top hexes, EVEN_Q offset (evenColUp: true).
 * Edge canonical ownership: faces 0 (N), 1 (NE), 2 (SE) are stored on each hex;
 * faces 3 (S), 4 (SW), 5 (NW) are stored on the neighbor as (dirIndex − 3).
 * See map.schema.js for the authoritative definition.
 */

import { ELEVATION_TYPES, ROUTE_TYPES } from '../schemas/map.schema.js';
import { dijkstra, hexNeighbors, OPPOSITE_DIR_INDEX, reconstructPath } from './hex.js';
import { buildHexIndex, loadMap } from './map.js';

// Re-export so callers that loaded map data via this module continue to work.
export { buildHexIndex, loadMap };

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Derive the elevation-based hexside type from a hex's wedgeElevations at a given
 * direction index.
 *
 * // SM §1.1 — Special Slope Rule: 50-ft contour interval defines slope categories.
 * // LOB — wedgeElevations[i] is the offset (in contour levels) at hexside i relative to hex center.
 *
 * @param {number[]|undefined} wedgeElevations - 6-element array (N=0 … NW=5)
 * @param {number} dirIdx - direction index into wedgeElevations (0–5)
 * @returns {'slope'|'extremeSlope'|'verticalSlope'|null}
 */
function deriveSlopeType(wedgeElevations, dirIdx) {
  if (!wedgeElevations) return null;
  const delta = Math.abs(wedgeElevations[dirIdx]);
  if (delta === 0) return null;
  if (delta === 1) return 'slope'; // SM §1.1
  if (delta === 2) return 'extremeSlope'; // SM §1.1
  return 'verticalSlope'; // SM §1.1 — impassable
}

/**
 * Return the edge features on the hexside shared between fromHex and toHex.
 *
 * Canonical ownership (see map.schema.js):
 *   dirIndex 0,1,2 (N,NE,SE) → stored in fromHex.edges[dirIndex]
 *   dirIndex 3,4,5 (S,SW,NW) → stored in toHex.edges[dirIndex - 3]
 *
 * Elevation-type features (slope, extremeSlope, verticalSlope) are derived from
 * toHex.wedgeElevations at the entering direction if not already present as explicit
 * edge features. Non-elevation features (road, stream, stoneWall, etc.) only come
 * from stored edge data.
 *
 * @param {object|undefined} fromHex - hex entry for fromHexId (may be undefined for OOB)
 * @param {object|undefined} toHex   - hex entry for toHexId
 * @param {number} dirIndex           - direction from fromHex to toHex (0=N … 5=NW)
 * @returns {Array<{type: string, movementModifier?: number}>}
 */
function getHexsideFeatures(fromHex, toHex, dirIndex) {
  let stored;
  // LOB — canonical face ownership: N/NE/SE stored on fromHex, S/SW/NW on toHex
  if (dirIndex < 3) {
    stored = fromHex?.edges?.[String(dirIndex)] ?? [];
  } else {
    stored = toHex?.edges?.[String(dirIndex - 3)] ?? [];
  }

  // Derive elevation features from wedgeElevations when not explicitly stored.
  // SM §1.1 — slope type is determined by the contour level offset at the hexside.
  const hasExplicitElevFeature = stored.some((f) => ELEVATION_TYPES.has(f.type));
  if (!hasExplicitElevFeature && toHex?.wedgeElevations) {
    const enterDirIdx = OPPOSITE_DIR_INDEX[dirIndex];
    const slopeType = deriveSlopeType(toHex.wedgeElevations, enterDirIdx);
    if (slopeType) {
      return [...stored, { type: slopeType }];
    }
  }

  return stored;
}

/**
 * Resolve the effective formation key for terrain/hexside cost table lookup.
 * 'horseArtillery' has no separate row; it uses 'mounted' costs.
 *
 * @param {string} formation
 * @returns {string}
 */
function resolveFormationKey(formation) {
  return formation === 'horseArtillery' ? 'mounted' : formation;
}

/**
 * Look up a terrain cost for the given terrain type and formation.
 * Returns null if the combination is prohibited (null in the table).
 * Returns the number cost, or the sentinel string 'ot'.
 *
 * // LOB §3 — terrain costs are read from scenario.movementCosts.terrainCosts
 *
 * @param {string} terrain
 * @param {string} formationKey - resolved formation key
 * @param {object} terrainCosts - scenario.movementCosts.terrainCosts
 * @returns {number|'ot'|null}
 */
function lookupTerrainCost(terrain, formationKey, terrainCosts) {
  const row = terrainCosts[terrain];
  if (!row) return null; // unknown terrain treated as prohibited
  const cost = row[formationKey];
  return cost === undefined ? null : cost;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the per-component MP cost breakdown for a single hex entry step.
 *
 * Returns { terrainCost, hexsideCost, total } where total = terrainCost + hexsideCost.
 * Impassable transitions return { terrainCost: Infinity, hexsideCost: 0, total: Infinity }.
 *
 * // LOB §3 — movement cost is terrain cost + hexside costs (additive)
 * // SM movement chart — authoritative values in scenario.movementCosts
 *
 * @param {string} fromHexId
 * @param {string} toHexId
 * @param {number} dirIndex   - direction from fromHexId to toHexId (0=N … 5=NW)
 * @param {string} formation  - 'line'|'column'|'mounted'|'limbered'|'horseArtillery'|'wagon'|'leader'
 * @param {object} scenario   - result of loadScenario()
 * @param {Map<string, object>} hexIndex - result of buildHexIndex()
 * @returns {{ terrainCost: number, hexsideCost: number, total: number }}
 */
function hexEntryCostBreakdown(
  fromHexId,
  toHexId,
  dirIndex,
  formation,
  scenario,
  hexIndex,
  noEffectSet = null
) {
  const IMPASSABLE = { terrainCost: Infinity, hexsideCost: 0, total: Infinity };

  const toHex = hexIndex.get(toHexId);
  const fromHex = hexIndex.get(fromHexId);

  // Unknown hex (not yet digitized) treated as impassable
  if (!toHex) return IMPASSABLE;

  const { terrainCosts, hexsideCosts, noEffectTerrain } = scenario.movementCosts;
  const formationKey = resolveFormationKey(formation);
  const terrain = toHex.terrain ?? 'unknown';

  // ── Step 1: Hexside features ──────────────────────────────────────────────
  const features = getHexsideFeatures(fromHex, toHex, dirIndex);

  // Check for verticalSlope — impassable to all units
  // SM §1.1 — Special Slope Rule: vertical slope hexsides are impassable
  if (features.some((f) => f.type === 'verticalSlope')) return IMPASSABLE;

  // Identify route features (road, pike, trail) on the crossing hexside
  // LOB §3 — road movement eligibility depends on formation and hexside feature type
  const routeFeature = features.find((f) => ROUTE_TYPES.has(f.type));

  // ── Step 2: Terrain cost ──────────────────────────────────────────────────
  let terrainCost;

  if (routeFeature) {
    // LOB §3 — when a route (road/pike/trail) hexside is present:
    //   column/mounted/limbered → use route cost from terrainCosts[routeType][formation]
    //   line → 'ot' (other terrain) → use base hex terrain cost
    const routeCostRaw = lookupTerrainCost(routeFeature.type, formationKey, terrainCosts);
    if (routeCostRaw === null) return IMPASSABLE; // prohibited on this route type

    if (routeCostRaw === 'ot') {
      // 'ot' — ignore the route; use the hex's base terrain cost
      terrainCost = lookupTerrainCost(terrain, formationKey, terrainCosts);
    } else {
      terrainCost = routeCostRaw; // e.g. 0.5 for column on road
    }
  } else {
    terrainCost = lookupTerrainCost(terrain, formationKey, terrainCosts);
  }

  // Null terrain cost = prohibited
  if (terrainCost === null || typeof terrainCost !== 'number') return IMPASSABLE;

  // ── Step 3: Hexside costs (additive) ─────────────────────────────────────
  // LOB §3 — hexside costs are ADDED to terrain cost (additive model)
  let hexsideTotal = 0;
  // LOB §3 — noEffectTerrain types (e.g. stoneWall) have zero hexside cost
  // noEffectSet is hoisted by callers in hot loops to avoid per-call Set construction
  const noEffect = noEffectSet ?? new Set(noEffectTerrain ?? []);
  const usingRoadMovement = routeFeature?.type === 'road';

  for (const feature of features) {
    // Routes are already handled in terrain cost above
    if (ROUTE_TYPES.has(feature.type)) continue;
    // No-effect terrain has zero cost
    if (noEffect.has(feature.type)) continue;
    // LOB — road movement replaces normal slope hexside costs with the road slope penalty
    // (Step 4 below). Pike and trail do NOT suppress normal slope costs.
    if (usingRoadMovement && ELEVATION_TYPES.has(feature.type)) continue;

    const costRow = hexsideCosts[feature.type];
    if (!costRow) continue; // no entry = no cost (e.g. ford, bridge)

    const featureCost = costRow[formationKey];
    if (featureCost === null) return IMPASSABLE; // prohibited hexside for this formation
    if (typeof featureCost === 'number') hexsideTotal += featureCost;
  }

  // ── Step 4: Road slope penalty (road only, not pike/trail) ───────────────
  // LOB — when moving along a road, slope hexside costs are replaced by this lighter penalty.
  // roadSlopePenalty keys: 'road' = penalty per 'slope' hexside, 'extremeSlope' = per extremeSlope.
  if (usingRoadMovement) {
    const penalty = scenario.movementCosts.roadSlopePenalty ?? {};
    for (const feature of features) {
      if (!ELEVATION_TYPES.has(feature.type)) continue; // only slope-type features
      // Map hexside type to penalty table key:
      //   'slope'       → penalty['road']        (regular road-slope penalty)
      //   'extremeSlope'→ penalty['extremeSlope'] (steep road-slope penalty)
      const penaltyKey = feature.type === 'slope' ? 'road' : feature.type;
      const p = penalty[penaltyKey];
      if (typeof p === 'number') hexsideTotal += p;
    }
  }

  return { terrainCost, hexsideCost: hexsideTotal, total: terrainCost + hexsideTotal };
}

/**
 * Compute the MP cost to move from fromHexId to toHexId (one step).
 * Returns Infinity for any prohibited transition.
 *
 * // LOB §3 — movement cost is terrain cost + hexside costs (additive)
 *
 * @param {string} fromHexId
 * @param {string} toHexId
 * @param {number} dirIndex
 * @param {string} formation
 * @param {object} scenario
 * @param {Map<string, object>} hexIndex
 * @returns {number} MP cost (may be Infinity if impassable)
 */
export function hexEntryCost(fromHexId, toHexId, dirIndex, formation, scenario, hexIndex) {
  // LOB — dirIndex must be 0–5 (N/NE/SE/S/SW/NW); out-of-range values silently
  // return wrong edge data from array lookups (#286)
  if (!Number.isInteger(dirIndex) || dirIndex < 0 || dirIndex > 5) {
    throw new RangeError(`hexEntryCost: dirIndex must be 0–5, got ${dirIndex}`);
  }
  return hexEntryCostBreakdown(fromHexId, toHexId, dirIndex, formation, scenario, hexIndex).total;
}

/**
 * Return the direction index from fromHexId to an adjacent toHexId, or 0 if not found.
 * Used by movementPath to recover per-step direction for cost breakdown.
 *
 * @param {string} fromHexId
 * @param {string} toHexId
 * @param {{ cols: number, rows: number }} gridSpec
 * @returns {number} dirIndex (0–5)
 */
function getDirectionBetween(fromHexId, toHexId, gridSpec) {
  for (const { hexId, dirIndex } of hexNeighbors(fromHexId, gridSpec)) {
    if (hexId === toHexId) return dirIndex;
  }
  // Should never reach here for valid adjacent hex pairs from a Dijkstra path.
  // Throw rather than silently returning 0 (a valid direction) to fail loudly.
  throw new Error(`getDirectionBetween: ${fromHexId} and ${toHexId} are not adjacent`);
}

// ─── Path finding ──────────────────────────────────────────────────────────────

/**
 * Find the lowest-MP-cost path between two hexes for a given unit formation.
 *
 * // LOB §3 — lowest-cost path is the legally optimal route for the unit
 *
 * @param {string} startHexId
 * @param {string} endHexId
 * @param {string} formation
 * @param {object} scenario          - result of loadScenario()
 * @param {object} mapData           - result of loadMap()
 * @param {Map<string, object>} [hexIndex] - pre-built hex index; built from mapData if omitted
 * @returns {{
 *   path: string[]|null,
 *   costs: Array<{hex: string, terrainCost: number, hexsideCost: number, total: number}>,
 *   totalCost: number,
 *   impassable: boolean
 * }}
 */
export function movementPath(startHexId, endHexId, formation, scenario, mapData, hexIndex = null) {
  const idx = hexIndex ?? buildHexIndex(mapData);
  const gridSpec = mapData.gridSpec;
  // Pre-build noEffectSet once — avoids per-hex Set construction in the hot Dijkstra loop
  const noEffectSet = new Set(scenario.movementCosts.noEffectTerrain ?? []);

  const costFn = (fromId, toId, dirIndex) =>
    hexEntryCostBreakdown(fromId, toId, dirIndex, formation, scenario, idx, noEffectSet).total;

  const { costs, prev } = dijkstra(startHexId, costFn, Infinity, gridSpec);

  const path = reconstructPath(endHexId, prev);
  if (!path) {
    return { path: null, costs: [], totalCost: Infinity, impassable: true };
  }

  // Build per-hex cost breakdown with terrain/hexside split (#288)
  // LOB §3 — breakdown separates terrain cost from hexside costs per step
  const breakdown = [];
  let running = 0;
  for (let i = 0; i < path.length; i++) {
    const hexId = path[i];
    if (i === 0) {
      breakdown.push({ hex: hexId, terrainCost: 0, hexsideCost: 0, total: 0 });
      continue;
    }
    const dirIndex = getDirectionBetween(path[i - 1], hexId, gridSpec);
    const detail = hexEntryCostBreakdown(
      path[i - 1],
      hexId,
      dirIndex,
      formation,
      scenario,
      idx,
      noEffectSet
    );
    running += detail.total;
    breakdown.push({
      hex: hexId,
      terrainCost: detail.terrainCost,
      hexsideCost: detail.hexsideCost,
      total: running,
    });
  }

  return {
    path,
    costs: breakdown,
    totalCost: costs.get(endHexId) ?? Infinity,
    impassable: false,
  };
}

// ─── Movement range ────────────────────────────────────────────────────────────

/**
 * Enumerate all hexes reachable by a unit from startHexId within its movement allowance.
 *
 * // LOB §3 — a unit may move to any hex reachable within its MP allowance
 *
 * @param {string} startHexId
 * @param {string} formation
 * @param {object} scenario          - result of loadScenario()
 * @param {object} mapData           - result of loadMap()
 * @param {Map<string, object>} [hexIndex] - pre-built hex index; built from mapData if omitted
 * @returns {Array<{hex: string, cost: number}>} sorted by cost ascending
 */
export function movementRange(startHexId, formation, scenario, mapData, hexIndex = null) {
  const idx = hexIndex ?? buildHexIndex(mapData);
  const gridSpec = mapData.gridSpec;
  const formationKey = resolveFormationKey(formation);

  // LOB §3 — movement allowance is determined by the unit's formation type
  const allowance =
    scenario.movementCosts.movementAllowances[formationKey] ??
    scenario.movementCosts.movementAllowances[formation] ??
    0;

  // Pre-build noEffectSet once — avoids per-hex Set construction in the hot Dijkstra loop
  const noEffectSet = new Set(scenario.movementCosts.noEffectTerrain ?? []);

  const costFn = (fromId, toId, dirIndex) =>
    hexEntryCostBreakdown(fromId, toId, dirIndex, formation, scenario, idx, noEffectSet).total;

  const { costs } = dijkstra(startHexId, costFn, allowance, gridSpec);

  const result = [];
  for (const [hexId, cost] of costs) {
    result.push({ hex: hexId, cost });
  }
  result.sort((a, b) => a.cost - b.cost);
  return result;
}
