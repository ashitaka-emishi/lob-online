/**
 * LOS (Line of Sight) engine for the LOB v2.0 rules — South Mountain scenario.
 *
 * Implements the Slope Table algorithm (LOB §4.0–4.2) with SM-specific terrain
 * height overrides. Key design principle: terrain height bonuses apply ONLY to
 * intermediate obstacle hexes — End Point (observer and target) heights are pure
 * ground elevation with no terrain bonus.
 *
 * Coordinate system: flat-top hexes, EVEN_Q offset (evenColUp: true).
 */

import { hexLine } from './hex.js';
import { buildHexIndex } from './map.js';

// ─── Terrain height constants ──────────────────────────────────────────────────

/**
 * Terrain LOS height bonus flag (1 = applies treeLosHeight; 0 = no bonus).
 *
 * LOB §4.0 / SM §1.4 — South Mountain scenario terrain height modifiers:
 *   woods, woodedSloping, orchard → treeLosHeight (SM override: +1 level, not +3)
 *   clear, slopingGround, marsh   → 0 (no bonus)
 *
 * Future terrain types (not yet in SM schema):
 *   town → +2 contour levels
 *   crest → +1 contour level
 */
const TERRAIN_LOS_HEIGHT_FLAG = {
  clear: 0,
  slopingGround: 0,
  woods: 1, // SM §1.4 — +treeLosHeight levels (SM: 1, standard LOB: 3)
  woodedSloping: 1, // SM §1.4 — same override
  orchard: 1, // SM §1.4 — same override
  marsh: 0,
  unknown: 0,
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Return the terrain LOS height bonus in contour levels.
 * Only applies to intermediate obstacle hexes — never to End Points.
 *
 * LOB §4.0 — terrain height bonus is applied only to intervening obstacles.
 * SM §1.4 — treeLosHeight = 1 for South Mountain (overrides standard LOB value of 3).
 *
 * @param {string} terrain
 * @param {number} treeLosHeight - scenario.rules.treeLosHeight (SM override: 1)
 * @returns {number}
 */
function terrainBonus(terrain, treeLosHeight) {
  const flag = TERRAIN_LOS_HEIGHT_FLAG[terrain] ?? 0;
  return flag > 0 ? treeLosHeight : 0;
}

/**
 * Return the ground height of a hex in contour levels (no terrain bonus).
 * Uses max(wedgeElevations, 0) to capture the highest hexside elevation.
 *
 * LOB §4.0 — the effective ground height of a hex for LOS is:
 *   elevation + max(0, max(wedgeElevations))
 * This ensures a hex with a raised hexside is treated at its maximum height.
 *
 * @param {object|undefined} hex - hex entry from map data, or undefined
 * @returns {number} height in contour levels
 */
function getGroundHeight(hex) {
  if (!hex) return 0;
  const elev = hex.elevation ?? 0;
  if (!hex.wedgeElevations) return elev;
  const maxWedge = Math.max(0, ...hex.wedgeElevations);
  return elev + maxWedge;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute LOS between two hexes using the LOB v2.0 Slope Table algorithm.
 *
 * LOB §4.0 — LOS algorithm: draw a straight line between observer and target;
 * LOS is blocked if any intervening hex's effective height exceeds the LOS line.
 *
 * End Point height rule (LOB §4.0): observer and target heights are pure ground
 * elevation — no terrain bonus is applied to either End Point.
 *
 * @param {string} fromHexId - observer hex ID, e.g. "19.23"
 * @param {string} toHexId   - target hex ID, e.g. "24.18"
 * @param {object} mapData   - result of loadMap()
 * @param {object} scenario  - result of loadScenario()
 * @param {Map<string, object>} [hexIndex] - pre-built hex index; built from mapData if omitted
 * @returns {{
 *   canSee: boolean,
 *   blockedBy: { hex: string, reason: string } | null,
 *   trace: string[]
 * }}
 */
export function computeLOS(fromHexId, toHexId, mapData, scenario, hexIndex = null) {
  // LOB §4.0 — a unit can always see its own hex
  if (fromHexId === toHexId) {
    return { canSee: true, blockedBy: null, trace: [fromHexId] };
  }

  const gridSpec = mapData.gridSpec;

  // SM §1.4 — treeLosHeight: South Mountain overrides standard LOB +3 with +1
  const treeLosHeight = scenario.rules?.treeLosHeight ?? 1;

  // Build hex index for O(1) lookup (caller may supply a pre-built index for efficiency)
  const idx = hexIndex ?? buildHexIndex(mapData);

  const trace = hexLine(fromHexId, toHexId, gridSpec);
  const n = trace.length;

  // LOB §4.2a — adjacent hexes (range 1) always have clear LOS regardless of terrain
  if (n <= 2) {
    return { canSee: true, blockedBy: null, trace };
  }

  // End Point heights: ground elevation only, no terrain bonus (LOB §4.0)
  const fromHex = idx.get(fromHexId);
  const toHex = idx.get(toHexId);
  const observerHeight = getGroundHeight(fromHex);
  const targetHeight = getGroundHeight(toHex);

  // Check each intermediate hex for LOS blockage
  for (let i = 1; i < n - 1; i++) {
    const hexId = trace[i];
    const hex = idx.get(hexId);
    const terrain = hex?.terrain ?? 'unknown';

    // t = 0 at observer, t = 1 at target
    const t = i / (n - 1);

    // LOB §4.1 — Slope Table: LOS line height at this point along the trace
    const losLineHeight = observerHeight + (targetHeight - observerHeight) * t;

    // Ground height of the intervening hex (uses max wedgeElevation if present)
    const groundHeight = getGroundHeight(hex);

    // Terrain height bonus for intermediate obstacles only (LOB §4.0)
    let bonus = terrainBonus(terrain, treeLosHeight);

    // SM §1.4 — orchard first-hex rule: the first orchard hex immediately adjacent to
    // the observer does not provide its terrain height bonus. This prevents orchards
    // from blocking the firing unit's own LOS out of an orchard position.
    if (i === 1 && terrain === 'orchard') {
      bonus = 0;
    }

    const effectiveHeight = groundHeight + bonus;

    // LOB §4.1 — blocked when effective height strictly exceeds the LOS line.
    // LOB §4.2c — Same Hill rule: strictly greater (not ≥) so a hex at the same
    // contour level as the LOS line does not block — units on the same hill see
    // each other freely.
    // LOB §4.2b — Sudden Dips: a hex lower than both End Points never blocks
    // (handled naturally: its effective height won't exceed the LOS line).
    if (effectiveHeight > losLineHeight) {
      return {
        canSee: false,
        blockedBy: {
          hex: hexId,
          reason: `terrain height ${effectiveHeight} (ground ${groundHeight} + bonus ${bonus}) > LOS line ${losLineHeight.toFixed(2)} at step ${i}/${n - 1}`,
        },
        trace,
      };
    }
  }

  return { canSee: true, blockedBy: null, trace };
}
