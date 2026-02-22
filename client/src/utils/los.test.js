import { describe, it, expect } from 'vitest';
import { parseHexId, colRowToCube, cubeToColRow, cubeRound, hexLine, evaluateLos } from './los.js';

// Minimal gridSpec for tests (10×10 flat-top, evenColUp: false = ODD_Q)
const GRID = { cols: 10, rows: 10, evenColUp: false };

// Build a minimal mapData object from a hex array
function makeMap(hexes = [], gridSpec = GRID) {
  return { hexes, gridSpec };
}

// Build a hex entry with just the fields we need
function hex(id, terrain = 'clear', elevation = 0, edges = undefined) {
  const entry = { hex: id, terrain, elevation };
  if (edges) entry.edges = edges;
  return entry;
}

describe('parseHexId', () => {
  it('parses col and row as numbers', () => {
    expect(parseHexId('19.23')).toEqual({ col: 19, row: 23 });
    expect(parseHexId('01.01')).toEqual({ col: 1, row: 1 });
    expect(parseHexId('06.10')).toEqual({ col: 6, row: 10 });
  });
});

describe('colRowToCube / cubeToColRow round-trip', () => {
  it('round-trips bottom-left hex (01.01)', () => {
    const cube = colRowToCube(1, 1, GRID);
    const back = cubeToColRow(cube, GRID);
    expect(back).toEqual({ col: 1, row: 1 });
  });

  it('round-trips an interior hex', () => {
    const cube = colRowToCube(5, 5, GRID);
    const back = cubeToColRow(cube, GRID);
    expect(back).toEqual({ col: 5, row: 5 });
  });

  it('satisfies q + r + s = 0', () => {
    const { q, r, s } = colRowToCube(4, 7, GRID);
    expect(q + r + s).toBe(0);
  });
});

describe('cubeRound', () => {
  it('rounds to the nearest hex', () => {
    const rounded = cubeRound({ q: 0.6, r: -0.6, s: 0 });
    expect(rounded.q + rounded.r + rounded.s).toBe(0);
  });

  it('maintains q + r + s = 0 after rounding', () => {
    const rounded = cubeRound({ q: 1.4, r: -0.9, s: -0.5 });
    expect(rounded.q + rounded.r + rounded.s).toBe(0);
  });
});

describe('hexLine', () => {
  it('returns a single hex when A === B', () => {
    const line = hexLine('05.05', '05.05', GRID);
    expect(line).toEqual(['05.05']);
  });

  it('includes both endpoints', () => {
    const line = hexLine('01.01', '01.03', GRID);
    expect(line[0]).toBe('01.01');
    expect(line[line.length - 1]).toBe('01.03');
  });

  it('produces a path of length > 2 for distant hexes', () => {
    const line = hexLine('01.01', '05.01', GRID);
    expect(line.length).toBeGreaterThan(2);
  });

  it('consecutive hexes in the path are adjacent (differ by 1 cube step)', () => {
    const line = hexLine('02.05', '08.02', GRID);
    for (let i = 1; i < line.length; i++) {
      const prev = parseHexId(line[i - 1]);
      const cur = parseHexId(line[i]);
      const cp = colRowToCube(prev.col, prev.row, GRID);
      const cc = colRowToCube(cur.col, cur.row, GRID);
      const dist = Math.max(Math.abs(cc.q - cp.q), Math.abs(cc.r - cp.r), Math.abs(cc.s - cp.s));
      expect(dist).toBe(1);
    }
  });
});

describe('evaluateLos', () => {
  it('returns CLEAR for same hex (A === B)', () => {
    const result = evaluateLos('05.05', '05.05', makeMap([hex('05.05', 'clear', 100)]));
    expect(result.clear).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].role).toBe('observer');
  });

  it('returns CLEAR for flat line through clear hexes at equal elevation', () => {
    // Use a horizontal line along row 5: cols 2, 3, 4, 5
    // All at elevation 100, terrain clear → observer height = 100, target height = 100
    // Intermediate hexes are also at 100 → not > 100, so CLEAR
    const hexes = [
      hex('02.05', 'clear', 100),
      hex('03.05', 'clear', 100),
      hex('04.05', 'clear', 100),
      hex('05.05', 'clear', 100),
    ];
    const result = evaluateLos('02.05', '05.05', makeMap(hexes));
    expect(result.clear).toBe(true);
    expect(result.summary).toMatch(/clear/i);
  });

  it('returns BLOCKED when intermediate hex terrain makes effective height exceed LOS line', () => {
    // Observer at elev 100, target at elev 100 → LOS line stays at 100 throughout
    // Intermediate hex at elev 100, terrain woods (+1) → effectiveHeight = 101 > 100 → BLOCKED
    const line = hexLine('02.05', '06.05', GRID);
    // line[0]='02.05', line[line.length-1]='06.05', intermediates are line[1..n-2]
    const middleId = line[Math.floor(line.length / 2)];
    const hexes = [
      hex('02.05', 'clear', 100),
      hex(middleId, 'woods', 100), // woods +1 → effectiveHeight=101 > losLine=100
      hex('06.05', 'clear', 100),
    ];
    const result = evaluateLos('02.05', '06.05', makeMap(hexes));
    expect(result.clear).toBe(false);
    expect(result.summary).toMatch(/blocked/i);
  });

  it('returns CLEAR when looking uphill and intermediate matches LOS line exactly', () => {
    // Observer at elev 0, target at elev 200
    // Intermediate hex (at t=0.5) → LOS line = 100
    // Intermediate hex at elev 100, clear → effectiveHeight = 100, NOT > 100 → CLEAR
    const line = hexLine('02.05', '06.05', GRID);
    const midIdx = Math.floor(line.length / 2);
    const middleId = line[midIdx];
    const t = midIdx / (line.length - 1);
    const losAtMid = 0 + (200 - 0) * t; // observer=0, target=200
    // Set intermediate to exactly losAtMid (equal height should NOT block)
    const hexes = [
      hex('02.05', 'clear', 0),
      hex(middleId, 'clear', Math.round(losAtMid)),
      hex('06.05', 'clear', 200),
    ];
    const result = evaluateLos('02.05', '06.05', makeMap(hexes));
    expect(result.clear).toBe(true);
  });

  it('returns BLOCKED immediately for losBlocking edge feature', () => {
    // Observer and target at same elevation; no terrain blocking.
    // Intermediate hex has a losBlocking edge feature on the entering side.
    const line = hexLine('02.05', '06.05', GRID);
    const midIdx = Math.floor(line.length / 2);
    const middleId = line[midIdx];

    // Find the entering direction by looking at prev hex cube delta
    const prev = parseHexId(line[midIdx - 1]);
    const cur = parseHexId(middleId);
    const cp = colRowToCube(prev.col, prev.row, GRID);
    const cc = colRowToCube(cur.col, cur.row, GRID);
    const dq = cp.q - cc.q;
    const dr = cp.r - cc.r;
    // Map delta to direction
    const DIR_DELTAS = [
      { name: 'N', dq: 0, dr: -1 },
      { name: 'NE', dq: 1, dr: -1 },
      { name: 'SE', dq: 1, dr: 0 },
      { name: 'S', dq: 0, dr: 1 },
      { name: 'SW', dq: -1, dr: 1 },
      { name: 'NW', dq: -1, dr: 0 },
    ];
    const enteringDir = DIR_DELTAS.find((d) => d.dq === dq && d.dr === dr)?.name;
    expect(enteringDir).toBeTruthy();

    const edges = { [enteringDir]: [{ type: 'verticalSlope', losBlocking: true }] };
    const hexes = [
      hex('02.05', 'clear', 100),
      { hex: middleId, terrain: 'clear', elevation: 100, edges },
      hex('06.05', 'clear', 100),
    ];
    const result = evaluateLos('02.05', '06.05', makeMap(hexes));
    expect(result.clear).toBe(false);
    const blockedStep = result.steps.find((s) => s.blocked);
    expect(blockedStep.hexId).toBe(middleId);
    expect(blockedStep.blockReason).toMatch(/blocks LOS/i);
  });

  it('losHeightBonus on entering edge raises effective height and can cause blocking', () => {
    // Observer at 100, target at 100 → LOS line = 100 throughout
    // Intermediate at elev 99, clear → effectiveHeight = 99 → CLEAR normally
    // But add losHeightBonus: 2 on entering edge → effectiveHeight = 101 → BLOCKED
    const line = hexLine('02.05', '06.05', GRID);
    const midIdx = Math.floor(line.length / 2);
    const middleId = line[midIdx];

    const prev = parseHexId(line[midIdx - 1]);
    const cur = parseHexId(middleId);
    const cp = colRowToCube(prev.col, prev.row, GRID);
    const cc = colRowToCube(cur.col, cur.row, GRID);
    const dq = cp.q - cc.q;
    const dr = cp.r - cc.r;
    const DIR_DELTAS = [
      { name: 'N', dq: 0, dr: -1 },
      { name: 'NE', dq: 1, dr: -1 },
      { name: 'SE', dq: 1, dr: 0 },
      { name: 'S', dq: 0, dr: 1 },
      { name: 'SW', dq: -1, dr: 1 },
      { name: 'NW', dq: -1, dr: 0 },
    ];
    const enteringDir = DIR_DELTAS.find((d) => d.dq === dq && d.dr === dr)?.name;

    const edges = { [enteringDir]: [{ type: 'stoneWall', losHeightBonus: 2 }] };
    const hexes = [
      hex('02.05', 'clear', 100),
      { hex: middleId, terrain: 'clear', elevation: 99, edges },
      hex('06.05', 'clear', 100),
    ];
    const result = evaluateLos('02.05', '06.05', makeMap(hexes));
    expect(result.clear).toBe(false);
    const blockedStep = result.steps.find((s) => s.blocked);
    expect(blockedStep.hexId).toBe(middleId);
  });

  it('handles missing hex data gracefully (treated as elev 0, no crash)', () => {
    // Map has only observer and target; intermediates have no data
    const hexes = [hex('02.05', 'clear', 0), hex('06.05', 'clear', 0)];
    const result = evaluateLos('02.05', '06.05', makeMap(hexes));
    // Should not throw; intermediate with noData=true assumed elev 0
    expect(result).toHaveProperty('clear');
    const intermediate = result.steps.find((s) => s.role === 'intermediate' && s.noData);
    expect(intermediate).toBeTruthy();
    expect(intermediate.elevation).toBeNull();
  });

  it('returns CLEAR when no hexes at all are in mapData', () => {
    const result = evaluateLos('02.05', '06.05', makeMap([]));
    // All hexes default to elev 0, clear → flat line → CLEAR
    expect(result.clear).toBe(true);
  });

  it('steps include observer and target roles at endpoints', () => {
    const result = evaluateLos('02.05', '06.05', makeMap([]));
    expect(result.steps[0].role).toBe('observer');
    expect(result.steps[result.steps.length - 1].role).toBe('target');
  });

  it('uses treeLosHeight option for woods terrain', () => {
    // With treeLosHeight=3 (base LoB rules), woods gives +3 instead of +1
    // Observer clear at 100, target clear at 100
    // Intermediate woods at elev 100 → effectiveHeight = 100 + 3 = 103 > 100 → BLOCKED
    const line = hexLine('02.05', '06.05', GRID);
    const middleId = line[Math.floor(line.length / 2)];
    const hexes = [
      hex('02.05', 'clear', 100),
      hex(middleId, 'woods', 100),
      hex('06.05', 'clear', 100),
    ];
    const result = evaluateLos('02.05', '06.05', makeMap(hexes), { treeLosHeight: 3 });
    expect(result.clear).toBe(false);
  });
});
