/**
 * Tests for server/src/engine/command-range.js
 *
 * LOB §10.6a — command radius is traced as MP path cost using leader movement costs.
 * SM §1.1a   — road slope penalty waived when tracing command radius along a Road.
 * LOB §10.6a — beyondRadiusFar threshold: ≥50 hexes (cube distance) between HQs.
 *
 * Hex ID format: zero-padded "col.row" (e.g. "10.09").
 * Neighbours of "10.10": N="10.11", NE="11.11", SE="11.10", S="10.09", SW="09.10", NW="09.11"
 * Southward chain from "10.10": 10.10 → 10.09 → 10.08 → 10.07 → 10.06 → 10.05 → 10.04 → 10.03
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { BEYOND_RADIUS_FAR_THRESHOLD, COMMAND_RADII, commandRange } from './command-range.js';
import { loadScenario } from './scenario.js';

// ─── Shared fixtures ───────────────────────────────────────────────────────────

let scenario;

beforeAll(() => {
  scenario = loadScenario();
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

/** Clear terrain hex with no hexsides or wedge elevations (undefined = no slope data). */
function clearHex(id) {
  return { hex: id, terrain: 'clear', elevation: 0 };
}

// ─── COMMAND_RADII constants ───────────────────────────────────────────────────

describe('COMMAND_RADII', () => {
  it('brigade = 3 MP', () => {
    expect(COMMAND_RADII.brigade).toBe(3); // LOB §10.6a
  });

  it('division = 6 MP', () => {
    expect(COMMAND_RADII.division).toBe(6); // LOB §10.6a
  });

  it('corps = 8 MP', () => {
    expect(COMMAND_RADII.corps).toBe(8); // LOB §10.6a
  });

  it('army = 12 MP', () => {
    expect(COMMAND_RADII.army).toBe(12); // LOB §10.6a
  });
});

// ─── BEYOND_RADIUS_FAR_THRESHOLD ──────────────────────────────────────────────

describe('BEYOND_RADIUS_FAR_THRESHOLD', () => {
  it('equals 50', () => {
    expect(BEYOND_RADIUS_FAR_THRESHOLD).toBe(50); // LOB §10.6a
  });
});

// ─── commandRange — input validation ──────────────────────────────────────────

describe('commandRange — input validation', () => {
  it('throws on unknown commander level', () => {
    const mapData = makeMapData([clearHex('10.10')]);
    expect(() => commandRange('10.10', 'platoon', mapData, scenario)).toThrow(
      /unknown commander level/i
    );
  });
});

// ─── commandRange — zone classification (brigade = 3 MP, clear terrain) ───────
//
// South chain from 10.10: 10.09 (cost 1), 10.08 (cost 2), 10.07 (cost 3), 10.06 (cost 4).
// All within mapData so Dijkstra can traverse. SE neighbour 11.10 is also in mapData.

describe('commandRange — withinRadius zone (brigade = 3 MP, clear terrain)', () => {
  const hexIds = [
    '10.10', // start
    '10.11', // N neighbour (ring 1)
    '11.10', // SE neighbour (ring 1)
    '10.09', // S (ring 1, cost 1)
    '09.10', // SW (ring 1)
    '10.08', // S×2 (ring 2, cost 2)
    '10.07', // S×3 (ring 3, cost 3) — within brigade radius
    '10.06', // S×4 (ring 4, cost 4) — beyond brigade radius
  ];
  const mapData = makeMapData(hexIds.map(clearHex));

  it('returns three zone arrays', () => {
    const result = commandRange('10.10', 'brigade', mapData, scenario);
    expect(result).toHaveProperty('withinRadius');
    expect(result).toHaveProperty('beyondRadius');
    expect(result).toHaveProperty('beyondRadiusFar');
  });

  it('start hex is in withinRadius (cost 0 ≤ 3)', () => {
    const { withinRadius } = commandRange('10.10', 'brigade', mapData, scenario);
    expect(withinRadius).toContain('10.10');
  });

  it('ring-1 hexes are within brigade radius (cost 1 ≤ 3)', () => {
    const { withinRadius } = commandRange('10.10', 'brigade', mapData, scenario);
    expect(withinRadius).toContain('10.09'); // S neighbour
    expect(withinRadius).toContain('11.10'); // SE neighbour
  });

  it('ring-3 hex is within brigade radius (cost 3 ≤ 3)', () => {
    const { withinRadius } = commandRange('10.10', 'brigade', mapData, scenario);
    expect(withinRadius).toContain('10.07');
  });

  it('ring-4 hex is in beyondRadius (cost 4 > 3, cube dist < 50)', () => {
    const { withinRadius, beyondRadius } = commandRange('10.10', 'brigade', mapData, scenario);
    expect(withinRadius).not.toContain('10.06');
    expect(beyondRadius).toContain('10.06');
  });

  it('no hex appears in more than one zone', () => {
    const { withinRadius, beyondRadius, beyondRadiusFar } = commandRange(
      '10.10',
      'brigade',
      mapData,
      scenario
    );
    const all = [...withinRadius, ...beyondRadius, ...beyondRadiusFar];
    expect(new Set(all).size).toBe(all.length);
  });
});

// ─── commandRange — larger radius (division = 6 MP, clear terrain) ────────────

describe('commandRange — larger radius (division = 6 MP, clear terrain)', () => {
  // South chain 10.10 → 10.03 (7 hops)
  const hexIds = ['10.10', '10.09', '10.08', '10.07', '10.06', '10.05', '10.04', '10.03'];
  const mapData = makeMapData(hexIds.map(clearHex));

  it('ring-6 hex within division radius (cost 6 ≤ 6)', () => {
    const { withinRadius } = commandRange('10.10', 'division', mapData, scenario);
    expect(withinRadius).toContain('10.04');
  });

  it('ring-7 hex beyond division radius (cost 7 > 6)', () => {
    const { withinRadius, beyondRadius } = commandRange('10.10', 'division', mapData, scenario);
    expect(withinRadius).not.toContain('10.03');
    expect(beyondRadius).toContain('10.03');
  });
});

// ─── commandRange — SM §1.1a road slope penalty waived ────────────────────────

describe('commandRange — SM §1.1a road slope penalty waived', () => {
  // South chain 10.10 → 10.04 (6 hops).
  // Moving S (dirIndex=3): edge features read from toHex.edges['0'] (canonical ownership).
  // Each destination hex has edges['0'] = [road, slope] — road triggers usingRoadMovement,
  // slope adds the roadSlopePenalty (0.5 MP) unless waived by SM §1.1a.
  //
  // Without §1.1a waiver: road 0.5 + slope penalty 0.5 = 1.0 MP per hop.
  //   6 hops × 1.0 = 6.0 MP > brigade radius 3 → 10.04 NOT reachable.
  // With §1.1a waiver (commandRange zeroes roadSlopePenalty): road 0.5 only.
  //   6 hops × 0.5 = 3.0 MP ≤ brigade radius 3 → 10.04 IS reachable.
  const roadSlopeEdge = { 0: [{ type: 'road' }, { type: 'slope' }] };
  const hexes = [
    { hex: '10.10', terrain: 'clear' }, // start — no edges needed
    { hex: '10.09', terrain: 'clear', edges: roadSlopeEdge },
    { hex: '10.08', terrain: 'clear', edges: roadSlopeEdge },
    { hex: '10.07', terrain: 'clear', edges: roadSlopeEdge },
    { hex: '10.06', terrain: 'clear', edges: roadSlopeEdge },
    { hex: '10.05', terrain: 'clear', edges: roadSlopeEdge },
    { hex: '10.04', terrain: 'clear', edges: roadSlopeEdge },
  ];
  const mapData = makeMapData(hexes);

  it('6 road-slope hops reachable within brigade radius (3 MP) with penalty waived', () => {
    const { withinRadius } = commandRange('10.10', 'brigade', mapData, scenario);
    expect(withinRadius).toContain('10.04');
  });
});

// ─── commandRange — beyondRadiusFar threshold ─────────────────────────────────

describe('commandRange — beyondRadiusFar (cube distance ≥ 50)', () => {
  // hexDistance("01.01", "55.01") = 54 (verified by calculation)
  it('hex at cube distance ≥ 50 from commander placed in beyondRadiusFar', () => {
    const mapData = makeMapData([clearHex('01.01'), clearHex('55.01')]);
    const { beyondRadius, beyondRadiusFar } = commandRange('01.01', 'brigade', mapData, scenario);
    // 55.01 is beyond brigade radius 3 MP AND cube distance 54 ≥ 50
    expect(beyondRadius).not.toContain('55.01');
    expect(beyondRadiusFar).toContain('55.01');
  });

  it('hex at cube distance < 50 placed in beyondRadius not beyondRadiusFar', () => {
    // hexDistance("10.10", "10.06") = 4 (< 50)
    const mapData = makeMapData([clearHex('10.10'), clearHex('10.06')]);
    const { beyondRadius, beyondRadiusFar } = commandRange('10.10', 'brigade', mapData, scenario);
    expect(beyondRadius).toContain('10.06');
    expect(beyondRadiusFar).not.toContain('10.06');
  });
});
