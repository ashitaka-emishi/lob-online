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
  woodedSloping: 'rgba(55,35,10,0.85)',
  unknown: 'rgba(150,150,150,0.3)',
};

/**
 * Road feature groups ordered from lowest to highest precedence (pike on top).
 * Each group specifies the types it represents, display color, stroke width,
 * an optional SVG dash pattern, and an optional outline color/width.
 * Bridge is a separate overlay rendered as a `][` glyph, not a line.
 */
export const ROAD_GROUPS = [
  {
    types: ['trail'],
    color: '#c89428',
    strokeWidth: 5,
    dash: '8,5',
    outlineColor: '#000',
    outlineWidth: 8,
  },
  { types: ['road'], color: '#c89428', strokeWidth: 6, outlineColor: '#000', outlineWidth: 9 },
  { types: ['pike'], color: '#ffffff', strokeWidth: 7, outlineColor: '#000', outlineWidth: 10 },
];

/** Road types that receive through-hex line rendering (excludes bridge which is a glyph). */
export const ROAD_LINE_TYPES = new Set(['trail', 'road', 'pike']);

/** Stream and stone wall feature groups. */
export const STREAM_WALL_GROUPS = [
  { types: ['stream'], color: '#4a90d9', strokeWidth: 4 },
  { types: ['stoneWall'], color: '#888888', strokeWidth: 3 },
];

/** Contour / slope feature groups ordered from lowest to highest severity. */
export const CONTOUR_GROUPS = [
  { types: ['elevation'], color: '#aaaaaa', strokeWidth: 2 },
  { types: ['slope'], color: '#444444', strokeWidth: 3 },
  { types: ['extremeSlope'], color: '#111111', strokeWidth: 5 },
  { types: ['verticalSlope'], color: '#cc0000', strokeWidth: 4 },
];

/** SVG glyph keys for ford and bridge point features. */
export const FORD_BRIDGE_SYMBOLS = {
  ford: 'perpendicular-ticks',
  bridge: 'bridge-glyph',
};
