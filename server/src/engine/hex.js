/**
 * Hex coordinate utilities for the LOB v2.0 rules engine.
 *
 * Coordinate system: flat-top hexagons, EVEN_Q offset convention
 * (evenColUp: true → honeycomb-grid offset: +1).
 * Game IDs are "CC.RR" strings (1-indexed col, 1-indexed row from bottom).
 *
 * Direction index mapping (matches wedgeElevations array order in map.json):
 *   0 = N, 1 = NE, 2 = SE, 3 = S, 4 = SW, 5 = NW
 *
 * Edge canonical ownership: only faces 0 (N), 1 (NE), 2 (SE) are stored on
 * each hex. Faces 3 (S), 4 (SW), 5 (NW) are stored on the neighbor hex as
 * face (dirIndex − 3). See map.schema.js for the authoritative definition.
 */

// LOB — hex geometry and coordinate system (flat-top EVEN_Q offset, general LOB map convention)

/** Direction names in canonical order (index matches wedgeElevations). */
export const DIR_NAMES = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/** Opposite direction for each direction index. */
export const OPPOSITE_DIR_INDEX = [3, 4, 5, 0, 1, 2];

/**
 * Cube coordinate deltas for each direction index (flat-top hexes).
 * Index matches DIR_NAMES: 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW.
 */
export const DIR_CUBE_DELTAS = [
  { dq: 0, dr: -1 }, // 0: N
  { dq: 1, dr: -1 }, // 1: NE
  { dq: 1, dr: 0 }, // 2: SE
  { dq: 0, dr: 1 }, // 3: S
  { dq: -1, dr: 1 }, // 4: SW
  { dq: -1, dr: 0 }, // 5: NW
];

// ─── ID parsing ────────────────────────────────────────────────────────────────

/**
 * Parse a game hex ID into col/row integers.
 * @param {string} hexId - e.g. "19.23"
 * @returns {{ col: number, row: number }}
 */
export function parseHexId(hexId) {
  // LOB — hex IDs are "CC.RR" strings (1-indexed col.row, general LOB map convention)
  if (typeof hexId !== 'string' || hexId.length === 0) {
    throw new TypeError('hexId must be a non-empty string');
  }
  const parts = hexId.split('.');
  const col = Number(parts[0]);
  const row = Number(parts[1]);
  if (parts.length !== 2 || !Number.isInteger(col) || !Number.isInteger(row)) {
    throw new TypeError('hexId must be a non-empty string');
  }
  return { col, row };
}

/**
 * Format 1-based col/row integers into a zero-padded hex ID string.
 * Single source of truth for the hex ID format.
 * @param {number} col - 1-based column
 * @param {number} row - 1-based row
 * @returns {string} e.g. "01.03"
 */
export function formatHexId(col, row) {
  return `${String(col).padStart(2, '0')}.${String(row).padStart(2, '0')}`;
}

// ─── Coordinate conversions ────────────────────────────────────────────────────

/**
 * Convert game col/row to cube coordinates.
 * Flat-top EVEN_Q offset (evenColUp: true, honeycomb-grid offset: +1).
 *
 * @param {number} col - 1-based game column
 * @param {number} row - 1-based game row (row 1 = bottom of map)
 * @param {{ rows: number }} gridSpec
 * @returns {{ q: number, r: number, s: number }}
 */
export function colRowToCube(col, row, gridSpec) {
  const hcCol = col - 1;
  const hcRow = gridSpec.rows - row;
  const q = hcCol;
  const r = hcRow - Math.floor((hcCol + (hcCol & 1)) / 2);
  const s = -q - r;
  return { q, r, s };
}

/**
 * Convert cube coordinates back to game col/row.
 * Inverse of colRowToCube.
 *
 * @param {{ q: number, r: number }} cube
 * @param {{ rows: number }} gridSpec
 * @returns {{ col: number, row: number }}
 */
export function cubeToColRow(cube, gridSpec) {
  const { q, r } = cube;
  const hcCol = q;
  const hcRow = r + Math.floor((q + (q & 1)) / 2);
  const col = hcCol + 1;
  const row = gridSpec.rows - hcRow;
  return { col, row };
}

/**
 * Round fractional cube coordinates to the nearest integer cube hex.
 * Uses the "largest component correction" method to maintain q+r+s=0.
 *
 * @param {{ q: number, r: number, s: number }} frac
 * @returns {{ q: number, r: number, s: number }}
 */
export function cubeRound(frac) {
  let q = Math.round(frac.q);
  let r = Math.round(frac.r);
  let s = Math.round(frac.s);
  const dq = Math.abs(q - frac.q);
  const dr = Math.abs(r - frac.r);
  const ds = Math.abs(s - frac.s);
  if (dq > dr && dq > ds) {
    q = -r - s;
  } else if (dr > ds) {
    r = -q - s;
  } else {
    s = -q - r;
  }
  return { q, r, s };
}

// ─── Neighbor lookup ───────────────────────────────────────────────────────────

/**
 * Return all valid neighbors of a hex as { hexId, dirIndex } objects.
 * Out-of-bounds neighbors are omitted.
 *
 * @param {string} hexId
 * @param {{ cols: number, rows: number }} gridSpec
 * @returns {Array<{ hexId: string, dirIndex: number }>}
 */
export function hexNeighbors(hexId, gridSpec) {
  const { col, row } = parseHexId(hexId);
  const cube = colRowToCube(col, row, gridSpec);
  const neighbors = [];

  for (let i = 0; i < 6; i++) {
    const { dq, dr } = DIR_CUBE_DELTAS[i];
    const nq = cube.q + dq;
    const nr = cube.r + dr;
    const { col: nc, row: nr2 } = cubeToColRow({ q: nq, r: nr }, gridSpec);
    if (nc >= 1 && nc <= gridSpec.cols && nr2 >= 1 && nr2 <= gridSpec.rows) {
      neighbors.push({ hexId: formatHexId(nc, nr2), dirIndex: i });
    }
  }

  return neighbors;
}

/**
 * Return the hex ID of the single neighbor in a given direction, or null if out of bounds.
 *
 * @param {string} hexId
 * @param {number} dirIndex - 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW
 * @param {{ cols: number, rows: number }} gridSpec
 * @returns {string | null}
 */
export function hexNeighborInDir(hexId, dirIndex, gridSpec) {
  const { col, row } = parseHexId(hexId);
  const cube = colRowToCube(col, row, gridSpec);
  const { dq, dr } = DIR_CUBE_DELTAS[dirIndex];
  const { col: nc, row: nr } = cubeToColRow({ q: cube.q + dq, r: cube.r + dr }, gridSpec);
  if (nc < 1 || nc > gridSpec.cols || nr < 1 || nr > gridSpec.rows) return null;
  return formatHexId(nc, nr);
}

// ─── Distance ──────────────────────────────────────────────────────────────────

/**
 * Cube distance between two hexes.
 * LOB — hex distance is the standard cube-coordinate distance formula.
 *
 * @param {string} hexAId
 * @param {string} hexBId
 * @param {{ rows: number }} gridSpec
 * @returns {number}
 */
export function hexDistance(hexAId, hexBId, gridSpec) {
  const a = parseHexId(hexAId);
  const b = parseHexId(hexBId);
  const ca = colRowToCube(a.col, a.row, gridSpec);
  const cb = colRowToCube(b.col, b.row, gridSpec);
  return Math.max(Math.abs(ca.q - cb.q), Math.abs(ca.r - cb.r), Math.abs(ca.s - cb.s));
}

// ─── Hex line ──────────────────────────────────────────────────────────────────

/**
 * Return all hex IDs along the straight line from hexAId to hexBId (inclusive),
 * in order from A to B. Used by the LOS algorithm.
 *
 * Uses a nudge to avoid ambiguous midpoints between two equidistant hexes.
 *
 * @param {string} hexAId
 * @param {string} hexBId
 * @param {{ rows: number }} gridSpec
 * @returns {string[]}
 */
export function hexLine(hexAId, hexBId, gridSpec) {
  const a = parseHexId(hexAId);
  const b = parseHexId(hexBId);
  const ca = colRowToCube(a.col, a.row, gridSpec);
  const cb = colRowToCube(b.col, b.row, gridSpec);

  const n = Math.max(Math.abs(cb.q - ca.q), Math.abs(cb.r - ca.r), Math.abs(cb.s - ca.s));

  if (n === 0) return [hexAId];

  // Nudge to avoid tie-breaking ambiguity at half-way hex boundaries
  const NUDGE = 1e-6;
  const aq = ca.q + NUDGE;
  const ar = ca.r + NUDGE;
  const as_ = ca.s - 2 * NUDGE;
  const bq = cb.q + NUDGE;
  const br = cb.r + NUDGE;
  const bs = cb.s - 2 * NUDGE;

  const results = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const frac = {
      q: aq + (bq - aq) * t,
      r: ar + (br - ar) * t,
      s: as_ + (bs - as_) * t,
    };
    const rounded = cubeRound(frac);
    const { col, row } = cubeToColRow(rounded, gridSpec);
    results.push(formatHexId(col, row));
  }
  return results;
}

// ─── Binary min-heap ───────────────────────────────────────────────────────────

/**
 * Simple array-backed binary min-heap for [cost, hexId] pairs.
 * Reduces Dijkstra complexity from O(V²) to O((V+E) log V).
 */
class MinHeap {
  constructor() {
    this._data = [];
  }

  get length() {
    return this._data.length;
  }

  push(item) {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent][0] <= this._data[i][0]) break;
      [this._data[parent], this._data[i]] = [this._data[i], this._data[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l][0] < this._data[smallest][0]) smallest = l;
      if (r < n && this._data[r][0] < this._data[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this._data[smallest], this._data[i]] = [this._data[i], this._data[smallest]];
      i = smallest;
    }
  }
}

// ─── Dijkstra ──────────────────────────────────────────────────────────────────

/**
 * Dijkstra shortest-path over the hex graph.
 *
 * Used by movement.js for both path-finding and movement range. The caller
 * supplies a costFn that encodes all movement rules (terrain, hexsides,
 * elevation, formation, unit type, etc.).
 *
 * Uses a binary min-heap priority queue: O((V+E) log V) vs O(V²) for a plain array.
 *
 * @param {string} startHex - starting hex ID
 * @param {(fromHexId: string, toHexId: string, dirIndex: number) => number} costFn
 *   Return the cost to move from `fromHexId` to `toHexId` entering from direction
 *   `dirIndex`. Return Infinity for impassable transitions.
 * @param {number} maxCost - stop expanding when cost exceeds this value (use Infinity for full path)
 * @param {{ cols: number, rows: number }} gridSpec
 * @returns {{ costs: Map<string, number>, prev: Map<string, string|null> }}
 *   `costs` maps reachable hexId → lowest total cost from start.
 *   `prev` maps hexId → predecessor hexId (null for start).
 */
export function dijkstra(startHex, costFn, maxCost, gridSpec) {
  const costs = new Map([[startHex, 0]]);
  const prev = new Map([[startHex, null]]);
  // [cost, hexId]
  const queue = new MinHeap();
  queue.push([0, startHex]);

  while (queue.length > 0) {
    const [curCost, curHex] = queue.pop();

    if (curCost > (costs.get(curHex) ?? Infinity)) continue; // stale entry
    if (curCost > maxCost) continue;

    for (const { hexId: neighbor, dirIndex } of hexNeighbors(curHex, gridSpec)) {
      const moveCost = costFn(curHex, neighbor, dirIndex);
      if (!isFinite(moveCost)) continue;

      const newCost = curCost + moveCost;
      if (newCost > maxCost) continue;

      if (newCost < (costs.get(neighbor) ?? Infinity)) {
        costs.set(neighbor, newCost);
        prev.set(neighbor, curHex);
        queue.push([newCost, neighbor]);
      }
    }
  }

  return { costs, prev };
}

/**
 * Reconstruct the path from start to `targetHex` using the `prev` map from dijkstra().
 * Returns null if `targetHex` is unreachable.
 *
 * @param {string} targetHex
 * @param {Map<string, string|null>} prev
 * @returns {string[] | null} ordered array of hex IDs from start to target, inclusive
 */
export function reconstructPath(targetHex, prev) {
  if (!prev.has(targetHex)) return null;
  const path = [];
  let current = targetHex;
  while (current !== null) {
    path.push(current);
    current = prev.get(current);
  }
  path.reverse();
  return path;
}
