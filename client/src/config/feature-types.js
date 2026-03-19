/**
 * Single source of truth for all feature type strings and their display properties.
 * Both tool chooser items and overlay `featureGroups` import from here —
 * colors and styles are defined once.
 *
 * See docs/map-editor-design.md §15 for the full spec.
 */

/** Terrain fill colors at 80% opacity. `null` means no fill (transparent). */
export const TERRAIN_COLORS = {
  clear: null,
  woods: 'rgba(34,85,34,0.8)',
  orchards: 'rgba(100,160,60,0.8)',
  marsh: 'rgba(60,120,100,0.8)',
  slopingGround: 'rgba(139,100,60,0.8)',
  woodedSloping: 'rgba(80,110,50,0.8)',
  unknown: 'rgba(150,150,150,0.3)',
};

/**
 * Road feature groups ordered from lowest to highest precedence (pike on top).
 * Each group specifies the types it represents, display color, stroke width,
 * and an optional SVG dash pattern.
 */
export const ROAD_GROUPS = [
  { types: ['trail'], color: '#8B6914', strokeWidth: 1.5, dash: '4,3' },
  { types: ['road'], color: '#8B6914', strokeWidth: 2 },
  { types: ['pike'], color: '#ffffff', strokeWidth: 2.5 },
];

/** Stream and stone wall feature groups. */
export const STREAM_WALL_GROUPS = [
  { types: ['stream'], color: '#4a90d9', strokeWidth: 2 },
  { types: ['stoneWall'], color: '#555555', strokeWidth: 2 },
];

/** Contour / slope feature groups ordered from lowest to highest severity. */
export const CONTOUR_GROUPS = [
  { types: ['elevation'], color: '#888888', strokeWidth: 1 },
  { types: ['slope'], color: '#222222', strokeWidth: 2 },
  { types: ['extremeSlope'], color: '#000000', strokeWidth: 3.5 },
  { types: ['verticalSlope'], color: '#cc0000', strokeWidth: 2.5 },
];

/** SVG glyph keys for ford and bridge point features. */
export const FORD_BRIDGE_SYMBOLS = {
  ford: 'perpendicular-ticks',
  bridge: 'bridge-glyph',
};
