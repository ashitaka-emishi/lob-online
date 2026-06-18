/**
 * Retreat resolution — applies LOB §6.1 retreat rules to unit position.
 *
 * LOB §6.1 — retreating units move away from the combat hex toward their
 * friendly map edge. Units may not retreat through impassable hexsides.
 * If the primary retreat direction is blocked, the unit falls back to any
 * passable adjacent hex that takes it farther from the combat hex.
 *
 * ZOC note: full ZOC enforcement is deferred to M8. M7 retreat applies
 * positional movement only; ZOC entry is not validated here.
 */

import { hexNeighbors, hexNeighborInDir, OPPOSITE_DIR_INDEX, hexDistance } from './hex.js';
import { buildHexIndex } from './map.js';

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Determine whether moving from `fromHex` to `toHex` crosses an impassable hexside.
 *
 * SM §1.1 — vertical slopes are impassable. Unknown hexes (not digitized) are
 * also treated as impassable to be conservative.
 *
 * @param {string} fromHexId
 * @param {string} toHexId
 * @param {number} dirIndex - direction from fromHex to toHex
 * @param {Map<string, object>} hexIndex - keyed by hexId
 * @returns {boolean} true if the hexside is impassable
 */
function isHexsideImpassable(fromHexId, toHexId, dirIndex, hexIndex) {
  const toHex = hexIndex?.get(toHexId);
  if (!toHex) return true; // unknown hex — treat as impassable

  // SM §1.1 — derive slope type from entering hex's wedgeElevations
  const wedge = toHex.wedgeElevations;
  if (wedge) {
    const delta = Math.abs(wedge[dirIndex] ?? 0);
    if (delta >= 3) return true; // verticalSlope — impassable
  }

  // Check explicit edge features on the stored hexside
  const fromHex = hexIndex?.get(fromHexId);
  let edgeFeatures = [];
  if (dirIndex < 3) {
    edgeFeatures = fromHex?.edges?.[String(dirIndex)] ?? [];
  } else {
    edgeFeatures = toHex?.edges?.[String(dirIndex - 3)] ?? [];
  }

  return edgeFeatures.some((f) => f.type === 'verticalSlope');
}

/**
 * Find the direction index from `fromHex` toward `toHex` among the hex's neighbors.
 * Returns -1 if the hexes are not adjacent.
 *
 * @param {string} fromHexId
 * @param {string} toHexId
 * @param {{ cols: number, rows: number }} gridSpec
 * @returns {number} direction index (0–5), or -1 if not adjacent
 */
function directionToward(fromHexId, toHexId, gridSpec) {
  for (const { hexId, dirIndex } of hexNeighbors(fromHexId, gridSpec)) {
    if (hexId === toHexId) return dirIndex;
  }
  return -1;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the destination hex after a unit retreats `hexCount` hexes from
 * its current position, away from `combatHex`.
 *
 * LOB §6.1 — retreat direction is away from the combat hex (the enemy hex).
 * Each step tries the primary retreat direction first; if blocked (impassable
 * hexside or off-map), it falls back to any neighbor that increases distance
 * from the combat hex. If no valid neighbor exists the unit stays in place
 * (destroyed-in-place per §6.1 — handled by caller as surrender/elimination).
 *
 * @param {string} unitHex       - current hex of the retreating unit
 * @param {string} combatHex     - hex the unit is retreating FROM (the enemy hex)
 * @param {number} hexCount      - number of hexes to retreat (from morale table retreatHexes)
 * @param {object} mapData       - loaded map JSON ({ gridSpec, hexes })
 * @param {Map<string, object>}  [hexIndex] - optional prebuilt hex index (built internally if absent)
 * @returns {{ destHex: string, steps: string[], usedFallback: boolean }}
 *   destHex:      final hex after retreat
 *   steps:        ordered list of hexes visited (including start)
 *   usedFallback: true if any step required a fallback direction
 */
export function applyRetreat(unitHex, combatHex, hexCount, mapData, hexIndex = null) {
  if (!mapData?.gridSpec) {
    // No map data — cannot compute retreat; return unit-in-place
    return { destHex: unitHex, steps: [unitHex], usedFallback: false };
  }

  const gridSpec = mapData.gridSpec;
  const idx = hexIndex ?? buildHexIndex(mapData);

  let currentHex = unitHex;
  const steps = [currentHex];
  let usedFallback = false;

  for (let i = 0; i < hexCount; i++) {
    // LOB §6.1 — find the direction toward the enemy (combat hex)
    const towardDir = directionToward(currentHex, combatHex, gridSpec);

    // Primary retreat direction: opposite of toward-enemy
    // If the hexes are not adjacent (shouldn't happen for morale cascade in normal play,
    // but handle gracefully), pick the neighbor that maximises distance from combatHex.
    const primaryDir = towardDir >= 0 ? OPPOSITE_DIR_INDEX[towardDir] : -1;

    // Try primary direction first
    let moved = false;
    if (primaryDir >= 0) {
      const candidate = hexNeighborInDir(currentHex, primaryDir, gridSpec);
      if (candidate && !isHexsideImpassable(currentHex, candidate, primaryDir, idx)) {
        steps.push(candidate);
        currentHex = candidate;
        moved = true;
      }
    }

    // Fallback: any neighbor that increases distance from combatHex and is passable
    if (!moved) {
      const distFromEnemy = hexDistance(currentHex, combatHex, gridSpec);
      const candidates = hexNeighbors(currentHex, gridSpec)
        .filter(({ hexId, dirIndex }) => {
          if (isHexsideImpassable(currentHex, hexId, dirIndex, idx)) return false;
          // LOB §6.1 — fallback must at minimum not move toward the enemy
          return hexDistance(hexId, combatHex, gridSpec) >= distFromEnemy;
        })
        // Prefer the candidate farthest from the enemy hex
        .sort(
          (a, b) =>
            hexDistance(b.hexId, combatHex, gridSpec) - hexDistance(a.hexId, combatHex, gridSpec)
        );

      if (candidates.length > 0) {
        steps.push(candidates[0].hexId);
        currentHex = candidates[0].hexId;
        usedFallback = true;
      } else {
        // LOB §6.1 — no valid retreat hex; unit stays (caller treats as surrender/elimination)
        usedFallback = true;
        break;
      }
    }
  }

  return { destHex: currentHex, steps, usedFallback };
}
