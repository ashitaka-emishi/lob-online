// 12-position compass ring — same array as hexGeometry.js COMPASS_12.
// Even indices (0,2,4,6,8,10) = face midpoints: N, NE, SE, S, SW, NW.
// Odd indices (1,3,5,7,9,11) = vertex positions: NE, E, SE, SW, W, NW.
// When northOffset is odd (e.g. northOffset=3 for South Mountain), geographic
// north falls on a vertex, so face labels include 'E' and 'W'.
const COMPASS_12 = ['N', 'NE', 'NE', 'E', 'SE', 'SE', 'S', 'SW', 'SW', 'W', 'NW', 'NW'];

/**
 * Returns the compass label for a hex face given the grid's north offset.
 *
 * Uses the same formula as hexGeometry.getEdgeLabels so both functions
 * stay in sync. When northOffset is odd (north points to a vertex rather
 * than a face midpoint) the return value may be 'E' or 'W'.
 *
 * @param {number} faceIndex - Geometry-stable face index 0–5, clockwise from top face.
 * @param {number} northOffset - 12-position picker value (0–11) from gridSpec.
 * @returns {string} One of 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'.
 */
export function compassLabel(faceIndex, northOffset) {
  console.assert(
    Number.isInteger(faceIndex) && faceIndex >= 0 && faceIndex <= 5,
    `compassLabel: faceIndex must be 0–5, got ${faceIndex}`
  );
  console.assert(
    Number.isInteger(northOffset) && northOffset >= 0 && northOffset <= 11,
    `compassLabel: northOffset must be 0–11, got ${northOffset}`
  );
  return COMPASS_12[(((faceIndex * 2 - northOffset) % 12) + 12) % 12];
}
