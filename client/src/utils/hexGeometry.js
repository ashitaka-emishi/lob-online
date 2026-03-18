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

/**
 * Return the nearest {hexId, dir} within `threshold` pixels, or null if none.
 * Iterates only the provided cells (use getCellAndNeighbors for spatial pre-filtering).
 *
 * @param {number} localX - cursor x in grid-local coordinates
 * @param {number} localY - cursor y in grid-local coordinates
 * @param {Array<{id:string, corners:Array<{x:number,y:number}>}>} cells
 * @param {number} [threshold=8] - maximum distance in pixels
 * @returns {{hexId:string, dir:string}|null}
 */
export function findNearestEdge(localX, localY, cells, threshold = 8) {
  let nearest = null;
  let nearestDist = threshold;
  for (const cell of cells) {
    for (const dir of DIRS) {
      const mid = edgeMidpoint(cell.corners, dir);
      const ddx = mid.x - localX;
      const ddy = mid.y - localY;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { hexId: cell.id, dir };
      }
    }
  }
  return nearest;
}

/**
 * Return the cell for `candidateHex` plus its valid neighbors, looked up via `cellByColRow`.
 * Reduces edge-search candidates from the full grid to at most 7 cells.
 *
 * Uses pure ODD_Q offset math (offset: -1, flat-top) — no honeycomb-grid API call needed.
 *
 * @param {{col:number, row:number}} candidateHex - object with col/row offset coordinates
 * @param {Map<string,object>} cellByColRow - Map keyed by "${col},${row}" → cell object
 * @returns {object[]} array of cell objects (0–7 items, no duplicates)
 */
export function getCellAndNeighbors(candidateHex, cellByColRow) {
  const { col, row } = candidateHex;
  const candidate = cellByColRow.get(`${col},${row}`);
  const result = candidate ? [candidate] : [];

  // ODD_Q offset neighbor deltas for flat-top hexes (honeycomb offset: -1)
  // Even columns shift diagonals up by 1 row; odd columns shift diagonals down.
  const isOdd = col & 1;
  const deltas = isOdd
    ? [
        [0, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
      ]
    : [
        [0, -1],
        [1, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [-1, -1],
      ];

  for (const [dc, dr] of deltas) {
    const nc = cellByColRow.get(`${col + dc},${row + dr}`);
    if (nc) result.push(nc);
  }
  return result;
}

/**
 * Convert a honeycomb-grid offset hex to a game hex ID string "CC.RR".
 * @param {{col:number, row:number}} hex - honeycomb-grid offset coordinates (0-based)
 * @param {number} gridRows - total number of rows in the grid
 * @returns {string} e.g. "01.03"
 */
export function hexToGameId(hex, gridRows) {
  const gameCol = hex.col + 1;
  const gameRow = gridRows - hex.row;
  return `${String(gameCol).padStart(2, '0')}.${String(gameRow).padStart(2, '0')}`;
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
