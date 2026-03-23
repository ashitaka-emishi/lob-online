import { describe, it, expect } from 'vitest';
import { defineHex, Grid, rectangle, Orientation } from 'honeycomb-grid'; // used in getCellAndNeighbors tests
import {
  edgeMidpoint,
  edgeLine20_80,
  resolveHexOrStub,
  wedgePolygonPoints,
  adjacentHexId,
  getEdgeLabels,
  DIR_TO_CORNERS,
  DIRS,
  OPPOSITE_DIR,
  findNearestEdge,
  getCellAndNeighbors,
  formatGameId,
  hexToGameId,
} from './hexGeometry.js';

// Actual honeycomb-grid FLAT corner order: NE(0), E(1), SE(2), SW(3), W(4), NW(5).
// Corners start at NE (upper-right vertex, 30° before East) and go clockwise in screen coords.
// For a flat-top hex centred at (0,0) with radius 2:
// corners[0]=NE(1,-2), [1]=E(2,0), [2]=SE(1,2), [3]=SW(-1,2), [4]=W(-2,0), [5]=NW(-1,-2)
const CORNERS = [
  { x: 1, y: -2 }, // 0: NE (upper-right)
  { x: 2, y: 0 }, // 1: E (right)
  { x: 1, y: 2 }, // 2: SE (lower-right)
  { x: -1, y: 2 }, // 3: SW (lower-left)
  { x: -2, y: 0 }, // 4: W (left)
  { x: -1, y: -2 }, // 5: NW (upper-left)
];
const CENTRE = { x: 0, y: 0 };

describe('edgeMidpoint', () => {
  it('returns midpoint of N edge (corners 5 and 0)', () => {
    const mid = edgeMidpoint(CORNERS, 'N');
    // corners[5]=(-1,-2), corners[0]=(1,-2) → midpoint=(0,-2)
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(-2);
  });

  it('returns midpoint of S edge (corners 2 and 3)', () => {
    const mid = edgeMidpoint(CORNERS, 'S');
    // corners[2]=(1,2), corners[3]=(-1,2) → midpoint=(0,2)
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(2);
  });

  it('returns midpoint of SE edge (corners 1 and 2)', () => {
    const mid = edgeMidpoint(CORNERS, 'SE');
    // corners[1]=(2,0), corners[2]=(1,2) → midpoint=(1.5,1)
    expect(mid.x).toBeCloseTo(1.5);
    expect(mid.y).toBeCloseTo(1);
  });

  it('handles NE edge (corners 0 and 1)', () => {
    const mid = edgeMidpoint(CORNERS, 'NE');
    // corners[0]=(1,-2), corners[1]=(2,0) → midpoint=(1.5,-1)
    expect(mid.x).toBeCloseTo(1.5);
    expect(mid.y).toBeCloseTo(-1);
  });

  it('handles all 6 directions without error', () => {
    for (const dir of DIRS) {
      expect(() => edgeMidpoint(CORNERS, dir)).not.toThrow();
    }
  });
});

describe('edgeLine20_80', () => {
  it('returns 20%→80% segment along N edge', () => {
    const seg = edgeLine20_80(CORNERS, 'N');
    // N edge: corners[5]=(-1,-2), corners[0]=(1,-2)
    // 20%: -1 + (1-(-1))*0.2 = -1 + 0.4 = -0.6, y=-2
    // 80%: -1 + (1-(-1))*0.8 = -1 + 1.6 = 0.6, y=-2
    expect(seg.x1).toBeCloseTo(-0.6);
    expect(seg.y1).toBeCloseTo(-2);
    expect(seg.x2).toBeCloseTo(0.6);
    expect(seg.y2).toBeCloseTo(-2);
  });

  it('segment endpoints are between the two edge corners', () => {
    const seg = edgeLine20_80(CORNERS, 'SE');
    // corners[0]=(2,0), corners[1]=(1,2)
    // Should be between those two points
    expect(seg.x1).toBeGreaterThan(1); // between 1 and 2
    expect(seg.x2).toBeGreaterThan(1);
    expect(seg.x1).toBeLessThan(2);
    expect(seg.x2).toBeLessThan(2);
  });

  it('handles all 6 directions without error', () => {
    for (const dir of DIRS) {
      expect(() => edgeLine20_80(CORNERS, dir)).not.toThrow();
    }
  });
});

describe('wedgePolygonPoints', () => {
  it('returns exactly 6 polygon point strings', () => {
    const pts = wedgePolygonPoints(CORNERS, CENTRE);
    expect(pts).toHaveLength(6);
  });

  it('each string contains 3 coordinate pairs', () => {
    const pts = wedgePolygonPoints(CORNERS, CENTRE);
    for (const pt of pts) {
      const pairs = pt.trim().split(' ');
      expect(pairs).toHaveLength(3);
    }
  });

  it('first wedge includes centre and corners[0] and corners[1]', () => {
    const pts = wedgePolygonPoints(CORNERS, CENTRE);
    // Wedge 0: centre(0,0) → corners[0](1,-2) → corners[1](2,0)  [NE wedge]
    expect(pts[0]).toBe('0,0 1,-2 2,0');
  });

  it('wraps around: last wedge uses corners[5] and corners[0]', () => {
    const pts = wedgePolygonPoints(CORNERS, CENTRE);
    // Wedge 5: centre(0,0) → corners[5](-1,-2) → corners[0](1,-2)  [N wedge]
    expect(pts[5]).toBe('0,0 -1,-2 1,-2');
  });
});

describe('adjacentHexId', () => {
  const GRID = { cols: 5, rows: 5 };

  // From "03.03" (col=3, row=3): hcCol=2(even), hcRow=2; EVEN_Q: q=2, r=2-floor(2/2)=1, s=-3
  it('returns N neighbor of "03.03"', () => {
    // N: nq=2, nr=0; nhcCol=2(even), nhcRow=0+floor(2/2)=1; ncol=3, nrow=4 → "03.04"
    expect(adjacentHexId('03.03', 'N', GRID)).toBe('03.04');
  });

  it('returns S neighbor of "03.03"', () => {
    // S: nq=2, nr=2; nhcCol=2(even), nhcRow=2+1=3; ncol=3, nrow=2 → "03.02"
    expect(adjacentHexId('03.03', 'S', GRID)).toBe('03.02');
  });

  it('returns NE neighbor of "03.03"', () => {
    // NE: nq=3, nr=0; nhcCol=3(odd), nhcRow=0+floor(4/2)=2; ncol=4, nrow=3 → "04.03"
    expect(adjacentHexId('03.03', 'NE', GRID)).toBe('04.03');
  });

  it('returns SE neighbor of "03.03"', () => {
    // SE: nq=3, nr=1; nhcCol=3(odd), nhcRow=1+2=3; ncol=4, nrow=2 → "04.02"
    expect(adjacentHexId('03.03', 'SE', GRID)).toBe('04.02');
  });

  it('returns SW neighbor of "03.03"', () => {
    // SW: nq=1, nr=2; nhcCol=1(odd), nhcRow=2+floor(2/2)=3; ncol=2, nrow=2 → "02.02"
    expect(adjacentHexId('03.03', 'SW', GRID)).toBe('02.02');
  });

  it('returns NW neighbor of "03.03"', () => {
    // NW: nq=1, nr=1; nhcCol=1(odd), nhcRow=1+1=2; ncol=2, nrow=3 → "02.03"
    expect(adjacentHexId('03.03', 'NW', GRID)).toBe('02.03');
  });

  it('returns null when neighbor is out of bounds (west edge)', () => {
    // "01.01" + NW or SW goes to col < 1
    expect(adjacentHexId('01.03', 'NW', GRID)).toBeNull();
  });

  it('returns null when neighbor exceeds north boundary', () => {
    expect(adjacentHexId('03.05', 'N', GRID)).toBeNull();
  });

  it('returns null when neighbor exceeds south boundary', () => {
    expect(adjacentHexId('03.01', 'S', GRID)).toBeNull();
  });

  it('returns null for an unknown direction', () => {
    expect(adjacentHexId('03.03', 'INVALID', GRID)).toBeNull();
  });

  // Parity test: even game column (col=4, hcCol=3, odd 0-based) exercises the other
  // EVEN_Q branch. All 6 neighbors from "04.03" (hcCol=3 odd) must be verified.
  describe('from even game column "04.03" (odd hcCol — EVEN_Q odd branch)', () => {
    // hcCol=3(odd), hcRow=2; EVEN_Q: q=3, r=2-floor(4/2)=0, s=-3
    it('N neighbor', () => {
      // N: nq=3, nr=-1; nhcCol=3(odd), nhcRow=-1+floor(4/2)=1; ncol=4, nrow=4 → "04.04"
      expect(adjacentHexId('04.03', 'N', GRID)).toBe('04.04');
    });
    it('S neighbor', () => {
      // S: nq=3, nr=1; nhcRow=1+2=3; nrow=2 → "04.02"
      expect(adjacentHexId('04.03', 'S', GRID)).toBe('04.02');
    });
    it('NE neighbor', () => {
      // NE: nq=4, nr=-1; nhcCol=4(even), nhcRow=-1+floor(4/2)=1; ncol=5, nrow=4 → "05.04"
      expect(adjacentHexId('04.03', 'NE', GRID)).toBe('05.04');
    });
    it('SE neighbor', () => {
      // SE: nq=4, nr=0; nhcRow=0+2=2; nrow=3 → "05.03"
      expect(adjacentHexId('04.03', 'SE', GRID)).toBe('05.03');
    });
    it('SW neighbor', () => {
      // SW: nq=2, nr=1; nhcCol=2(even), nhcRow=1+floor(2/2)=2; ncol=3, nrow=3 → "03.03"
      expect(adjacentHexId('04.03', 'SW', GRID)).toBe('03.03');
    });
    it('NW neighbor', () => {
      // NW: nq=2, nr=0; nhcRow=0+1=1; nrow=4 → "03.04"
      expect(adjacentHexId('04.03', 'NW', GRID)).toBe('03.04');
    });
    it('NE returns null at east boundary', () => {
      expect(adjacentHexId('05.03', 'NE', GRID)).toBeNull();
    });
  });
});

describe('DIR_TO_CORNERS', () => {
  it('maps all 6 directions', () => {
    for (const dir of DIRS) {
      expect(DIR_TO_CORNERS[dir]).toBeDefined();
      expect(DIR_TO_CORNERS[dir]).toHaveLength(2);
    }
  });
});

describe('findNearestEdge', () => {
  // Re-use the CORNERS fixture (flat-top hex centred at origin, radius 2).
  // Edge midpoints:
  //   N  → (0, -2)   S  → (0, 2)
  //   NE → (1.5, -1) SW → (-1.5, 1)
  //   SE → (1.5, 1)  NW → (-1.5, -1)
  const cell = { id: 'A', corners: CORNERS };

  it('returns nearest edge when cursor is exactly on N midpoint', () => {
    const result = findNearestEdge(0, -2, [cell]);
    expect(result).toEqual(expect.objectContaining({ hexId: 'A', dir: 'N' }));
  });

  it('returns nearest edge when cursor is exactly on S midpoint', () => {
    const result = findNearestEdge(0, 2, [cell]);
    expect(result).toEqual(expect.objectContaining({ hexId: 'A', dir: 'S' }));
  });

  it('returns nearest edge when cursor is exactly on SE midpoint', () => {
    const result = findNearestEdge(1.5, 1, [cell]);
    expect(result).toEqual(expect.objectContaining({ hexId: 'A', dir: 'SE' }));
  });

  it('returns null when cursor is far from all edges (custom threshold)', () => {
    // All edge midpoints are ≥ ~1.73 from (0,0); use threshold=1 to force null
    const result = findNearestEdge(0, 0, [cell], 1);
    expect(result).toBeNull();
  });

  it('returns null when cursor is far away (default threshold)', () => {
    const result = findNearestEdge(0, -100, [cell]);
    expect(result).toBeNull();
  });

  it('returns null for empty cell list', () => {
    expect(findNearestEdge(0, -2, [])).toBeNull();
  });

  it('picks the closer edge when two cells are present', () => {
    // Second cell shifted 10 units right: same corners + 10 on x
    const shifted = CORNERS.map((c) => ({ x: c.x + 10, y: c.y }));
    const cellB = { id: 'B', corners: shifted };
    // Cursor at (10, -2) = N midpoint of cellB; N midpoint of cellA is at (0, -2), dist=10
    const result = findNearestEdge(10, -2, [cell, cellB]);
    expect(result).toEqual(expect.objectContaining({ hexId: 'B', dir: 'N' }));
  });

  it('uses custom threshold — excludes edges beyond it', () => {
    // N midpoint at (0, -2); cursor at (0, -9) → dist=7, within default threshold=8 but not 6
    expect(findNearestEdge(0, -9, [cell], 6)).toBeNull();
    expect(findNearestEdge(0, -9, [cell], 8)).toEqual(
      expect.objectContaining({ hexId: 'A', dir: 'N' })
    );
  });

  // ── dist field — enables snap deduplication (#159) ─────────────────────────

  it('result includes dist (distance from cursor to nearest edge midpoint)', () => {
    // Cursor exactly on N midpoint (0, -2) → dist should be 0
    const result = findNearestEdge(0, -2, [cell]);
    expect(result).not.toBeNull();
    expect(typeof result.dist).toBe('number');
    expect(result.dist).toBeCloseTo(0, 5);
  });

  it('dist can be used to determine snap threshold without a second call', () => {
    // N midpoint at (0, -2); cursor at (0, -9) → dist = 7, beyond 6px snap threshold
    const result = findNearestEdge(0, -9, [cell], 999);
    expect(result).not.toBeNull();
    expect(result.dist).toBeGreaterThan(6);
    // snap = result whose dist ≤ 6
    const snap = result.dist <= 6 ? result : null;
    expect(snap).toBeNull();
  });
});

describe('getCellAndNeighbors', () => {
  // Build a real 4×3 flat-top honeycomb-grid (same params as HexMapOverlay BASE_CAL).
  const Hex = defineHex({
    dimensions: { xRadius: 35, yRadius: 35 },
    orientation: Orientation.FLAT,
    origin: { x: 0, y: 0 },
    offset: 1,
  });
  const grid = new Grid(Hex, rectangle({ width: 4, height: 3 }));

  // Build a cellByColRow map of minimal cell objects { col, row }
  const cellByColRow = new Map();
  grid.forEach((hex) => {
    cellByColRow.set(`${hex.col},${hex.row}`, {
      id: `${hex.col},${hex.row}`,
      col: hex.col,
      row: hex.row,
    });
  });

  it('returns the candidate cell itself', () => {
    const result = getCellAndNeighbors({ col: 1, row: 1 }, cellByColRow);
    expect(result.some((c) => c.col === 1 && c.row === 1)).toBe(true);
  });

  it('returns up to 7 cells (candidate + 6 neighbors) for interior hex', () => {
    const result = getCellAndNeighbors({ col: 1, row: 1 }, cellByColRow);
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(7);
  });

  it('returns fewer cells for a corner hex (some neighbors out of bounds)', () => {
    const cornerResult = getCellAndNeighbors({ col: 0, row: 0 }, cellByColRow);
    const interiorResult = getCellAndNeighbors({ col: 1, row: 1 }, cellByColRow);
    expect(cornerResult.length).toBeLessThan(interiorResult.length);
  });

  it('contains no duplicates', () => {
    const result = getCellAndNeighbors({ col: 1, row: 1 }, cellByColRow);
    const ids = result.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns empty array when candidate hex is not in cellByColRow', () => {
    const result = getCellAndNeighbors({ col: 1, row: 1 }, new Map());
    expect(result).toEqual([]);
  });
});

describe('getEdgeLabels', () => {
  const VALID_LABELS = new Set(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);

  it('northOffset=0: standard flat-top labels', () => {
    expect(getEdgeLabels(0)).toEqual(['N', 'NE', 'SE', 'S', 'SW', 'NW']);
  });

  it('northOffset=3: SM orientation (right vertex = N)', () => {
    expect(getEdgeLabels(3)).toEqual(['W', 'NW', 'NE', 'E', 'SE', 'SW']);
  });

  it('northOffset=6: south-at-top', () => {
    expect(getEdgeLabels(6)).toEqual(['S', 'SW', 'NW', 'N', 'NE', 'SE']);
  });

  it('always returns exactly 6 labels', () => {
    for (let n = 0; n < 12; n++) {
      expect(getEdgeLabels(n)).toHaveLength(6);
    }
  });

  it('all labels are valid cardinal/intercardinal strings for every northOffset', () => {
    for (let n = 0; n < 12; n++) {
      for (const label of getEdgeLabels(n)) {
        expect(VALID_LABELS).toContain(label);
      }
    }
  });

  it('northOffset=1', () => {
    expect(getEdgeLabels(1)).toEqual(['NW', 'NE', 'E', 'SE', 'SW', 'W']);
  });

  it('northOffset=9', () => {
    expect(getEdgeLabels(9)).toEqual(['E', 'SE', 'SW', 'W', 'NW', 'NE']);
  });
});

describe('formatGameId', () => {
  it('pads single-digit col and row', () => {
    expect(formatGameId(1, 3)).toBe('01.03');
  });

  it('passes double-digit values through unchanged', () => {
    expect(formatGameId(12, 34)).toBe('12.34');
  });
});

describe('hexToGameId', () => {
  it('col=0, row=0, gridRows=3 → "01.03" (top-left corner)', () => {
    expect(hexToGameId({ col: 0, row: 0 }, 3)).toBe('01.03');
  });

  it('col=1, row=0, gridRows=3 → "02.03" (top of second honeycomb column)', () => {
    expect(hexToGameId({ col: 1, row: 0 }, 3)).toBe('02.03');
  });

  it('col=3, row=2, gridRows=3 → "04.01" (bottom-right corner)', () => {
    expect(hexToGameId({ col: 3, row: 2 }, 3)).toBe('04.01');
  });

  it('col=0, row=1, gridRows=35 → "01.34" (mid-grid, full game dimensions)', () => {
    expect(hexToGameId({ col: 0, row: 1 }, 35)).toBe('01.34');
  });

  it('pads single-digit col and row with leading zeros', () => {
    expect(hexToGameId({ col: 4, row: 30 }, 35)).toBe('05.05');
  });
});

describe('resolveHexOrStub', () => {
  const hexes = [
    { hex: '01.01', terrain: 'clear', elevation: 3 },
    { hex: '02.01', terrain: 'woods' },
  ];
  const indexMap = new Map(hexes.map((h, i) => [h.hex, i]));

  it('returns the existing hex entry when found', () => {
    expect(resolveHexOrStub(hexes, indexMap, '01.01')).toStrictEqual(hexes[0]);
  });

  it('returns a stub object for an unknown hexId', () => {
    expect(resolveHexOrStub(hexes, indexMap, '99.99')).toEqual({
      hex: '99.99',
      terrain: 'unknown',
    });
  });

  it('stub has the correct hexId', () => {
    const result = resolveHexOrStub(hexes, indexMap, '03.05');
    expect(result.hex).toBe('03.05');
  });
});

describe('OPPOSITE_DIR', () => {
  it('maps each direction to its opposite', () => {
    expect(OPPOSITE_DIR.N).toBe('S');
    expect(OPPOSITE_DIR.S).toBe('N');
    expect(OPPOSITE_DIR.NE).toBe('SW');
    expect(OPPOSITE_DIR.SW).toBe('NE');
    expect(OPPOSITE_DIR.NW).toBe('SE');
    expect(OPPOSITE_DIR.SE).toBe('NW');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(OPPOSITE_DIR)).toBe(true);
  });
});
