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

  it('applies Shell Depletion when result lands in left depletion band (LOB §8.2a)', () => {
    // SPs=4, shift=-2 (range shift), roll=7 → finalColumn '1' (left band) → Shell Depleted
    // Range shift: artilleryRangeShift returns 0 for range 1–5; need explicit column shift.
    // Use shift via low SP count: SPs=1 → col '1' (left band) for any roll.
    const state = makeState({ 'csa-btry': makeUnit('csa-btry', { strengthPoints: 1 }) });
    const action = { ...FIRE_ACTION, payload: { ...FIRE_ACTION.payload, range: 2, diceRoll: 7 } };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    // SPs=1 → always in col '1' (left band) → Shell Depleted
    expect(result.units['csa-btry'].ammo).toBe('low');
    expect(result.units['csa-btry'].depletionMarker).toBe(true);
  });

  it('applies Canister Depletion when right band and canister in use (LOB §8.2a)', () => {
    // SPs=4, range=1, shift=0 → col '4-5' (right band) + canister → Canister Depleted
    const state = makeState();
    const action = {
      ...FIRE_ACTION,
      payload: { ...FIRE_ACTION.payload, ammoType: 'canister', range: 1, diceRoll: 7 },
    };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    expect(result.units['csa-btry'].ammo).toBe('none');
    expect(result.units['csa-btry'].depletionMarker).toBe(true);
  });

  it('does not deplete when right band and shell in use (LOB §8.2a)', () => {
    // Right band + shell → no depletion
    const state = makeState();
    const action = { ...FIRE_ACTION, payload: { ...FIRE_ACTION.payload, range: 1, diceRoll: 7 } };
    const result = handleFireArtillery(state, action, { oob: MOCK_OOB });
    // col '4-5' is right band; shell → no canister depletion; no left band → no shell depletion
    expect(result.units['csa-btry'].ammo).toBe('full');
    expect(result.units['csa-btry'].depletionMarker).toBe(false);
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
