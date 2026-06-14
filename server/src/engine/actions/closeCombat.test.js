import { describe, it, expect } from 'vitest';

import { handleCloseCombat } from './closeCombat.js';
import { ActionError } from './actionError.js';

// ─── Minimal OOB fixture ───────────────────────────────────────────────────────
const MOCK_OOB = {
  _status: 'test',
  _source: 'test',
  _errata_applied: [],
  union: {
    army: 'Army of the Potomac',
    supplyTrain: { id: 'supply-u' },
    corps: [
      {
        id: 'i-corps',
        name: 'I Corps',
        successionIds: [],
        divisions: [
          {
            id: 'div1',
            name: '1st Division',
            wreckThreshold: 2,
            successionIds: [],
            brigades: [
              {
                id: 'brig1',
                wreckThreshold: 2,
                regiments: [
                  {
                    id: 'u1',
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
    cavalryDivision: {
      id: 'cav-div',
      name: 'Cavalry Division',
      successionIds: [],
      brigades: [],
    },
  },
  confederate: {
    army: 'Army of Northern Virginia',
    wing: 'Right Wing',
    supplyWagon: { id: 'supply-c' },
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    divisions: [
      {
        id: 'div-csa',
        name: 'CSA Division',
        wreckThreshold: 2,
        successionIds: [],
        brigades: [
          {
            id: 'brig-csa',
            wreckThreshold: 2,
            regiments: [
              {
                id: 'c1',
                name: '1st CSA',
                type: 'infantry',
                morale: 'B',
                weapon: 'R',
                strengthPoints: 5,
              },
            ],
          },
        ],
      },
    ],
  },
};

// ─── Minimal game state fixture ────────────────────────────────────────────────
const BASE_STATE = {
  id: 'g1',
  scenarioId: 'south-mountain',
  schemaVersion: 3,
  version: 1,
  turn: 1,
  phase: 'activity',
  step: 'activation',
  activePlayer: 'union',
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
      hex: '10.10',
      movedThisActivation: false,
      openingVolley: false,
      zeroRuleFired: false,
    },
  },
  units: {
    u1: {
      id: 'u1',
      hex: '10.10',
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
    },
    c1: {
      id: 'c1',
      hex: '10.11', // adjacent — row difference 1
      facing: 3,
      moraleState: 'normal',
      wrecked: false,
      orders: null,
      ammo: 'full',
      depletionMarker: false,
      cbfMarker: false,
      isOnBoard: true,
      entryTurn: null,
      isDetached: false,
    },
  },
};

// Standard charge: union charges adjacent confederate, closing die 4 (B threshold 3 → pass)
const CHARGE_ACTION = {
  type: 'CLOSE_COMBAT',
  payload: {
    attackerHex: '10.10',
    defenderHex: '10.11',
    closingDie: 4,
    openingVolleyDie: 1, // low OV die → low/no SP loss
    mods: {},
  },
  playerSide: 'union',
};

describe('handleCloseCombat', () => {
  it('returns state with pendingResolution type closingRoll (LOB §7)', () => {
    const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('closingRoll');
  });

  it('pendingResolution context includes attacker/defender hex, closingPass, and OV loss', () => {
    const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
    const ctx = result.pendingResolution.context;
    expect(ctx.attackerHex).toBe('10.10');
    expect(ctx.defenderHex).toBe('10.11');
    expect(typeof ctx.closingPass).toBe('boolean');
    expect(typeof ctx.openingVolleySpLoss).toBe('number');
    expect(ctx.openingVolleySpLoss).toBeGreaterThanOrEqual(0);
  });

  it('automatically applies 1 SP defender loss (LOB §7.0c)', () => {
    const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
    expect(result.pendingResolution.context.defenderSpLoss).toBe(1);
  });

  it('sets cbfMarker on defender unit (LOB §8.1)', () => {
    const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
    expect(result.units.c1.cbfMarker).toBe(true);
  });

  it('does not mutate input state', () => {
    const snapshot = JSON.parse(JSON.stringify(BASE_STATE));
    handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
    expect(BASE_STATE).toEqual(snapshot);
  });

  it('Closing Roll passes with high die roll for morale B threshold (LOB §3.5)', () => {
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, closingDie: 6 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    expect(result.pendingResolution.context.closingPass).toBe(true);
  });

  it('Closing Roll fails with low die roll (LOB §3.5)', () => {
    // Morale B threshold 3; with no mods, die 1 → modified 1 < 3 → fail
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, closingDie: 1 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    expect(result.pendingResolution.context.closingPass).toBe(false);
  });

  it('leaderLossCheckRequired when closing roll passes (LOB §9.1a)', () => {
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, closingDie: 6 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    expect(result.pendingResolution.context.leaderLossCheckRequired).toBe(true);
  });

  it('leaderLossCheckRequired is false when closing roll fails', () => {
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, closingDie: 1 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    expect(result.pendingResolution.context.leaderLossCheckRequired).toBe(false);
  });

  it('Opening Volley SP loss included in context (LOB §7.0b)', () => {
    // OV at charge condition (range 1); die 1 → check table for 'charge' condition
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, openingVolleyDie: 6 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    // SP loss is table-driven; just verify it's a non-negative number
    expect(result.pendingResolution.context.openingVolleySpLoss).toBeGreaterThanOrEqual(0);
  });

  it('sets cbfMarker on attacker when Opening Volley causes SP loss (LOB §8.1)', () => {
    // 'charge' OV table: die 6 → guaranteed SP loss (per combat.js OPENING_VOLLEY_TABLE)
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, openingVolleyDie: 6 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    const ctx = result.pendingResolution.context;
    if (ctx.openingVolleySpLoss > 0) {
      expect(result.units.u1.cbfMarker).toBe(true);
    }
  });

  describe('validation errors', () => {
    it('throws INVALID_ACTION when activityPhase is null', () => {
      const state = {
        ...BASE_STATE,
        activityPhase: null,
        phase: 'rally',
        rallyPhase: { unitsPendingRally: [] },
      };
      try {
        handleCloseCombat(state, CHARGE_ACTION, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_ACTION');
      }
    });

    it('throws INVALID_ACTION when no stack is mid-activation', () => {
      const state = {
        ...BASE_STATE,
        activityPhase: { activatedUnits: [], currentActivation: null },
      };
      try {
        handleCloseCombat(state, CHARGE_ACTION, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_ACTION');
      }
    });

    it('throws INVALID_ACTION when attacker hex does not match active stack (LOB §3.0d)', () => {
      const action = {
        ...CHARGE_ACTION,
        payload: { ...CHARGE_ACTION.payload, attackerHex: '99.99' },
      };
      try {
        handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_ACTION');
      }
    });

    it('throws INVALID_ACTION when defender is not adjacent (LOB §7.0)', () => {
      // c1 is at 10.11; put it at 10.15 (distance > 1)
      const state = {
        ...BASE_STATE,
        units: { ...BASE_STATE.units, c1: { ...BASE_STATE.units.c1, hex: '10.15' } },
      };
      const action = {
        ...CHARGE_ACTION,
        payload: { ...CHARGE_ACTION.payload, defenderHex: '10.15' },
      };
      try {
        handleCloseCombat(state, action, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_ACTION');
      }
    });

    it('throws INVALID_ACTION when attacker and defender are on the same side', () => {
      const state = {
        ...BASE_STATE,
        units: {
          ...BASE_STATE.units,
          u2: {
            id: 'u2',
            hex: '10.11',
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
          },
          c1: { ...BASE_STATE.units.c1, isOnBoard: false },
        },
      };
      try {
        handleCloseCombat(state, CHARGE_ACTION, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_ACTION');
      }
    });

    it('throws INVALID_PAYLOAD when closingDie is missing', () => {
      const action = {
        ...CHARGE_ACTION,
        payload: { attackerHex: '10.10', defenderHex: '10.11', openingVolleyDie: 3 },
      };
      try {
        handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_PAYLOAD');
      }
    });

    it('throws INVALID_PAYLOAD when openingVolleyDie is missing (LOB §7.0b)', () => {
      const action = {
        ...CHARGE_ACTION,
        payload: { attackerHex: '10.10', defenderHex: '10.11', closingDie: 4 },
      };
      try {
        handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_PAYLOAD');
      }
    });

    it('throws INVALID_PAYLOAD when closingDie is out of range', () => {
      const action = {
        ...CHARGE_ACTION,
        payload: { ...CHARGE_ACTION.payload, closingDie: 7 },
      };
      try {
        handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ActionError);
        expect(e.code).toBe('INVALID_PAYLOAD');
      }
    });
  });
});
