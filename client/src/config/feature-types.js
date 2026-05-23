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
  orchard: 'rgba(144,238,100,0.8)',
  marsh: 'rgba(60,120,100,0.8)',
  slopingGround: 'rgba(139,100,60,0.8)',
  woodedSloping: 'rgba(55,35,10,0.85)',
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
    strokeWidth: 8,
    dash: '10,6',
    outlineColor: '#000',
    outlineWidth: 12,
  },
  { types: ['road'], color: '#c89428', strokeWidth: 10, outlineColor: '#000', outlineWidth: 14 },
  { types: ['pike'], color: '#ffffff', strokeWidth: 12, outlineColor: '#000', outlineWidth: 16 },
];

/** Road types that receive through-hex line rendering (excludes bridge which is a glyph). */
export const ROAD_LINE_TYPES = new Set(['trail', 'road', 'pike']);

/** Stream and stone wall feature groups. */
export const STREAM_WALL_GROUPS = [
  { types: ['stream'], color: '#4a90d9', strokeWidth: 6 },
  { types: ['stoneWall'], color: '#555555', strokeWidth: 5 },
];

/** Contour / slope feature groups ordered from lowest to highest severity. */
// verticalSlope uses red color for emphasis; stroke width need not be the maximum.
export const CONTOUR_GROUPS = [
  { types: ['elevation'], color: '#777777', strokeWidth: 3 },
  { types: ['slope'], color: '#444444', strokeWidth: 4 },
  { types: ['extremeSlope'], color: '#111111', strokeWidth: 6 },
  { types: ['verticalSlope'], color: '#cc0000', strokeWidth: 5 },
];

/** All contour type strings — mutually exclusive on any single edge. */
export const ALL_CONTOUR_TYPES = new Set(CONTOUR_GROUPS.flatMap((g) => g.types));

/** SVG glyph keys for ford and bridge point features. */
export const FORD_BRIDGE_SYMBOLS = {
  ford: 'perpendicular-ticks',
  bridge: 'bridge-glyph',
};

/**
 * Required edge features for overlay-glyph types that depend on a base feature.
 * Used by both panel components and the production onEdgeClick dispatch.
 */
export const EDGE_PREREQUISITES = {
  bridge: ['trail', 'road', 'pike'],
  ford: ['stream'],
};
