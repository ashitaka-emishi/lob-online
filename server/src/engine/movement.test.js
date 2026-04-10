import { describe, it, expect, beforeAll } from 'vitest';

import { loadScenario } from './scenario.js';
import { hexEntryCost, loadMap, movementPath, movementRange } from './movement.js';

// ─── Shared fixtures ───────────────────────────────────────────────────────────

let scenario;
beforeAll(() => {
  scenario = loadScenario();
});

/**
 * Build a minimal Map<hexId, hexEntry> directly (bypassing loadMap / MapSchema)
 * for unit tests that need precise control over terrain and edge data.
 */
function makeHexIndex(hexEntries) {
  const m = new Map();
  for (const h of hexEntries) m.set(h.hex, h);
  return m;
}

/** Minimal gridSpec for the SM map — matches map.json */
const SM_GRID = {
  cols: 64,
  rows: 35,
  dx: 39.75,
  dy: 36,
  hexWidth: 40.5,
  hexHeight: 40.7,
  imageScale: 1,
  strokeWidth: 2,
  orientation: 'flat',
  evenColUp: true,
};

// ─── hexEntryCost — terrain costs ─────────────────────────────────────────────
// LOB §3 / SM movement chart — verify cost table cell-by-cell

describe('hexEntryCost — terrain costs from SM movement chart', () => {
  it('clear terrain: all formations cost 1', () => {
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      { hex: '10.11', terrain: 'clear' },
    ]);
    // 10.11 is N of 10.10 (dirIndex 0)
    for (const formation of ['line', 'column', 'mounted', 'limbered', 'wagon', 'leader']) {
      expect(hexEntryCost('10.10', '10.11', 0, formation, scenario, hexIndex)).toBe(1);
    }
  });

  it('woods terrain: line=2, column=2, mounted=3, limbered=4, wagon=4, leader=2', () => {
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      { hex: '10.11', terrain: 'woods' },
    ]);
    // LOB §3 / SM movement chart — woods terrain costs
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'mounted', scenario, hexIndex)).toBe(3);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(4);
    expect(hexEntryCost('10.10', '10.11', 0, 'wagon', scenario, hexIndex)).toBe(4);
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(2);
  });

  it('orchard terrain: line=1, column=1, mounted=2, limbered=2, wagon=2, leader=1', () => {
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      { hex: '10.11', terrain: 'orchard' },
    ]);
    // LOB §3 / SM movement chart — orchard terrain costs
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(1);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(1);
    expect(hexEntryCost('10.10', '10.11', 0, 'mounted', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'wagon', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(1);
  });

  it('slopingGround terrain: line=2, column=2, mounted=4, leader=1; limbered/wagon=Infinity', () => {
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      { hex: '10.11', terrain: 'slopingGround' },
    ]);
    // SM §3 / SM movement chart — slopingGround: limbered/wagon are prohibited
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'mounted', scenario, hexIndex)).toBe(4);
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(1);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(Infinity);
    expect(hexEntryCost('10.10', '10.11', 0, 'wagon', scenario, hexIndex)).toBe(Infinity);
  });

  it('woodedSloping terrain: line=2, column=2, mounted=4, leader=2; limbered/wagon=Infinity', () => {
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      { hex: '10.11', terrain: 'woodedSloping' },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'mounted', scenario, hexIndex)).toBe(4);
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(Infinity);
    expect(hexEntryCost('10.10', '10.11', 0, 'wagon', scenario, hexIndex)).toBe(Infinity);
  });

  it('marsh terrain: line=2, column=2, mounted=3, limbered=4, leader=2; wagon=Infinity', () => {
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      { hex: '10.11', terrain: 'marsh' },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'mounted', scenario, hexIndex)).toBe(3);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(4);
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(2);
    expect(hexEntryCost('10.10', '10.11', 0, 'wagon', scenario, hexIndex)).toBe(Infinity);
  });

  it('unknown hex returns Infinity (not yet digitized)', () => {
    const hexIndex = makeHexIndex([{ hex: '10.10', terrain: 'clear' }]);
    expect(hexEntryCost('10.10', '99.99', 0, 'line', scenario, hexIndex)).toBe(Infinity);
  });
});

// ─── hexEntryCost — hexside costs (stream, slope, elevation) ──────────────────

describe('hexEntryCost — hexside costs (additive)', () => {
  it('stream hexside adds +1 for line/column/mounted/limbered/wagon; 0 for leader', () => {
    // LOB §3 — stream hexside cost is additive to terrain cost
    // dirIndex 0 (N) → canonical face 0 on fromHex (dir < 3)
    const hexIndex = makeHexIndex([
      {
        hex: '10.10',
        terrain: 'clear',
        edges: { 0: [{ type: 'stream' }] }, // stream on N face (dirIndex 0)
      },
      { hex: '10.11', terrain: 'clear' },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(2); // 1 terrain + 1 stream
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(1); // 1 terrain + 0 stream
  });

  it('slope hexside (from wedgeElevations) adds +2 for line/column, +4 for limbered', () => {
    // SM §1.1 — slope hexside derived from abs(wedgeElevations[enterDir]) == 1
    // Moving N (dirIndex 0) into toHex; enterDirIdx = OPPOSITE_DIR_INDEX[0] = 3 (S)
    // toHex.wedgeElevations[3] = 1 → 'slope'
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      {
        hex: '10.11',
        terrain: 'clear',
        wedgeElevations: [0, 0, 0, 1, 0, 0], // index 3 (S) = entering from S = +1 → slope
      },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(3); // 1+2
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(3);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(5); // 1+4
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(2); // 1+1
  });

  it('extremeSlope hexside (wedgeElevations delta=2) adds +4 for line, Infinity for limbered/wagon', () => {
    // SM §1.1 — extremeSlope from abs(wedgeElevations[enterDir]) == 2
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      {
        hex: '10.11',
        terrain: 'clear',
        wedgeElevations: [0, 0, 0, 2, 0, 0], // index 3 → extremeSlope
      },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(5); // 1+4
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(Infinity);
    expect(hexEntryCost('10.10', '10.11', 0, 'wagon', scenario, hexIndex)).toBe(Infinity);
    expect(hexEntryCost('10.10', '10.11', 0, 'leader', scenario, hexIndex)).toBe(3); // 1+2
  });

  it('verticalSlope hexside (wedgeElevations delta>=3) is Infinity for all formations', () => {
    // SM §1.1 — Special Slope Rule: vertical slopes are impassable to all units
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' },
      {
        hex: '10.11',
        terrain: 'clear',
        wedgeElevations: [0, 0, 0, 3, 0, 0], // index 3 → verticalSlope
      },
    ]);
    for (const formation of ['line', 'column', 'mounted', 'limbered', 'wagon', 'leader']) {
      expect(hexEntryCost('10.10', '10.11', 0, formation, scenario, hexIndex)).toBe(Infinity);
    }
  });

  it('stoneWall hexside has no movement cost (noEffectTerrain)', () => {
    // LOB — stoneWall is listed in noEffectTerrain; crossing adds 0 MP
    const hexIndex = makeHexIndex([
      {
        hex: '10.10',
        terrain: 'clear',
        edges: { 0: [{ type: 'stoneWall' }] },
      },
      { hex: '10.11', terrain: 'clear' },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(1);
  });
});

// ─── hexEntryCost — road movement ─────────────────────────────────────────────

describe('hexEntryCost — road/pike/trail movement', () => {
  it('pike hexside: column/mounted/limbered pay 0.5, line pays terrain cost', () => {
    // LOB §3 — pike (National Road) movement: column uses 0.5 MA; line uses "ot" (terrain cost)
    // Pike on face 0 (N) → stored in fromHex.edges['0']
    const hexIndex = makeHexIndex([
      {
        hex: '10.10',
        terrain: 'clear',
        edges: { 0: [{ type: 'pike' }] },
      },
      { hex: '10.11', terrain: 'clear' },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(0.5);
    expect(hexEntryCost('10.10', '10.11', 0, 'mounted', scenario, hexIndex)).toBe(0.5);
    expect(hexEntryCost('10.10', '10.11', 0, 'limbered', scenario, hexIndex)).toBe(0.5);
    // Line: "ot" → use underlying terrain cost = clear = 1
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(1);
  });

  it('road hexside: column pays 0.5, line pays terrain cost', () => {
    // LOB §3 — road movement: same as pike for column/mounted/leader
    const hexIndex = makeHexIndex([
      {
        hex: '10.10',
        terrain: 'clear',
        edges: { 0: [{ type: 'road' }] },
      },
      { hex: '10.11', terrain: 'clear' },
    ]);
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(0.5);
    expect(hexEntryCost('10.10', '10.11', 0, 'line', scenario, hexIndex)).toBe(1);
  });

  it('road + slope hexside: road penalty applies on slope (road only, not pike)', () => {
    // LOB — roadSlopePenalty: moving along road adds +0.5 per slope hexside crossed
    const hexIndex = makeHexIndex([
      {
        hex: '10.10',
        terrain: 'clear',
        edges: { 0: [{ type: 'road' }] },
      },
      {
        hex: '10.11',
        terrain: 'clear',
        wedgeElevations: [0, 0, 0, 1, 0, 0], // S face = slope when entering from N
      },
    ]);
    // LOB — road movement replaces normal slope hexside cost with the lighter road slope penalty.
    // column: 0.5 (road) + 0.5 (roadSlopePenalty.road for 'slope' hexside) = 1.0
    // Normal slope hexside cost for column (2) is NOT added when using road movement.
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(1.0);
  });

  it('pike + slope hexside: road slope penalty does NOT apply to pike', () => {
    // LOB — roadSlopePenalty only applies to 'road' type, not 'pike' or 'trail'
    const hexIndex = makeHexIndex([
      {
        hex: '10.10',
        terrain: 'clear',
        edges: { 0: [{ type: 'pike' }] },
      },
      {
        hex: '10.11',
        terrain: 'clear',
        wedgeElevations: [0, 0, 0, 1, 0, 0], // slope
      },
    ]);
    // column on pike: 0.5 + slope hexside cost (column slope = 2) = 2.5
    expect(hexEntryCost('10.10', '10.11', 0, 'column', scenario, hexIndex)).toBe(2.5);
  });

  it('canonical face ownership: S face (dir=3) stored on toHex as face 0', () => {
    // LOB — hexside canonical ownership: dir >= 3 stored on toHex as (dir-3)
    // Moving S (dirIndex 3) → look in toHex.edges['0']
    const hexIndex = makeHexIndex([
      { hex: '10.10', terrain: 'clear' }, // no edges
      {
        hex: '10.09', // S neighbor of 10.10
        terrain: 'clear',
        edges: { 0: [{ type: 'stream' }] }, // S hexside of 10.10 = N face of 10.09
      },
    ]);
    expect(hexEntryCost('10.10', '10.09', 3, 'line', scenario, hexIndex)).toBe(2); // 1 + 1 stream
    expect(hexEntryCost('10.10', '10.09', 3, 'leader', scenario, hexIndex)).toBe(1); // stream=0 for leader
  });
});

// ─── movementPath ─────────────────────────────────────────────────────────────

describe('movementPath', () => {
  let mapData;
  beforeAll(() => {
    mapData = loadMap();
  });

  it('returns impassable=false when path exists', () => {
    const result = movementPath('19.23', '20.23', 'line', scenario, mapData);
    expect(result.impassable).toBe(false);
    expect(result.path).not.toBeNull();
  });

  it('path starts at startHex and ends at endHex', () => {
    // Use adjacent hexes — both are digitized in the SM map
    const result = movementPath('19.23', '20.23', 'column', scenario, mapData);
    expect(result.impassable).toBe(false);
    expect(result.path[0]).toBe('19.23');
    expect(result.path[result.path.length - 1]).toBe('20.23');
  });

  it('adjacent clear-terrain hexes cost 1 for line formation', () => {
    // LOB §3 / SM movement chart — clear terrain = 1 MP for line
    const result = movementPath('19.23', '20.23', 'line', scenario, mapData);
    expect(result.totalCost).toBe(1);
  });

  it('total cost matches sum of per-step costs', () => {
    const result = movementPath('15.15', '20.15', 'column', scenario, mapData);
    if (!result.impassable) {
      const sumCosts = result.costs[result.costs.length - 1]?.total ?? 0;
      expect(sumCosts).toBeCloseTo(result.totalCost, 5);
    }
  });
});

// ─── movementRange ────────────────────────────────────────────────────────────

describe('movementRange', () => {
  it('always includes the start hex at cost 0', () => {
    // Use a synthetic map with all clear hexes
    const hexes = [];
    for (let col = 1; col <= 5; col++) {
      for (let row = 1; row <= 5; row++) {
        hexes.push({
          hex: `${String(col).padStart(2, '0')}.${String(row).padStart(2, '0')}`,
          terrain: 'clear',
        });
      }
    }
    const syntheticMap = {
      hexes,
      gridSpec: { ...SM_GRID, cols: 5, rows: 5 },
      vpHexes: [],
    };
    const result = movementRange('03.03', 'line', scenario, syntheticMap);
    const start = result.find((r) => r.hex === '03.03');
    expect(start).toBeDefined();
    expect(start.cost).toBe(0);
  });

  it('line unit with 6 MP reaches all hexes within 6 steps on clear terrain', () => {
    // LOB §3 — line formation has MA=6; on clear terrain each step costs 1
    // Build a 15×15 clear map so edges don't constrain the 6-MP range
    const hexes = [];
    for (let col = 1; col <= 15; col++) {
      for (let row = 1; row <= 15; row++) {
        hexes.push({
          hex: `${String(col).padStart(2, '0')}.${String(row).padStart(2, '0')}`,
          terrain: 'clear',
        });
      }
    }
    const syntheticMap = {
      hexes,
      gridSpec: { ...SM_GRID, cols: 15, rows: 15 },
      vpHexes: [],
    };
    const result = movementRange('08.08', 'line', scenario, syntheticMap);
    // All returned hexes should have cost <= 6
    for (const { cost } of result) {
      expect(cost).toBeLessThanOrEqual(6);
    }
    // Center hex at cost 0
    expect(result.find((r) => r.hex === '08.08').cost).toBe(0);
    // Adjacent hex at cost 1
    const neighbors = result.filter((r) => r.cost === 1);
    expect(neighbors.length).toBe(6); // 6 adjacent hexes in clear terrain interior
  });

  it('verticalSlope hex is excluded from reachable set', () => {
    // SM §1.1 — vertical slopes are impassable; should not appear in movement range
    const hexes = [
      { hex: '08.08', terrain: 'clear' },
      // N neighbor: vertical slope on its S face (entering from S, OPPOSITE_DIR_INDEX[0]=3)
      { hex: '08.09', terrain: 'clear', wedgeElevations: [0, 0, 0, 3, 0, 0] },
      { hex: '08.07', terrain: 'clear' }, // S neighbor — still reachable
    ];
    const syntheticMap = {
      hexes,
      gridSpec: { ...SM_GRID, cols: 15, rows: 15 },
      vpHexes: [],
    };
    const result = movementRange('08.08', 'line', scenario, syntheticMap);
    const ids = result.map((r) => r.hex);
    expect(ids).not.toContain('08.09'); // blocked by vertical slope
    expect(ids).toContain('08.08'); // start always included
  });
});
