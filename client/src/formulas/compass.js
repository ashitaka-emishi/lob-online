/**
 * Converts geometry face indices to compass labels given northOffset.
 *
 * The 12-step ring (0–11, 30° each) allows north to fall between hex faces
 * for non-axis-aligned maps like South Mountain.
 *
 * See docs/map-editor-design.md §5, §15.
 */

const SIX_LABELS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/**
 * Returns the compass label for a hex face given the grid's north offset.
 *
 * Formula: `SIX_LABELS[Math.round(((faceIndex*2 − northOffset + 12) % 12) / 2) % 6]`
 *
 * @param {number} faceIndex - Geometry-stable face index 0–5, clockwise from top face.
 * @param {number} northOffset - 12-position picker value (0–11) from gridSpec.
 * @returns {string} One of 'N', 'NE', 'SE', 'S', 'SW', 'NW'.
 */
export function compassLabel(faceIndex, northOffset) {
  return SIX_LABELS[Math.round(((faceIndex * 2 - northOffset + 12) % 12) / 2) % 6];
}

/**
 * Returns the face index (0–5) whose label is 'N' given northOffset.
 *
 * Formula: `Math.round(northOffset / 2) % 6`
 *
 * @param {number} northOffset - 12-position picker value (0–11).
 * @returns {number} Face index 0–5.
 */
export function faceIndexForNorth(northOffset) {
  return Math.round(northOffset / 2) % 6;
}

/**
 * Returns an array of 6 compass labels indexed by face 0–5.
 * Wrapper over `compassLabel`.
 *
 * @param {number} northOffset - 12-position picker value (0–11).
 * @returns {string[]} 6-element array of compass label strings.
 */
export function allFaceLabels(northOffset) {
  return Array.from({ length: 6 }, (_, i) => compassLabel(i, northOffset));
}
