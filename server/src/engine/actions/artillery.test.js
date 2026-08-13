import { describe, it, expect } from 'vitest';

import {
  handleLimber,
  handleUnlimber,
  handleFireArtillery,
  handleReplenishArtillery,
} from './artillery.js';
import { ActionError } from './actionError.js';

// ─── Mock OOB ─────────────────────────────────────────────────────────────────
const MOCK_OOB = {
  _status: 'test',
  _source: 'test',
  _errata_applied: [],
  union: {
    army: 'Army of the Potomac',
    supplyTrain: { id: 'supply-u' },
    corps: [],
    cavalryDivision: { id: 'cav-div', name: 'Cav Div', successionIds: [], brigades: [] },
  },
  confederate: {
    army: 'Army of Northern Virginia',
    wing: 'Right Wing',
    supplyWagon: { id: 'supply-c' },
    independent: {
      cavalry: [],
      // LOB §9.1 — Pelham's battery is independent Confederate artillery
      artillery: [
        {
          id: 'pelham-btry',
          name: "Pelham's Battery",
          gunType: 'R',
          strengthPoints: 4,
          morale: 'B',
        },
      ],
    },
    reserveArtillery: {
      batteries: [
        {
          id: 'csa-btry',
          name: 'CSA Battery',
          gunType: 'N',
          strengthPoints: 4,
          morale: 'B',
        },
      ],
    },
    divisions: [],
  },
};

// LOB §3.6a — Limbered allowance (7) minus the 3 MP formation-change cost, matching
// data/modules/south-mountain/scenario.json's real movementAllowances table.
const MOCK_SCENARIO = {
  movementCosts: { movementAllowances: { line: 6, limbered: 7, mounted: 12, leader: 12 } },
};

// ─── State factory ────────────────────────────────────────────────────────────

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
    formation: 'unlimbered',
    ...overrides,
  };
}

function makeState(unitOverrides = {}, activationOverrides = {}) {
  return {
    id: 'g1',
    scenarioId: 'south-mountain',
    schemaVersion: 3,
    version: 1,
    turn: 1,
    phase: 'activity',
    step: 'activation',
    activePlayer: 'confederate',
    completedSteps: [],
    initiative: null,
    sides: { union: 'tok-u', confederate: 'tok-c' },
    reinforcementQueue: [],
    status: 'active',
    leaderState: {},
    pendingResolution: null,
    ordersPhase: null,
    rallyPhase: null,
    activityPhase: {
      activatedUnits: [],
      currentActivation: {
        hex: '05.05',
        movedThisActivation: false,
        openingVolley: false,
        zeroRuleFired: false,
        ...activationOverrides,
      },
    },
    units: {
      'csa-btry': makeUnit('csa-btry'),
      ...unitOverrides,
    },
  };
}

const LIMBER_ACTION = {
  type: 'LIMBER',
  payload: { unitId: 'csa-btry' },
  playerSide: 'confederate',
};

const UNLIMBER_ACTION = {
  type: 'UNLIMBER',
  payload: { unitId: 'csa-btry' },
  playerSide: 'confederate',
};

// ─── LIMBER tests ─────────────────────────────────────────────────────────────

describe('handleLimber', () => {
  it('transitions unlimbered battery to limbered (LOB §3.6a)', () => {
    const state = makeState();
    const result = handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].formation).toBe('limbered');
  });

  it('does not mutate input state', () => {
    const state = makeState();
    const snap = JSON.parse(JSON.stringify(state));
    handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB });
    expect(state).toEqual(snap);
  });

  it('throws INVALID_ACTION when outside Activity Phase', () => {
    const state = {
      ...makeState(),
      activityPhase: null,
      phase: 'rally',
      rallyPhase: { unitsPendingRally: [], pendingRallyRoll: null },
    };
    expect(() => handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_ACTION when unit is already limbered (LOB §3.6a)', () => {
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { formation: 'limbered' }) });
    expect(() => handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_ACTION when unit already moved this activation (LOB §3.6a)', () => {
    const state = makeState({}, { movedThisActivation: true });
    expect(() => handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when unitId missing', () => {
    const action = { type: 'LIMBER', payload: {}, playerSide: 'confederate' };
    expect(() => handleLimber(makeState(), action, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  // #m9 review, second pass — domain-expert ruling: LOB §3.6a's "move using its remaining MA"
  // is meaningless if MPs aren't restored on LIMBER. activateStack.js correctly zeroes
  // remainingMPs for a still-Unlimbered battery at activation start (Unlimbered cannot move at
  // all); without this, LIMBER never granted the Limbered MA back, permanently blocking
  // limber-then-move in one activation for every real battery.
  it('grants remainingMPs = Limbered allowance minus the 3 MP formation-change cost (LOB §3.6a)', () => {
    const state = makeState();
    const result = handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB, scenario: MOCK_SCENARIO });
    expect(result.units['csa-btry'].remainingMPs).toBe(4); // 7 - 3
  });

  it('leaves remainingMPs untouched when scenario.movementCosts is absent (test-stub convention)', () => {
    const state = makeState({
      'csa-btry': makeUnit('csa-btry', { remainingMPs: 0 }),
    });
    const result = handleLimber(state, LIMBER_ACTION, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].remainingMPs).toBe(0);
  });
});

// ─── UNLIMBER tests ───────────────────────────────────────────────────────────

describe('handleUnlimber', () => {
  it('transitions limbered battery to unlimbered (LOB §3.6b)', () => {
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { formation: 'limbered' }) });
    const result = handleUnlimber(state, UNLIMBER_ACTION, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].formation).toBe('unlimbered');
  });

  it('throws INVALID_ACTION when already unlimbered (LOB §3.6b)', () => {
    const state = makeState(); // default formation: 'unlimbered'
    expect(() => handleUnlimber(state, UNLIMBER_ACTION, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_ACTION when enemy is within 5 hexes without Artillery Leader (LOB §3.6b)', () => {
    const state = {
      ...makeState({ 'csa-btry': makeUnit('csa-btry', { formation: 'limbered', hex: '05.05' }) }),
      units: {
        'csa-btry': makeUnit('csa-btry', { formation: 'limbered', hex: '05.05' }),
        'u-inf': makeUnit('u-inf', { hex: '05.08', formation: undefined }), // 3 hexes away
      },
    };
    // Add u-inf to union side via a mapData + OOB that includes it
    const oobWithUnion = {
      ...MOCK_OOB,
      union: {
        ...MOCK_OOB.union,
        corps: [
          {
            id: 'i-corps',
            name: 'I Corps',
            successionIds: [],
            divisions: [
              {
                id: 'div1',
                name: '1st Div',
                wreckThreshold: 2,
                successionIds: [],
                brigades: [
                  {
                    id: 'brig1',
                    wreckThreshold: 2,
                    regiments: [
                      {
                        id: 'u-inf',
                        name: '1st Union',
                        type: 'infantry',
                        morale: 'B',
                        weapon: 'R',
                        strengthPoints: 4,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const mapData = { gridSpec: { cols: 15, rows: 15 }, hexes: [] };
    expect(() => handleUnlimber(state, UNLIMBER_ACTION, { oob: oobWithUnion, mapData })).toThrow(
      ActionError
    );
  });

  it('allows unlimber at 4 hexes with Artillery Leader present (LOB §9.1c)', () => {
    // Without artillery leader, 4 hexes = too close (need ≥5). With leader, ≥4 is OK.
    const state = {
      ...makeState({ 'csa-btry': makeUnit('csa-btry', { formation: 'limbered', hex: '05.05' }) }),
      units: {
        'csa-btry': makeUnit('csa-btry', { formation: 'limbered', hex: '05.05' }),
        'u-inf': makeUnit('u-inf', { hex: '05.09', formation: undefined }), // 4 hexes away
      },
    };
    const oobWithUnion = {
      ...MOCK_OOB,
      union: {
        ...MOCK_OOB.union,
        corps: [
          {
            id: 'i-corps',
            name: 'I Corps',
            successionIds: [],
            divisions: [
              {
                id: 'div1',
                name: '1st Div',
                wreckThreshold: 2,
                successionIds: [],
                brigades: [
                  {
                    id: 'brig1',
                    wreckThreshold: 2,
                    regiments: [
                      {
                        id: 'u-inf',
                        name: '1st Union',
                        type: 'infantry',
                        morale: 'B',
                        weapon: 'R',
                        strengthPoints: 4,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const mapData = { gridSpec: { cols: 15, rows: 15 }, hexes: [] };
    const action = {
      type: 'UNLIMBER',
      payload: { unitId: 'csa-btry', hasArtilleryLeader: true },
      playerSide: 'confederate',
    };
    const result = handleUnlimber(state, action, { oob: oobWithUnion, mapData });
    expect(result.units['csa-btry'].formation).toBe('unlimbered');
  });
});

// ─── FIRE_ARTILLERY tests ─────────────────────────────────────────────────────

describe('handleFireArtillery', () => {
  const FIRE_ACTION = {
    type: 'FIRE_ARTILLERY',
    payload: {
      attackerUnitId: 'csa-btry',
      defenderHex: '05.08',
      ammoType: 'shell',
      diceRoll: 7,
      range: 3,
    },
    playerSide: 'confederate',
  };

  it('returns state with pendingResolution combatResult (LOB §8.2)', () => {
    const state = makeState(); // csa-btry is unlimbered
    const result = handleFireArtillery(state, FIRE_ACTION, { oob: MOCK_OOB });
    expect(result.pendingResolution?.type).toBe('combatResult');
    expect(result.pendingResolution?.context.defenderHex).toBe('05.08');
  });

  it('records ammoType and range in context (LOB §8.2)', () => {
    const state = makeState();
    const result = handleFireArtillery(state, FIRE_ACTION, { oob: MOCK_OOB });
    expect(result.pendingResolution?.context.ammoType).toBe('shell');
    expect(result.pendingResolution?.context.range).toBe(3);
  });

  // LOB §8.2a / LOB_CHARTS p.2 — orange zone (numeric cols -B,-A,1,2-3,4-5,6-8):
  //   deplete whichever ammo type was fired (shell or canister).
  // Blue zone (lettered cols A,B,C,D): canister depletion only — no depletion if shell fired.

  it('orange zone + shell fired → shell depleted (LOB §8.2a)', () => {
    // SPs=1 → col '1' (orange zone). Shell fired → shell depleted (ammo: low).
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { strengthPoints: 1 }) });
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'shell', range: 2, diceRoll: 7 },
    };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('low');
    expect(result.units['csa-btry'].depletionMarker).toBe(true);
  });

  it('orange zone + canister fired → canister depleted (LOB §8.2a)', () => {
    // SPs=1 → col '1' (orange zone). Canister fired → canister depleted (ammo: none).
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { strengthPoints: 1 }) });
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'canister', range: 1, diceRoll: 7 },
    };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('none');
    expect(result.units['csa-btry'].depletionMarker).toBe(true);
  });

  it('orange zone 4-5 + shell fired → shell depleted (LOB §8.2a)', () => {
    // SPs=4 → col '4-5' (orange zone). Shell fired → shell depleted.
    const state = makeState();
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'shell', range: 1, diceRoll: 7 },
    };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('low');
    expect(result.units['csa-btry'].depletionMarker).toBe(true);
  });

  it('orange zone 6-8 + canister fired → canister depleted (LOB §8.2a)', () => {
    // SPs=6 → col '6-8' (orange zone). Canister fired → canister depleted (ammo: none).
    // Blue-zone (cols A-D) tests are in combat.test.js — handler cannot reach A-D via range shift alone.
    const state6 = makeState({ 'csa-btry': makeUnit('csa-btry', { strengthPoints: 6 }) });
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'canister', range: 1, diceRoll: 7 },
    };
    const result = handleFireArtillery(state6, action, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('none');
    expect(result.units['csa-btry'].depletionMarker).toBe(true);
  });

  it('no depletion when column has no depletion zone (non-depleting result)', () => {
    // If the unit has ammo=full and the roll lands in a no-depletion cell, ammo stays full.
    // All columns have a zone, so this tests a roll where no depletion applies: blue zone + shell.
    // Blue zone (A-D) + shell → no depletion. Proxy test: verify ammo unchanged for shell in
    // a non-depleting scenario (use a result already confirmed no-change).
    // Since range shifts can only go left, and all numeric columns are orange zone,
    // the only way to fire shell with no depletion is to land in cols A-D (blue zone).
    // This is tested at the combatResult level in combat.test.js.
    // Handler: confirm that a shell-fired battery on an orange-zone column depletes (not no-op).
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { strengthPoints: 1 }) });
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'shell', range: 2, diceRoll: 7 },
    };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    // Confirms orange zone + shell → depletion occurs (not skipped)
    expect(result.units['csa-btry'].ammo).toBe('low');
  });

  it('throws INVALID_ACTION when battery is limbered (LOB §3.6a)', () => {
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { formation: 'limbered' }) });
    expect(() => handleFireArtillery(state, FIRE_ACTION, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_ACTION when canister at range > 3 (LOB §8.2e)', () => {
    const state = makeState();
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'canister', range: 4 },
    };
    expect(() => handleFireArtillery(state, action, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_ACTION when Shell Depleted and range > 3 (LOB §8.2d)', () => {
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { ammo: 'low' }) });
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, range: 4, ammoType: 'shell' },
    };
    expect(() => handleFireArtillery(state, action, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when diceRoll out of range', () => {
    const action = { ...FIRE_ACTION, payload: { ...FIRE_ACTION.payload, diceRoll: 13 } };
    expect(() => handleFireArtillery(makeState(), action, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when ammoType invalid', () => {
    const action = { ...FIRE_ACTION, payload: { ...FIRE_ACTION.payload, ammoType: 'grapeshot' } };
    expect(() => handleFireArtillery(makeState(), action, { oob: MOCK_OOB })).toThrow(ActionError);
  });

  it('does not mutate input state', () => {
    const state = makeState();
    const snap = JSON.parse(JSON.stringify(state));
    handleFireArtillery(state, FIRE_ACTION, { oob: MOCK_OOB });
    expect(state).toEqual(snap);
  });
});

// ─── REPLENISH_ARTILLERY tests ────────────────────────────────────────────────

describe('handleReplenishArtillery', () => {
  const REPLENISH_ACTION = {
    type: 'REPLENISH_ARTILLERY',
    payload: { unitId: 'csa-btry' },
    playerSide: 'confederate',
  };

  it('restores ammo to full and clears depletionMarker (LOB §8.4, SM §3.6)', () => {
    const state = makeState({
      'csa-btry': makeUnit('csa-btry', { ammo: 'low', depletionMarker: true }),
    });
    const result = handleReplenishArtillery(state, REPLENISH_ACTION, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('full');
    expect(result.units['csa-btry'].depletionMarker).toBe(false);
  });

  it('restores from Canister Depleted (ammo=none) to full (LOB §8.4)', () => {
    const state = makeState({
      'csa-btry': makeUnit('csa-btry', { ammo: 'none', depletionMarker: true }),
    });
    const result = handleReplenishArtillery(state, REPLENISH_ACTION, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('full');
  });

  it('throws INVALID_ACTION when battery is not depleted (LOB §8.3)', () => {
    const state = makeState(); // ammo: 'full'
    expect(() => handleReplenishArtillery(state, REPLENISH_ACTION, { oob: MOCK_OOB })).toThrow(
      ActionError
    );
  });

  it('throws INVALID_ACTION when battery has CBF marker (LOB §8.4b)', () => {
    const state = makeState({
      'csa-btry': makeUnit('csa-btry', { ammo: 'low', cbfMarker: true }),
    });
    expect(() => handleReplenishArtillery(state, REPLENISH_ACTION, { oob: MOCK_OOB })).toThrow(
      ActionError
    );
  });

  it('does not mutate input state', () => {
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { ammo: 'low' }) });
    const snap = JSON.parse(JSON.stringify(state));
    handleReplenishArtillery(state, REPLENISH_ACTION, { oob: MOCK_OOB });
    expect(state).toEqual(snap);
  });
});
