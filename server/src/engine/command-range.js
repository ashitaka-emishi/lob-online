/**
 * Command range module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Classifies all map hexes into three command zones relative to a commander's HQ:
 *   withinRadius    — reachable within the commander's MP radius (leader movement costs)
 *   beyondRadius    — beyond MP radius, cube distance < 50 hexes
 *   beyondRadiusFar — beyond MP radius, cube distance ≥ 50 hexes
 *
 * LOB §10.6a — command radius is traced as MP path cost using leader movement costs,
 *              not plain hex distance.
 * SM §1.1a   — road slope penalty is waived when tracing command radius along a Road.
 * LOB §10.6a — beyondRadiusFar threshold: ≥50 hexes (cube distance) between HQs.
 */

import { hexDistance } from './hex.js';
import { buildHexIndex } from './map.js';
import { movementRange } from './movement.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Command radius in Movement Points per commander level.
 * LOB §10.6a — command radius by level: brigade=3 MP, division=6 MP, corps=8 MP, army=12 MP.
 */
export const COMMAND_RADII = Object.freeze({
  brigade: 3,
  division: 6,
  corps: 8,
  army: 12,
});

/**
 * Cube-distance threshold that separates beyondRadius from beyondRadiusFar.
 * LOB §10.6a — beyondRadiusFar: beyond command radius AND ≥50 hexes (cube distance) between HQs.
 */
export const BEYOND_RADIUS_FAR_THRESHOLD = 50;

// ─── commandRange ─────────────────────────────────────────────────────────────

/**
 * Classify all hexes in mapData into three command zones from a commander's HQ hex.
 *
 * LOB §10.6a — command radius is traced as an MP path using leader movement costs.
 * SM §1.1a   — road slope penalty waived when tracing command radius along a Road.
 *
 * @param {string} fromHexId - commander's HQ hex in col.row format (e.g. '19.23')
 * @param {'brigade'|'division'|'corps'|'army'} commanderLevel
 * @param {object} mapData - result of loadMap()
 * @param {object} scenario - result of loadScenario()
 * @param {Map|null} [hexIndex=null] - optional pre-built hex index; built internally if omitted
 * @returns {{
 *   withinRadius: string[],
 *   beyondRadius: string[],
 *   beyondRadiusFar: string[]
 * }}
 */
export function commandRange(fromHexId, commanderLevel, mapData, scenario, hexIndex = null) {
  const radius = COMMAND_RADII[commanderLevel];
  if (radius === undefined) {
    throw new Error(
      `Unknown commander level: "${commanderLevel}". Valid: ${Object.keys(COMMAND_RADII).join(', ')}`
    );
  }

  // SM §1.1a — slope penalty waived when tracing command radius along a Road.
  // Build a modified scenario that zeroes out the roadSlopePenalty so movementRange
  // uses road-only rate (0.5 MP) without adding the per-slope-hexside penalty.
  const scenarioForRadius = {
    ...scenario,
    movementCosts: {
      ...scenario.movementCosts,
      roadSlopePenalty: {}, // SM §1.1a — no slope penalty for command radius tracing on road
    },
  };

  // LOB §10.6a — use leader formation; leader MA = 12 MP (covers all radius values).
  // movementRange returns all hexes reachable within the leader's MA, each with cost.
  // Use caller-provided hexIndex when available to avoid redundant rebuilds.
  const idx = hexIndex ?? buildHexIndex(mapData);
  const reachable = movementRange(fromHexId, 'leader', scenarioForRadius, mapData, idx);

  // Hexes with cost ≤ radius are within command radius.
  const withinRadius = [];
  const withinSet = new Set();
  for (const { hex, cost } of reachable) {
    if (cost <= radius) {
      withinRadius.push(hex);
      withinSet.add(hex);
    }
  }

  // All remaining map hexes are classified by cube distance.
  // LOB §10.6a — beyondRadiusFar: cube distance ≥ BEYOND_RADIUS_FAR_THRESHOLD.
  const { gridSpec } = mapData;
  const beyondRadius = [];
  const beyondRadiusFar = [];

  for (const hexEntry of mapData.hexes) {
    const hexId = hexEntry.hex;
    // Origin hex is classified as withinRadius (movementRange returns it at cost 0).
    if (withinSet.has(hexId)) continue;

    const dist = hexDistance(fromHexId, hexId, gridSpec);
    if (dist < BEYOND_RADIUS_FAR_THRESHOLD) {
      beyondRadius.push(hexId);
    } else {
      beyondRadiusFar.push(hexId); // LOB §10.6a — ≥50 hex distance from HQ
    }
  }

  return { withinRadius, beyondRadius, beyondRadiusFar };
}
