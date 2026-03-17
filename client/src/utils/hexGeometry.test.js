import { describe, it, expect } from 'vitest';
import {
  edgeMidpoint,
  edgeLine20_80,
  wedgePolygonPoints,
  adjacentHexId,
  getEdgeLabels,
  DIR_TO_CORNERS,
  DIRS,
} from './hexGeometry.js';

// Simple synthetic corners for a flat-top hex centred at (0,0) with radius 2.
// corners[0]=E(2,0), [1]=SE(1,2), [2]=SW(-1,2), [3]=W(-2,0), [4]=NW(-1,-2), [5]=NE(1,-2)
const CORNERS = [
  { x: 2, y: 0 }, // 0: E
  { x: 1, y: 2 }, // 1: SE
  { x: -1, y: 2 }, // 2: SW
  { x: -2, y: 0 }, // 3: W
  { x: -1, y: -2 }, // 4: NW
  { x: 1, y: -2 }, // 5: NE
];
const CENTRE = { x: 0, y: 0 };

describe('edgeMidpoint', () => {
  it('returns midpoint of N edge (corners 4 and 5)', () => {
    const mid = edgeMidpoint(CORNERS, 'N');
    // corners[4]=(-1,-2), corners[5]=(1,-2) → midpoint=(0,-2)
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(-2);
  });

  it('returns midpoint of S edge (corners 1 and 2)', () => {
    const mid = edgeMidpoint(CORNERS, 'S');
    // corners[1]=(1,2), corners[2]=(-1,2) → midpoint=(0,2)
    expect(mid.x).toBeCloseTo(0);
    expect(mid.y).toBeCloseTo(2);
  });

  it('returns midpoint of SE edge (corners 0 and 1)', () => {
    const mid = edgeMidpoint(CORNERS, 'SE');
    // corners[0]=(2,0), corners[1]=(1,2) → midpoint=(1.5,1)
    expect(mid.x).toBeCloseTo(1.5);
    expect(mid.y).toBeCloseTo(1);
  });

  it('handles NE edge (corners 5 and 0)', () => {
    const mid = edgeMidpoint(CORNERS, 'NE');
    // corners[5]=(1,-2), corners[0]=(2,0) → midpoint=(1.5,-1)
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
    // N edge: corners[4]=(-1,-2), corners[5]=(1,-2)
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
    // Wedge 0: centre(0,0) → corners[0](2,0) → corners[1](1,2)
    expect(pts[0]).toBe('0,0 2,0 1,2');
  });

  it('wraps around: last wedge uses corners[5] and corners[0]', () => {
    const pts = wedgePolygonPoints(CORNERS, CENTRE);
    // Wedge 5: centre(0,0) → corners[5](1,-2) → corners[0](2,0)
    expect(pts[5]).toBe('0,0 1,-2 2,0');
  });
});

describe('adjacentHexId', () => {
  const GRID = { cols: 5, rows: 5 };

  // From "03.03" (col=3, row=3): hcCol=2, hcRow=2; q=2, r=2-floor(2/2)=1, s=-3
  it('returns N neighbor of "03.03"', () => {
    // N: nq=2, nr=0; nhcCol=2, nhcRow=0+1=1; ncol=3, nrow=5-1=4 → "03.04"
    expect(adjacentHexId('03.03', 'N', GRID)).toBe('03.04');
  });

  it('returns S neighbor of "03.03"', () => {
    // S: nq=2, nr=2; nhcCol=2, nhcRow=2+1=3; ncol=3, nrow=5-3=2 → "03.02"
    expect(adjacentHexId('03.03', 'S', GRID)).toBe('03.02');
  });

  it('returns NE neighbor of "03.03"', () => {
    // NE: nq=3, nr=0; nhcCol=3(odd), nhcRow=0+floor(2/2)=0+1=1; ncol=4, nrow=4 → "04.04"
    expect(adjacentHexId('03.03', 'NE', GRID)).toBe('04.04');
  });

  it('returns SE neighbor of "03.03"', () => {
    // SE: nq=3, nr=1; nhcCol=3(odd), nhcRow=1+1=2; ncol=4, nrow=3 → "04.03"
    expect(adjacentHexId('03.03', 'SE', GRID)).toBe('04.03');
  });

  it('returns SW neighbor of "03.03"', () => {
    // SW: nq=1, nr=2; nhcCol=1(odd), nhcRow=2+0=2; ncol=2, nrow=3 → "02.03"
    expect(adjacentHexId('03.03', 'SW', GRID)).toBe('02.03');
  });

  it('returns NW neighbor of "03.03"', () => {
    // NW: nq=1, nr=1; nhcCol=1(odd), nhcRow=1+0=1; ncol=2, nrow=4 → "02.04"
    expect(adjacentHexId('03.03', 'NW', GRID)).toBe('02.04');
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
});

describe('DIR_TO_CORNERS', () => {
  it('maps all 6 directions', () => {
    for (const dir of DIRS) {
      expect(DIR_TO_CORNERS[dir]).toBeDefined();
      expect(DIR_TO_CORNERS[dir]).toHaveLength(2);
    }
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
