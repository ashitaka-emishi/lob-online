import { describe, it, expect } from 'vitest';

import {
  computeTerrainVP,
  isVpControlEligible,
  updateHexControl,
  computeWreckVP,
  computeVP,
  evaluateVictory,
} from './vp.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TERRAIN_VP = [
  { hex: '19.23', unionVP: 4, confederateVP: 3 },
  { hex: '39.34', unionVP: 6, confederateVP: 2 },
  { hex: '16.02', unionVP: 0, confederateVP: 10 },
];

const VICTORY_RESULTS = [
  { label: 'Confederate Massive Victory', min: null, max: -6 },
  { label: 'Confederate Major Victory', min: -5, max: 1 },
  { label: 'Confederate Marginal Victory', min: 2, max: 8 },
  { label: 'Draw', min: 9, max: 15 },
  { label: 'Union Marginal Victory', min: 16, max: 20 },
  { label: 'Union Major Victory', min: 21, max: 29 },
  { label: 'Union Massive Victory', min: 30, max: null },
];

function makeUnit(id, overrides = {}) {
  return {
    id,
    hex: '05.05',
    facing: 0,
    moraleState: 'normal',
    wrecked: false,
    orders: null,
    ammo: 'full',
    depletionMarker: false,
    cbfMarker: false,
    isOnBoard: true,
    entryTurn: null,
    isDetached: false,
    ...overrides,
  };
}

// Minimal OOB for wreck VP tests
const MOCK_OOB = {
  union: {
    corps: [
      {
        id: '9c',
        divisions: [
          {
            id: '1d-9c',
            brigades: [
              {
                id: '1b-1d-9c',
                regiments: [{ id: 'r1', strengthPoints: 4 }],
              },
            ],
          },
        ],
      },
    ],
    cavalryDivision: {
      id: 'cav-div',
      artillery: {},
      brigades: [
        {
          id: 'fcav',
          regiments: [{ id: 'fcav-r1', strengthPoints: 6 }],
        },
      ],
    },
  },
  confederate: {
    divisions: [
      {
        id: 'dh-div',
        brigades: [
          {
            id: 'adh',
            regiments: [{ id: 'adh-r1', strengthPoints: 4 }],
          },
        ],
      },
    ],
    reserveArtillery: { batteries: [] },
    independent: { artillery: [], cavalry: [] },
  },
};

const WRECK_VP = {
  confederate: {
    perBrigadeWrecked: 1,
    perArtilleryEliminated: 0.5,
    dhDivisionWrecked: 2,
    jDivisionWrecked: 2,
    hDivisionWrecked: 1,
    '5thVaCavWrecked': 2,
  },
  union: {
    perBrigadeWrecked: 1,
    perArtilleryEliminated: 1,
    div1of1Wrecked: 3,
    div2of1Wrecked: 2,
    div3of1Wrecked: 2,
    div1of9Wrecked: 1,
    div2of9Wrecked: 1,
    div3of9Wrecked: 1,
    divKof9Wrecked: 1,
    fcavBrigadeWrecked: 3,
  },
};

// ─── computeTerrainVP tests ────────────────────────────────────────────────────

describe('computeTerrainVP', () => {
  it('awards Union VP for Union-controlled hex (SM §5.1)', () => {
    const hexControl = { 19.23: 'union' };
    const { union, confederate } = computeTerrainVP(hexControl, TERRAIN_VP);
    expect(union).toBe(4);
    expect(confederate).toBe(0);
  });

  it('awards Confederate VP for Confederate-controlled hex (SM §5.1)', () => {
    const hexControl = { 19.23: 'confederate' };
    const { union, confederate } = computeTerrainVP(hexControl, TERRAIN_VP);
    expect(union).toBe(0);
    expect(confederate).toBe(3);
  });

  it('does not award VP for uncontrolled hex (SM §5.1)', () => {
    const hexControl = {};
    const result = computeTerrainVP(hexControl, TERRAIN_VP);
    expect(result.union).toBe(0);
    expect(result.confederate).toBe(0);
  });

  it('does not award VP when side has 0 VP for that hex (SM §5.1 — 16.02 unionVP=0)', () => {
    const hexControl = { 16.02: 'union' }; // union earns 0 VP for 16.02
    const { union } = computeTerrainVP(hexControl, TERRAIN_VP);
    expect(union).toBe(0);
  });

  it('sums VP across multiple controlled hexes', () => {
    const hexControl = { 19.23: 'union', 39.34: 'union' };
    const { union } = computeTerrainVP(hexControl, TERRAIN_VP);
    expect(union).toBe(4 + 6);
  });

  it('includes hex in vpLog', () => {
    const hexControl = { 19.23: 'union' };
    const { log } = computeTerrainVP(hexControl, TERRAIN_VP);
    expect(log.some((e) => e.hex === '19.23' && e.side === 'union')).toBe(true);
  });
});

// ─── isVpControlEligible tests ────────────────────────────────────────────────

describe('isVpControlEligible', () => {
  it('returns true for on-board non-Routed infantry (SM §5.1)', () => {
    const unit = makeUnit('u1');
    const oobUnit = { type: 'infantry' };
    expect(isVpControlEligible(unit, oobUnit)).toBe(true);
  });

  it('returns false for Routed infantry (SM §5.1)', () => {
    const unit = makeUnit('u1', { moraleState: 'routed' });
    const oobUnit = { type: 'infantry' };
    expect(isVpControlEligible(unit, oobUnit)).toBe(false);
  });

  it('returns false for cavalry (SM §5.1)', () => {
    const unit = makeUnit('u1');
    const oobUnit = { type: 'cavalry' };
    expect(isVpControlEligible(unit, oobUnit)).toBe(false);
  });

  it('returns true for unlimbered artillery (SM §5.1)', () => {
    const unit = makeUnit('u1', { formation: 'unlimbered' });
    const oobUnit = { gunType: 'R' };
    expect(isVpControlEligible(unit, oobUnit)).toBe(true);
  });

  it('returns false for limbered artillery (SM §5.1)', () => {
    const unit = makeUnit('u1', { formation: 'limbered' });
    const oobUnit = { gunType: 'R' };
    expect(isVpControlEligible(unit, oobUnit)).toBe(false);
  });

  it('returns false for off-board unit', () => {
    const unit = makeUnit('u1', { isOnBoard: false });
    const oobUnit = { type: 'infantry' };
    expect(isVpControlEligible(unit, oobUnit)).toBe(false);
  });
});

// ─── updateHexControl tests ────────────────────────────────────────────────────

describe('updateHexControl', () => {
  const vpHexSet = new Set(['19.23', '39.34']);
  const infUnit = makeUnit('u1', { hex: '19.23' });
  const infOob = { type: 'infantry' };

  it('sets control when qualifying infantry enters VP hex (SM §5.1)', () => {
    const result = updateHexControl({}, '19.23', 'union', infUnit, infOob, vpHexSet);
    expect(result['19.23']).toBe('union');
  });

  it('does not change hexControl for non-VP hex', () => {
    const result = updateHexControl({}, '05.05', 'union', infUnit, infOob, vpHexSet);
    expect(result['05.05']).toBeUndefined();
  });

  it('does not change hexControl for non-qualifying unit (cavalry)', () => {
    const cavUnit = makeUnit('u1');
    const cavOob = { type: 'cavalry' };
    const result = updateHexControl({}, '19.23', 'union', cavUnit, cavOob, vpHexSet);
    expect(result['19.23']).toBeUndefined();
  });

  it('transfers control from confederate to union when qualifying unit enters', () => {
    const initial = { 19.23: 'confederate' };
    const result = updateHexControl(initial, '19.23', 'union', infUnit, infOob, vpHexSet);
    expect(result['19.23']).toBe('union');
  });

  it('does not mutate input hexControl', () => {
    const input = { 19.23: 'confederate' };
    const snap = { ...input };
    updateHexControl(input, '19.23', 'union', infUnit, infOob, vpHexSet);
    expect(input).toEqual(snap);
  });
});

// ─── computeWreckVP tests ─────────────────────────────────────────────────────

describe('computeWreckVP', () => {
  it('awards Union VP when CSA brigade regiment is wrecked (SM §5.2 / LOB §5.7)', () => {
    const units = {
      'adh-r1': makeUnit('adh-r1', { strengthPoints: 1 }), // 1/4 = wrecked (< 50%)
    };
    const { union } = computeWreckVP(units, MOCK_OOB, WRECK_VP);
    expect(union).toBeGreaterThanOrEqual(1);
  });

  it('awards dh-div division bonus when all brigades in dh-div are wrecked (SM §5.2 additive)', () => {
    const units = {
      'adh-r1': makeUnit('adh-r1', { strengthPoints: 1 }), // wrecked
    };
    const { union, log } = computeWreckVP(units, MOCK_OOB, WRECK_VP);
    // dh-div has only 1 brigade (adh) in MOCK_OOB — it's wrecked → division also wrecked
    expect(log.some((e) => e.reason.includes('dh-div') && e.reason.includes('bonus'))).toBe(true);
    expect(union).toBe(1 + 2); // 1 per-brigade + 2 division bonus
  });

  it('does not award wreck VP when unit is above 50% printed SPs (LOB §5.7)', () => {
    const units = {
      'adh-r1': makeUnit('adh-r1', { strengthPoints: 3 }), // 3/4 = not wrecked
    };
    const { union } = computeWreckVP(units, MOCK_OOB, WRECK_VP);
    expect(union).toBe(0);
  });

  it('awards Confederate VP when Union brigade is wrecked (SM §5.2)', () => {
    const units = {
      r1: makeUnit('r1', { strengthPoints: 1 }), // 1/4 = wrecked
    };
    const { confederate } = computeWreckVP(units, MOCK_OOB, WRECK_VP);
    expect(confederate).toBeGreaterThanOrEqual(1);
  });

  it('awards fcav brigade bonus when fcav regiment is wrecked (SM §5.2)', () => {
    const units = {
      'fcav-r1': makeUnit('fcav-r1', { strengthPoints: 2 }), // 2/6 = wrecked
    };
    const { confederate, log } = computeWreckVP(units, MOCK_OOB, WRECK_VP);
    expect(log.some((e) => e.reason === 'fcav brigade wrecked')).toBe(true);
    // SM §5.2 — fcav is a standalone entry (3 VP total), not per-brigade + bonus
    expect(confederate).toBe(3);
  });
});

// ─── evaluateVictory tests ────────────────────────────────────────────────────

describe('evaluateVictory', () => {
  it('Confederate Massive Victory at -6 (SM §5.3)', () => {
    expect(evaluateVictory(-6, VICTORY_RESULTS)).toBe('Confederate Massive Victory');
  });

  it('Confederate Massive Victory below -6 (SM §5.3 — null min = open-ended)', () => {
    expect(evaluateVictory(-100, VICTORY_RESULTS)).toBe('Confederate Massive Victory');
  });

  it('Confederate Major Victory at -5 (SM §5.3)', () => {
    expect(evaluateVictory(-5, VICTORY_RESULTS)).toBe('Confederate Major Victory');
  });

  it('Confederate Major Victory at +1 (SM §5.3)', () => {
    expect(evaluateVictory(1, VICTORY_RESULTS)).toBe('Confederate Major Victory');
  });

  it('Draw at +9 (SM §5.3)', () => {
    expect(evaluateVictory(9, VICTORY_RESULTS)).toBe('Draw');
  });

  it('Draw at +15 (SM §5.3)', () => {
    expect(evaluateVictory(15, VICTORY_RESULTS)).toBe('Draw');
  });

  it('Union Major Victory at +21 (SM §5.3)', () => {
    expect(evaluateVictory(21, VICTORY_RESULTS)).toBe('Union Major Victory');
  });

  it('Union Massive Victory at +30 (SM §5.3)', () => {
    expect(evaluateVictory(30, VICTORY_RESULTS)).toBe('Union Massive Victory');
  });

  it('Union Massive Victory above +30 (SM §5.3 — null max = open-ended)', () => {
    expect(evaluateVictory(999, VICTORY_RESULTS)).toBe('Union Massive Victory');
  });

  it('returns null for empty results array', () => {
    expect(evaluateVictory(10, [])).toBeNull();
  });
});

// ─── computeVP integration test ───────────────────────────────────────────────

describe('computeVP', () => {
  it('returns net = union - confederate (SM §5.0)', () => {
    const state = {
      hexControl: { 19.23: 'union' }, // 4 union VP
      units: {},
    };
    const scenario = { victoryPoints: { terrain: TERRAIN_VP, wreck: WRECK_VP } };
    const { union, confederate, net } = computeVP(state, MOCK_OOB, scenario);
    expect(net).toBe(union - confederate);
    expect(union).toBeGreaterThanOrEqual(4);
  });

  it('handles missing hexControl gracefully', () => {
    const state = { units: {} }; // no hexControl
    const scenario = { victoryPoints: { terrain: TERRAIN_VP, wreck: WRECK_VP } };
    const result = computeVP(state, MOCK_OOB, scenario);
    expect(result.union).toBe(0);
    expect(result.confederate).toBe(0);
  });

  // updateHexControl → computeVP round-trip: wiring is ready; MOVE action (#634) will call it
  it('terrain VP increases when updateHexControl records a qualifying unit on a VP hex', () => {
    const vpHexSet = new Set(['19.23']);
    const infUnit = makeUnit('u1', { hex: '19.23' });
    const infOob = { type: 'infantry' };
    const hexControl = updateHexControl({}, '19.23', 'union', infUnit, infOob, vpHexSet);

    const state = { hexControl, units: {} };
    const scenario = { victoryPoints: { terrain: TERRAIN_VP, wreck: WRECK_VP } };
    const { union } = computeVP(state, MOCK_OOB, scenario);
    expect(union).toBeGreaterThanOrEqual(4); // 19.23 is worth 4 VP in TERRAIN_VP fixture
  });
});
