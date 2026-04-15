/**
 * Tests for server/src/engine/los.js
 *
 * All fixture-based tests use a 10.10 → 10.1N north-south line because it
 * resolves cleanly: within column 10 each step increases row by 1.
 * Intermediate hexes are verified via hexLine geometry in hex.test.js.
 *
 * Hex height = elevation + max(0, max(wedgeElevations)), in contour levels.
 * terrainBonus applies only to intermediate obstacle hexes, not End Points.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { computeLOS } from './los.js';
import { loadMap } from './map.js';
import { loadScenario } from './scenario.js';

// ─── Shared fixtures ───────────────────────────────────────────────────────────

let scenario;
let realMap;

beforeAll(() => {
  scenario = loadScenario();
  realMap = loadMap();
});

/** Minimal gridSpec matching the SM map. */
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

/**
 * Build a minimal mapData fixture for LOS unit tests.
 * hexes need only contain the hexes the test exercises.
 */
function makeMapData(hexes) {
  return {
    gridSpec: SM_GRID,
    elevationSystem: {
      baseElevation: 500,
      contourInterval: 50,
      elevationLevels: 24,
      unit: 'feet',
      verticalSlopesImpassable: true,
    },
    hexes,
    vpHexes: [],
  };
}

// ─── Same hex ──────────────────────────────────────────────────────────────────

describe('computeLOS — same hex', () => {
  it('LOB §4.0 — canSee=true when observer and target are the same hex', () => {
    const mapData = makeMapData([{ hex: '10.10', terrain: 'clear', elevation: 5 }]);
    const result = computeLOS('10.10', '10.10', mapData, scenario);
    expect(result.canSee).toBe(true);
    expect(result.blockedBy).toBeNull();
    expect(result.trace).toEqual(['10.10']);
  });
});

// ─── Adjacent hex (range 1) ────────────────────────────────────────────────────

describe('computeLOS — adjacent hexes (LOB §4.2a)', () => {
  it('LOB §4.2a — adjacent clear hexes always have clear LOS', () => {
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 0 },
    ]);
    expect(computeLOS('10.10', '10.11', mapData, scenario).canSee).toBe(true);
  });

  it('LOB §4.2a — adjacent hexes are always clear regardless of terrain or elevation', () => {
    // Even a woods hex at elevation 10 is transparent at range 1
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'woods', elevation: 10 },
    ]);
    expect(computeLOS('10.10', '10.11', mapData, scenario).canSee).toBe(true);
  });
});

// ─── Flat terrain — basic pass ─────────────────────────────────────────────────

describe('computeLOS — flat terrain', () => {
  it('clear terrain at elevation 0 — 3-hex line is always clear', () => {
    // Trace: 10.10 → 10.11 → 10.12 (all elevation 0, clear)
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 0 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(true);
    expect(result.trace.length).toBe(3);
  });
});

// ─── Blocked by elevation ──────────────────────────────────────────────────────

describe('computeLOS — blocked by elevation', () => {
  it('intermediate hex above flat LOS line blocks LOS (LOB §4.1)', () => {
    // A(0) → B(2) → C(0): LOS flat at 0; effectiveHeight(B)=2 > 0 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 2 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(false);
    expect(result.blockedBy?.hex).toBe('10.11');
  });

  it('rising LOS clears a low intermediate hex (Sudden Dips — LOB §4.2b)', () => {
    // A(4) → B(3) → C(4): LOS flat at 4; B at 3 < 4 → clear
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 4 },
      { hex: '10.11', terrain: 'clear', elevation: 3 },
      { hex: '10.12', terrain: 'clear', elevation: 4 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(true);
  });

  it('LOB §4.2c — Same Hill rule: intermediate at same level as LOS line does not block', () => {
    // A(2) → B(2) → C(2): LOS flat at 2; effectiveHeight(B)=2, 2 NOT > 2 → clear
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 2 },
      { hex: '10.11', terrain: 'clear', elevation: 2 },
      { hex: '10.12', terrain: 'clear', elevation: 2 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(true);
  });

  it('blockedBy reports the first blocking hex in a multi-hex trace', () => {
    // A(0) → B(1) → C(2) → D(0): LOS flat at 0
    // B(1) is first blocker; C(2) also would block but B fires first
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 1 },
      { hex: '10.12', terrain: 'clear', elevation: 2 },
      { hex: '10.13', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.13', mapData, scenario);
    expect(result.canSee).toBe(false);
    expect(result.blockedBy?.hex).toBe('10.11'); // first blocker
  });
});

// ─── SM tree height override (SM §1.4) ────────────────────────────────────────

describe('computeLOS — SM tree height override (SM §1.4)', () => {
  it('woods grants +1 contour level to intermediate obstacle hex', () => {
    // A(0) → B(0, woods) → C(0): LOS flat at 0; effectiveHeight=0+1=1 > 0 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'woods', elevation: 0 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(false);
    expect(result.blockedBy?.hex).toBe('10.11');
  });

  it('woodedSloping grants +1 contour level to intermediate obstacle hex', () => {
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'woodedSloping', elevation: 0 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(false);
    expect(result.blockedBy?.hex).toBe('10.11');
  });

  it('SM +1 override passes where standard +3 would block (SM §1.4 vs base LOB)', () => {
    // 5-hex line: A(0) → B(0) → C(0,woods) → D(0) → E(4)
    // LOS at C (i=2, t=0.5): LOS line = lerp(0, 4, 0.5) = 2
    // With SM +1: effectiveHeight(C) = 0+1=1. 1 > 2? No → clear
    // With standard +3: effectiveHeight(C) = 0+3=3. 3 > 2? Yes → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 0 },
      { hex: '10.12', terrain: 'woods', elevation: 0 },
      { hex: '10.13', terrain: 'clear', elevation: 0 },
      { hex: '10.14', terrain: 'clear', elevation: 4 },
    ]);

    // SM scenario: treeLosHeight=1 → canSee=true
    const resultSM = computeLOS('10.10', '10.14', mapData, scenario);
    expect(resultSM.canSee).toBe(true);

    // Standard LOB: treeLosHeight=3 → canSee=false
    const mockScenario = { rules: { treeLosHeight: 3 } };
    const resultStandard = computeLOS('10.10', '10.14', mapData, mockScenario);
    expect(resultStandard.canSee).toBe(false);
  });

  it('LOB §4.0 — observer in woods does NOT get terrain height bonus', () => {
    // Observer in woods(elev 0), intermediate clear(elev 1), target clear(elev 0)
    // Observer height = 0 (no bonus). LOS line at B = lerp(0,0,0.5)=0. B effectiveHeight=1 > 0 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'woods', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 1 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    // Observer's woods bonus is NOT applied; intermediate still blocks
    expect(result.canSee).toBe(false);
  });

  it('LOB §4.0 — target in woods does NOT get terrain height bonus', () => {
    // Observer clear(elev 0), intermediate clear(elev 1), target woods(elev 0)
    // Target height = 0 (no bonus). LOS line at B = lerp(0,0,0.5)=0. B effectiveHeight=1 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 1 },
      { hex: '10.12', terrain: 'woods', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    // Target's woods bonus is NOT applied; intermediate still blocks
    expect(result.canSee).toBe(false);
  });
});

// ─── Orchard first-hex ignore (SM §1.4) ───────────────────────────────────────

describe('computeLOS — orchard first-hex ignore (SM §1.4)', () => {
  it('orchard immediately adjacent to observer does not receive terrain bonus', () => {
    // A(0) → B(0,orchard) → C(0): LOS flat at 0
    // Without SM rule: effectiveHeight(B)=0+1=1 > 0 → blocked
    // With SM first-hex ignore: effectiveHeight(B)=0+0=0 NOT > 0 → clear
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'orchard', elevation: 0 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(true); // first orchard hex is ignored
  });

  it('orchard at second intermediate position still receives terrain bonus', () => {
    // A(0) → B(0,clear) → C(0,orchard) → D(0): LOS flat at 0
    // C is not adjacent to observer (i=2, not i=1) → bonus applies → effectiveHeight=1 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 0 },
      { hex: '10.12', terrain: 'orchard', elevation: 0 },
      { hex: '10.13', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.13', mapData, scenario);
    expect(result.canSee).toBe(false);
    expect(result.blockedBy?.hex).toBe('10.12');
  });
});

// ─── wedgeElevations raise ground height ──────────────────────────────────────

describe('computeLOS — wedgeElevations affect ground height (LOB §4.0)', () => {
  it('max positive wedgeElevation raises effective ground height', () => {
    // Intermediate at elevation 0 with wedgeElevations max=2 → groundHeight=2
    // LOS flat at 0; effectiveHeight=2 > 0 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 0, wedgeElevations: [0, 0, 2, 0, 0, 0] },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(false);
  });

  it('all-negative wedgeElevations do not reduce ground height below hex elevation', () => {
    // Intermediate at elevation 2 with all-negative wedgeElevations
    // groundHeight = 2 + max(0, -1) = 2 + 0 = 2. LOS flat at 0; 2 > 0 → blocked
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 2, wedgeElevations: [-1, -1, -1, -1, -1, -1] },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(false); // elevation 2 alone still blocks
  });
});

// ─── Vertical slope does not block LOS ────────────────────────────────────────

describe('computeLOS — vertical slope (movement-only, LOB §4.0)', () => {
  it('verticalSlope edge feature does not create a LOS block', () => {
    // A(0) → B(0, has verticalSlope edge) → C(5)
    // LOS rises: at B (i=1, t=0.5): LOS line = lerp(0, 5, 0.5) = 2.5
    // B effectiveHeight = 0 + 0 = 0. 0 > 2.5? No → clear
    // (The verticalSlope edge type is movement-only and has no LOS effect)
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'clear', elevation: 0, edges: { 0: [{ type: 'verticalSlope' }] } },
      { hex: '10.12', terrain: 'clear', elevation: 5 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(true);
  });
});

// ─── Unknown / undigitized hexes ──────────────────────────────────────────────

describe('computeLOS — undigitized hexes', () => {
  it('undigitized intermediate hex (not in map) is treated as elevation 0, no bonus → does not block', () => {
    // Only A and C in the hexes array; B is missing from map data
    // B defaults to elevation 0, terrain 'unknown' → effectiveHeight=0. LOS flat at 0 → clear
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      // 10.11 intentionally absent
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, scenario);
    expect(result.canSee).toBe(true);
  });
});

// ─── Data-driven terrain LOS heights (#289) ───────────────────────────────────

describe('computeLOS — data-driven terrainLosHeights (#289)', () => {
  it('terrainLosHeights in scenario overrides hardcoded flag: woods=0 makes woods transparent', () => {
    // LOB §4.0 / SM §1.4 — terrain height bonuses should come from scenario.json
    // Override: set woods height flag to 0 → woods intermediate hex no longer blocks
    const mockScenario = {
      rules: {
        treeLosHeight: 1,
        terrainLosHeights: { woods: 0, woodedSloping: 1, orchard: 1 },
      },
    };
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'woods', elevation: 0 }, // would block at height 1 w/ default
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, mockScenario);
    // With terrainLosHeights.woods=0, woods gets no height bonus → LOS line = 0, height = 0 → clear
    expect(result.canSee).toBe(true);
  });

  it('terrainLosHeights can grant bonus to a new terrain type not in the hardcoded map', () => {
    // Extensibility: a terrain like 'marsh' (flag=0 by default) can be granted height bonus
    const mockScenario = {
      rules: {
        treeLosHeight: 2,
        terrainLosHeights: { marsh: 1 }, // marsh now grants treeLosHeight bonus
      },
    };
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'marsh', elevation: 0 }, // default: no bonus → would not block
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, mockScenario);
    // treeLosHeight=2, marsh flag=1 → effectiveHeight=2 > LOS line 0 → blocked
    expect(result.canSee).toBe(false);
    expect(result.blockedBy?.hex).toBe('10.11');
  });

  it('falls back to hardcoded TERRAIN_LOS_HEIGHT_FLAG when scenario has no terrainLosHeights', () => {
    // Backward-compatibility: existing scenario fixture (no terrainLosHeights) still works
    const mockScenario = { rules: { treeLosHeight: 1 } };
    const mapData = makeMapData([
      { hex: '10.10', terrain: 'clear', elevation: 0 },
      { hex: '10.11', terrain: 'woods', elevation: 0 },
      { hex: '10.12', terrain: 'clear', elevation: 0 },
    ]);
    const result = computeLOS('10.10', '10.12', mapData, mockScenario);
    // Hardcoded fallback: woods=1 → blocks
    expect(result.canSee).toBe(false);
  });
});

// ─── Real SM map data ──────────────────────────────────────────────────────────

describe('computeLOS — real SM map data', () => {
  it('same hex on real SM map returns canSee=true', () => {
    const result = computeLOS('19.23', '19.23', realMap, scenario);
    expect(result.canSee).toBe(true);
  });

  it("LOB §4.2a — adjacent VP hexes on Fox's Gap are always clear", () => {
    // 19.23 (elevation 12, clear) and 20.23 (elevation 12, clear) — range 1
    const result = computeLOS('19.23', '20.23', realMap, scenario);
    expect(result.canSee).toBe(true);
  });

  it('computeLOS returns a trace array of hex IDs', () => {
    const result = computeLOS('19.23', '22.23', realMap, scenario);
    expect(Array.isArray(result.trace)).toBe(true);
    expect(result.trace[0]).toBe('19.23');
    expect(result.trace[result.trace.length - 1]).toBe('22.23');
  });
});
