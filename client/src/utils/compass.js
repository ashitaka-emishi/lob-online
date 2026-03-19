const SIX_LABELS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/**
 * Returns the compass label for a hex face given the grid's north offset.
 *
 * @param {number} faceIndex - Geometry-stable face index 0–5, clockwise from top face.
 * @param {number} northOffset - 12-position picker value (0–11) from gridSpec.
 * @returns {string} One of 'N', 'NE', 'SE', 'S', 'SW', 'NW'.
 */
export function compassLabel(faceIndex, northOffset) {
  return SIX_LABELS[Math.round(((faceIndex * 2 - northOffset + 12) % 12) / 2) % 6];
}
