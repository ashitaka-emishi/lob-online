const SIX_LABELS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/**
 * Returns the compass label for a hex face given the grid's north offset.
 *
 * @param {number} faceIndex - Geometry-stable face index 0–5, clockwise from top face.
 * @param {number} northOffset - 12-position picker value (0–11) from gridSpec.
 * @returns {string} One of 'N', 'NE', 'SE', 'S', 'SW', 'NW'.
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
  return SIX_LABELS[Math.round(((faceIndex * 2 - northOffset + 12) % 12) / 2) % 6];
}
