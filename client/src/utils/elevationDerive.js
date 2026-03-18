/**
 * Pure helpers for auto-deriving hexside edge types and slope from wedgeElevations.
 * wedgeElevations[i] is the elevation offset at hexside i relative to the hex center.
 * Index i maps to direction DIRS[i] = ['N','NE','SE','S','SW','NW'][i].
 */

import { DIRS } from './hexGeometry.js';
const ELEVATION_EDGE_TYPES = new Set(['slope', 'extremeSlope', 'verticalSlope']);

/**
 * Derive the edge type string for a given absolute delta value.
 * delta = abs(wedgeElevations[i])
 * 0 → null (remove), 1 → 'slope', 2 → 'extremeSlope', ≥3 → 'verticalSlope'
 * @param {number} delta
 * @returns {string|null}
 */
function edgeTypeForDelta(delta) {
  if (delta === 0) return null;
  if (delta === 1) return 'slope';
  if (delta === 2) return 'extremeSlope';
  return 'verticalSlope';
}

/**
 * Derive slope index and hexside edge types from a hex's wedgeElevations.
 * Returns a new { slope, edges } — does not mutate the input.
 *
 * Slope: index of the wedge with the lowest value (most downhill hexside).
 * No change if all wedge values are equal.
 *
 * Edge types: derived from abs(wedgeElevations[i]) per SM_RULES 1.1.
 * Non-elevation edge features (road, stream, stoneWall, etc.) are preserved.
 *
 * @param {{ wedgeElevations?: number[], slope?: number|null, edges?: object }} hex
 * @returns {{ slope: number|null, edges: object }}
 */
export function deriveEdgesAndSlope(hex) {
  const wedges = hex.wedgeElevations ?? [0, 0, 0, 0, 0, 0];

  // Slope: index of minimum value; unchanged if all equal.
  // indexOf picks the first minimum (N before NE, etc.) — intentional game-rule tie-break.
  const minVal = Math.min(...wedges);
  const maxVal = Math.max(...wedges);
  const slope = minVal !== maxVal ? wedges.indexOf(minVal) : (hex.slope ?? null);

  // Edges: shallow-clone existing arrays, then apply delta rule per side
  const edges = {};
  if (hex.edges) {
    for (const [k, v] of Object.entries(hex.edges)) edges[k] = [...v];
  }

  for (let i = 0; i < 6; i++) {
    const dir = DIRS[i];
    const delta = Math.abs(wedges[i]);
    const nonElevFeatures = (edges[dir] ?? []).filter((f) => !ELEVATION_EDGE_TYPES.has(f.type));
    const derivedType = edgeTypeForDelta(delta);

    if (derivedType) {
      edges[dir] = [...nonElevFeatures, { type: derivedType }];
    } else if (nonElevFeatures.length > 0) {
      edges[dir] = nonElevFeatures;
    } else {
      delete edges[dir];
    }
  }

  return { slope, edges };
}
