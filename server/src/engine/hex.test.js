import { describe, it, expect } from 'vitest';

import {
  parseHexId,
  formatHexId,
  colRowToCube,
  cubeToColRow,
  cubeRound,
  hexNeighbors,
  hexNeighborInDir,
  hexDistance,
  hexLine,
  dijkstra,
  reconstructPath,
  DIR_NAMES,
  OPPOSITE_DIR_INDEX,
} from './hex.js';

// SM map grid spec
const GRID = { cols: 64, rows: 35 };

// ─── ID parsing ────────────────────────────────────────────────────────────────

describe('parseHexId', () => {
  it('parses standard hex ID', () => {
    expect(parseHexId('19.23')).toEqual({ col: 19, row: 23 });
  });

  it('parses zero-padded hex ID', () => {
    expect(parseHexId('01.03')).toEqual({ col: 1, row: 3 });
  });

  it('parses large col/row values', () => {
    expect(parseHexId('64.35')).toEqual({ col: 64, row: 35 });
  });
});

describe('formatHexId', () => {
  it('zero-pads single-digit col and row', () => {
    expect(formatHexId(1, 3)).toBe('01.03');
  });

  it('does not pad two-digit values', () => {
    expect(formatHexId(19, 23)).toBe('19.23');
  });

  it('round-trips with parseHexId', () => {
    const id = '42.07';
    const { col, row } = parseHexId(id);
    expect(formatHexId(col, row)).toBe(id);
  });
});

// ─── Coordinate conversion ─────────────────────────────────────────────────────

describe('colRowToCube / cubeToColRow', () => {
  it('colRowToCube satisfies q+r+s=0', () => {
    for (const [col, row] of [
      [1, 1],
      [2, 2],
      [3, 17],
      [64, 35],
    ]) {
      const { q, r, s } = colRowToCube(col, row, GRID);
      expect(q + r + s).toBe(0);
    }
  });

  it('cubeToColRow inverts colRowToCube', () => {
    for (const [col, row] of [
      [1, 1],
      [2, 2],
      [19, 23],
      [64, 35],
    ]) {
      const cube = colRowToCube(col, row, GRID);
      expect(cubeToColRow(cube, GRID)).toEqual({ col, row });
    }
  });
});

describe('cubeRound', () => {
  it('rounds to nearest hex', () => {
    // A point exactly between two hexes rounds deterministically
    const result = cubeRound({ q: 0.5, r: -0.5, s: 0 });
    expect(result.q + result.r + result.s).toBe(0);
    expect(Number.isInteger(result.q)).toBe(true);
    expect(Number.isInteger(result.r)).toBe(true);
  });

  it('rounds whole-number coordinates unchanged', () => {
    expect(cubeRound({ q: 2, r: -1, s: -1 })).toEqual({ q: 2, r: -1, s: -1 });
  });
});

// ─── Direction constants ───────────────────────────────────────────────────────

describe('direction constants', () => {
  it('DIR_NAMES has 6 entries', () => {
    expect(DIR_NAMES).toHaveLength(6);
  });

  it('OPPOSITE_DIR_INDEX is self-inverse', () => {
    for (let i = 0; i < 6; i++) {
      expect(OPPOSITE_DIR_INDEX[OPPOSITE_DIR_INDEX[i]]).toBe(i);
    }
  });
});

// ─── Neighbor lookup ───────────────────────────────────────────────────────────

describe('hexNeighbors', () => {
  it('interior even-col hex "02.02" has all 6 neighbors', () => {
    const neighbors = hexNeighbors('02.02', GRID);
    expect(neighbors).toHaveLength(6);
    const byDir = Object.fromEntries(neighbors.map((n) => [DIR_NAMES[n.dirIndex], n.hexId]));
    expect(byDir['N']).toBe('02.03');
    expect(byDir['NE']).toBe('03.03');
    expect(byDir['SE']).toBe('03.02');
    expect(byDir['S']).toBe('02.01');
    expect(byDir['SW']).toBe('01.02');
    expect(byDir['NW']).toBe('01.03');
  });

  it('interior odd-col hex "03.02" has all 6 neighbors', () => {
    const neighbors = hexNeighbors('03.02', GRID);
    expect(neighbors).toHaveLength(6);
    const byDir = Object.fromEntries(neighbors.map((n) => [DIR_NAMES[n.dirIndex], n.hexId]));
    expect(byDir['N']).toBe('03.03');
    expect(byDir['NE']).toBe('04.02');
    expect(byDir['SE']).toBe('04.01');
    expect(byDir['S']).toBe('03.01');
    expect(byDir['SW']).toBe('02.01');
    expect(byDir['NW']).toBe('02.02');
  });

  it('corner hex "01.01" has only 2 in-bounds neighbors', () => {
    const neighbors = hexNeighbors('01.01', GRID);
    expect(neighbors).toHaveLength(2);
    const ids = neighbors.map((n) => n.hexId);
    expect(ids).toContain('01.02'); // N
    expect(ids).toContain('02.01'); // NE
  });

  it('corner hex "64.35" has only 2 in-bounds neighbors', () => {
    const neighbors = hexNeighbors('64.35', GRID);
    expect(neighbors).toHaveLength(2);
    const ids = neighbors.map((n) => n.hexId);
    expect(ids).toContain('64.34'); // S
    expect(ids).toContain('63.35'); // SW
  });

  it('neighbor relationships are symmetric', () => {
    // If A lists B as a neighbor in dir i, B must list A as neighbor in OPPOSITE_DIR_INDEX[i]
    const neighbors = hexNeighbors('10.15', GRID);
    for (const { hexId: neighborId, dirIndex } of neighbors) {
      const back = hexNeighbors(neighborId, GRID);
      const returnEntry = back.find((n) => n.hexId === '10.15');
      expect(returnEntry).toBeDefined();
      expect(returnEntry.dirIndex).toBe(OPPOSITE_DIR_INDEX[dirIndex]);
    }
  });
});

describe('hexNeighborInDir', () => {
  it('returns correct neighbor for interior hex', () => {
    expect(hexNeighborInDir('02.02', 0, GRID)).toBe('02.03'); // N
    expect(hexNeighborInDir('02.02', 3, GRID)).toBe('02.01'); // S
  });

  it('returns null when neighbor is out of bounds', () => {
    expect(hexNeighborInDir('01.01', 3, GRID)).toBeNull(); // S of row-1 hex
    expect(hexNeighborInDir('01.01', 4, GRID)).toBeNull(); // SW of col-1 hex
  });
});

// ─── Distance ──────────────────────────────────────────────────────────────────

describe('hexDistance', () => {
  it('distance from a hex to itself is 0', () => {
    expect(hexDistance('01.01', '01.01', GRID)).toBe(0);
  });

  it('adjacent hexes have distance 1', () => {
    expect(hexDistance('01.01', '01.02', GRID)).toBe(1); // N
    expect(hexDistance('01.01', '02.01', GRID)).toBe(1); // NE
    expect(hexDistance('02.02', '01.02', GRID)).toBe(1); // SW
  });

  it('two steps away has distance 2', () => {
    expect(hexDistance('01.01', '01.03', GRID)).toBe(2);
  });

  it('known SM hex pair "10.10" → "14.07" has distance 5', () => {
    expect(hexDistance('10.10', '14.07', GRID)).toBe(5);
  });

  it('is symmetric', () => {
    expect(hexDistance('10.10', '20.20', GRID)).toBe(hexDistance('20.20', '10.10', GRID));
  });
});

// ─── Hex line ──────────────────────────────────────────────────────────────────

describe('hexLine', () => {
  it('single hex returns array with that hex', () => {
    expect(hexLine('19.23', '19.23', GRID)).toEqual(['19.23']);
  });

  it('adjacent hexes return both hexes in order', () => {
    expect(hexLine('02.02', '02.03', GRID)).toEqual(['02.02', '02.03']);
  });

  it('straight N line of 3 hexes', () => {
    expect(hexLine('01.01', '01.03', GRID)).toEqual(['01.01', '01.02', '01.03']);
  });

  it('line length equals hex distance + 1', () => {
    const line = hexLine('10.10', '14.07', GRID);
    expect(line).toHaveLength(hexDistance('10.10', '14.07', GRID) + 1);
  });

  it('starts at fromHex and ends at toHex', () => {
    const line = hexLine('05.05', '15.20', GRID);
    expect(line[0]).toBe('05.05');
    expect(line[line.length - 1]).toBe('15.20');
  });
});

// ─── Dijkstra ──────────────────────────────────────────────────────────────────

describe('dijkstra', () => {
  it('start hex has cost 0', () => {
    const { costs } = dijkstra('10.10', () => 1, 3, GRID);
    expect(costs.get('10.10')).toBe(0);
  });

  it('uniform cost=1 reaches neighbors at cost 1', () => {
    const { costs } = dijkstra('10.10', () => 1, 1, GRID);
    const neighbors = hexNeighbors('10.10', GRID);
    for (const { hexId } of neighbors) {
      expect(costs.get(hexId)).toBe(1);
    }
  });

  it('uniform cost=1 reaches hexes at cost 2 with maxCost=2', () => {
    const { costs } = dijkstra('10.10', () => 1, 2, GRID);
    // "10.12" is 2 steps N from "10.10"
    expect(costs.get('10.12')).toBe(2);
  });

  it('impassable costFn (Infinity) only reaches start', () => {
    const { costs } = dijkstra('10.10', () => Infinity, Infinity, GRID);
    expect(costs.size).toBe(1);
    expect(costs.has('10.10')).toBe(true);
  });

  it('does not exceed maxCost', () => {
    const { costs } = dijkstra('10.10', () => 1, 2, GRID);
    for (const [, cost] of costs) {
      expect(cost).toBeLessThanOrEqual(2);
    }
  });
});

describe('reconstructPath', () => {
  it('returns null for unreachable target', () => {
    const { prev } = dijkstra('10.10', () => Infinity, Infinity, GRID);
    expect(reconstructPath('20.20', prev)).toBeNull();
  });

  it('returns single-element array for start hex', () => {
    const { prev } = dijkstra('10.10', () => 1, 3, GRID);
    expect(reconstructPath('10.10', prev)).toEqual(['10.10']);
  });

  it('returns ordered path from start to target', () => {
    const { costs, prev } = dijkstra('01.01', () => 1, 3, GRID);
    const path = reconstructPath('01.03', prev);
    expect(path).not.toBeNull();
    expect(path[0]).toBe('01.01');
    expect(path[path.length - 1]).toBe('01.03');
    // Each step in the path must be a valid neighbor of the previous
    for (let i = 1; i < path.length; i++) {
      const neighborIds = hexNeighbors(path[i - 1], GRID).map((n) => n.hexId);
      expect(neighborIds).toContain(path[i]);
    }
    // Total path cost matches dijkstra cost
    expect(costs.get('01.03')).toBe(path.length - 1);
  });
});
