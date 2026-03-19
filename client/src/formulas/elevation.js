/**
 * Elevation palette generation and contour auto-detection.
 *
 * Reference (palette): Standard perceptual terrain color ramp (cartographic convention).
 * Reference (contour rules): Line of Battle v2.0 §1.1 (Slope and Elevation); South Mountain
 * special rules — slope grade defined by elevation level differences between adjacent hex centers.
 *
 * See docs/map-editor-design.md §15.
 */

/**
 * HSL keyframes for the elevation tint gradient.
 * Interpolated in sequence: light blue → green → tan → dark brown.
 */
const PALETTE_KEYFRAMES = [
  { pos: 0.0, h: 185, s: 50, l: 65 }, // light blue
  { pos: 0.3, h: 120, s: 45, l: 40 }, // green
  { pos: 0.65, h: 50, s: 45, l: 60 }, // tan
  { pos: 1.0, h: 25, s: 50, l: 30 }, // dark brown
];

/**
 * Linearly interpolates between two keyframe values.
 *
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Normalized position 0–1 within the segment.
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Returns a CSS `hsl(...)` color for a normalized position 0–1 along the elevation gradient.
 * Finds the surrounding keyframe pair and interpolates H, S, L linearly.
 *
 * @param {number} norm - Normalized position 0–1.
 * @returns {string} CSS color string, e.g. `hsl(120,45%,40%)`.
 */
function hslAtNorm(norm) {
  const clamped = Math.max(0, Math.min(1, norm));
  // Find surrounding keyframes
  let lo = PALETTE_KEYFRAMES[0];
  let hi = PALETTE_KEYFRAMES[PALETTE_KEYFRAMES.length - 1];
  for (let i = 0; i < PALETTE_KEYFRAMES.length - 1; i++) {
    if (clamped >= PALETTE_KEYFRAMES[i].pos && clamped <= PALETTE_KEYFRAMES[i + 1].pos) {
      lo = PALETTE_KEYFRAMES[i];
      hi = PALETTE_KEYFRAMES[i + 1];
      break;
    }
  }
  const segLen = hi.pos - lo.pos;
  const t = segLen === 0 ? 0 : (clamped - lo.pos) / segLen;
  const h = Math.round(lerp(lo.h, hi.h, t));
  const s = Math.round(lerp(lo.s, hi.s, t));
  const l = Math.round(lerp(lo.l, hi.l, t));
  return `hsl(${h},${s}%,${l}%)`;
}

/**
 * Generates an array of CSS color strings for each elevation level index.
 * Level 0 is light blue; the maximum level is dark brown.
 * Suitable for use as the `palette` argument to `tintForLevel`.
 *
 * @param {number} elevationLevels - Total number of distinct elevation levels (must be ≥ 1).
 * @returns {string[]} Array of `elevationLevels` CSS color strings.
 *
 * Used by: ElevationToolPanel.vue, ContourToolPanel.vue
 */
export function elevationTintPalette(elevationLevels) {
  if (elevationLevels === 1) {
    return [hslAtNorm(0)];
  }
  return Array.from({ length: elevationLevels }, (_, i) => hslAtNorm(i / (elevationLevels - 1)));
}

/**
 * Returns the CSS color string for a given integer level index.
 *
 * @param {number} level - Integer level index, 0 to `palette.length − 1`.
 * @param {string[]} palette - Color array from `elevationTintPalette`.
 * @returns {string|null} CSS color string, or null if level is out of range.
 *
 * Used by: ElevationToolPanel.vue, ContourToolPanel.vue
 */
export function tintForLevel(level, palette) {
  if (level < 0 || level >= palette.length) return null;
  return palette[level];
}

/**
 * Infers a contour edge type from the elevation level difference between two adjacent hexes.
 *
 * Rules (from Line of Battle v2.0 §1.1 and South Mountain special rules):
 *   diff = 0 → null (no contour)
 *   diff = 1 → 'elevation'
 *   diff = 2 → 'extremeSlope'
 *   diff ≥ 3 → 'verticalSlope'
 *
 * Note: 'slope' is not produced by auto-detection; it is set manually.
 *
 * @param {number} levelA - Elevation level of the first hex.
 * @param {number} levelB - Elevation level of the adjacent hex.
 * @returns {string|null} Contour type string, or null if no contour needed.
 *
 * Used by: ContourToolPanel.vue (auto-detect button)
 */
export function autoDetectContourType(levelA, levelB) {
  const diff = Math.abs(levelA - levelB);
  if (diff === 0) return null;
  if (diff === 1) return 'elevation';
  if (diff === 2) return 'extremeSlope';
  return 'verticalSlope';
}
