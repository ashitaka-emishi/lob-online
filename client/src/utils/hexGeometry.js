/**
 * Pure geometry helpers for hex map rendering and coordinate math.
 * Assumes flat-top hexes with cube coordinate convention (ODD_Q offset, evenColUp: false).
 */

export const DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/**
 * Maps each compass direction to the [i, j] corner indices that form that edge.
 * For flat-top hexes (Orientation.FLAT), honeycomb-grid corners start at 0° (East/right)
 * and increment counterclockwise:
 *   0: East (right), 1: SE, 2: SW, 3: West (left), 4: NW, 5: NE
 *
 * Edge between consecutive corners:
 *   SE: [0,1], S: [1,2], SW: [2,3], NW: [3,4], N: [4,5], NE: [5,0]
 */
export const DIR_TO_CORNERS = {
  SE: [0, 1],
  S: [1, 2],
  SW: [2, 3],
  NW: [3, 4],
  N: [4, 5],
  NE: [5, 0],
};

/**
 * Return the midpoint {x, y} of the edge in direction `dir`.
 * @param {Array<{x:number,y:number}>} corners - 6 hex corners from honeycomb-grid
 * @param {string} dir - 'N'|'NE'|'SE'|'S'|'SW'|'NW'
 */
export function edgeMidpoint(corners, dir) {
  const [i, j] = DIR_TO_CORNERS[dir];
  const a = corners[i];
  const b = corners[j];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Return the 20%→80% line segment along the edge in direction `dir`.
 * @param {Array<{x:number,y:number}>} corners
 * @param {string} dir
 * @returns {{x1:number, y1:number, x2:number, y2:number}}
 */
export function edgeLine20_80(corners, dir) {
  const [i, j] = DIR_TO_CORNERS[dir];
  const a = corners[i];
  const b = corners[j];
  return {
    x1: a.x + (b.x - a.x) * 0.2,
    y1: a.y + (b.y - a.y) * 0.2,
    x2: a.x + (b.x - a.x) * 0.8,
    y2: a.y + (b.y - a.y) * 0.8,
  };
}

/**
 * Return 6 SVG polygon point strings, one per wedge (triangle from centre to each edge).
 * Each string is "cx,cy ax,ay bx,by" suitable for <polygon points="...">.
 * @param {Array<{x:number,y:number}>} corners - 6 hex corners
 * @param {{x:number,y:number}} centre - hex centre point
 * @returns {string[]} 6 point strings
 */
export function wedgePolygonPoints(corners, centre) {
  return corners.map((corner, i) => {
    const next = corners[(i + 1) % 6];
    return `${centre.x},${centre.y} ${corner.x},${corner.y} ${next.x},${next.y}`;
  });
}

/**
 * 12-point compass labels for the 12 30°-increment positions around a flat-top hex.
 * Even indices (0,2,4,6,8,10) = edge midpoints; odd indices (1,3,5,7,9,11) = vertices.
 * Going clockwise from position 0 (top / geometric-N edge):
 *   0:N  1:NE  2:NE  3:E  4:SE  5:SE  6:S  7:SW  8:SW  9:W  10:NW  11:NW
 */
const COMPASS_12 = ['N', 'NE', 'NE', 'E', 'SE', 'SE', 'S', 'SW', 'SW', 'W', 'NW', 'NW'];

/**
 * Return the 6 geographic edge labels for a flat-top hex given a northOffset.
 *
 * northOffset (0–11) encodes which of the 12 hex positions geographic north points toward.
 * 0 = top edge = N; 3 = right vertex = E (SM default, right vertex ≈ geographic N); etc.
 *
 * @param {number} northOffset - integer 0–11
 * @returns {string[]} 6-element array of cardinal/intercardinal strings, one per hex edge
 *   (edge 0 = geometric top/N, edge 1 = NE, …, edge 5 = NW, going clockwise)
 *
 * @example
 * getEdgeLabels(0)  // ['N','NE','SE','S','SW','NW']  — standard flat-top
 * getEdgeLabels(3)  // ['W','NW','NE','E','SE','SW']  — SM orientation
 * getEdgeLabels(6)  // ['S','SW','NW','N','NE','SE']  — south at top
 */
export function getEdgeLabels(northOffset) {
  return Array.from({ length: 6 }, (_, i) => COMPASS_12[(((i * 2 - northOffset) % 12) + 12) % 12]);
}

// Cube direction deltas for flat-top hexes (matching los.js convention)
const DIR_CUBE_DELTAS = {
  N: { dq: 0, dr: -1 },
  NE: { dq: 1, dr: -1 },
  SE: { dq: 1, dr: 0 },
  S: { dq: 0, dr: 1 },
  SW: { dq: -1, dr: 1 },
  NW: { dq: -1, dr: 0 },
};

/**
 * Return the hex ID of the neighbor in direction `dir` from `hexId`, or null if out of bounds.
 * Uses flat-top ODD_Q offset convention (evenColUp: false).
 *
 * @param {string} hexId - e.g. "03.03"
 * @param {string} dir - 'N'|'NE'|'SE'|'S'|'SW'|'NW'
 * @param {{rows:number, cols:number}} gridSpec
 * @returns {string|null}
 */
export function adjacentHexId(hexId, dir, gridSpec) {
  const delta = DIR_CUBE_DELTAS[dir];
  if (!delta) return null;

  const [colStr, rowStr] = hexId.split('.');
  const col = parseInt(colStr, 10);
  const row = parseInt(rowStr, 10);

  // Game col/row → cube coords (ODD_Q offset, evenColUp: false)
  const hcCol = col - 1;
  const hcRow = gridSpec.rows - row;
  const q = hcCol;
  const r = hcRow - Math.floor((hcCol - (hcCol & 1)) / 2);

  // Step
  const nq = q + delta.dq;
  const nr = r + delta.dr;

  // Cube → game col/row
  const nhcCol = nq;
  const nhcRow = nr + Math.floor((nq - (nq & 1)) / 2);
  const ncol = nhcCol + 1;
  const nrow = gridSpec.rows - nhcRow;

  // Bounds check
  if (ncol < 1 || ncol > gridSpec.cols || nrow < 1 || nrow > gridSpec.rows) return null;

  return `${String(ncol).padStart(2, '0')}.${String(nrow).padStart(2, '0')}`;
}
