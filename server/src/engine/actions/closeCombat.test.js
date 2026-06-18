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

// Returns a copy of MOCK_OOB with the first union regiment's strengthPoints overridden.
// Hoisted here to avoid copy-pasting the deeply-nested structure in each test (#622).
function makeOob(strengthPoints) {
  return {
    ...MOCK_OOB,
    union: {
      ...MOCK_OOB.union,
      corps: [
        {
          ...MOCK_OOB.union.corps[0],
          divisions: [
            {
              ...MOCK_OOB.union.corps[0].divisions[0],
              brigades: [
                {
                  ...MOCK_OOB.union.corps[0].divisions[0].brigades[0],
                  regiments: [
                    {
                      ...MOCK_OOB.union.corps[0].divisions[0].brigades[0].regiments[0],
                      strengthPoints,
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
}

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

  it('sets cbfMarker on defender unit (LOB §5.8)', () => {
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

  it('leaderLossCheckRequired is true even when closing roll fails if SP loss occurred (LOB §9.1a)', () => {
    // LOB §9.1a: leader loss is driven by SP loss (m+ result), not Closing Roll pass/fail.
    // MOCK_OOB has u1 with 4 SPs → automatic 1 SP loss fires → leader check required.
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, closingDie: 1 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    expect(result.pendingResolution.context.leaderLossCheckRequired).toBe(true);
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

  it('sets cbfMarker on attacker when Opening Volley causes SP loss (LOB §5.8)', () => {
    // 'charge' OV table: die 6 → 2 SP loss (OPENING_VOLLEY_TABLE charge row [6,6,2])
    const action = {
      ...CHARGE_ACTION,
      payload: { ...CHARGE_ACTION.payload, openingVolleyDie: 6 },
    };
    const result = handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
    const ctx = result.pendingResolution.context;
    // Assert the table returned a loss before checking the CBF marker (prevents vacuous pass)
    expect(ctx.openingVolleySpLoss).toBeGreaterThan(0);
    expect(result.units.u1.cbfMarker).toBe(true);
  });

  describe('automatic SP loss gate — LOB §7.0 (#579)', () => {
    // MOCK_OOB has u1 with 4 SPs (≥4 threshold met)
    it('automatic 1 SP defender loss applies when attacker has ≥4 SPs (LOB §7.0)', () => {
      const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
      expect(result.pendingResolution.context.defenderSpLoss).toBe(1);
    });

    it('no automatic SP defender loss when attacker has <4 SPs (LOB §7.0)', () => {
      const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: makeOob(3) });
      expect(result.pendingResolution.context.defenderSpLoss).toBe(0);
    });

    it('defender does not get cbfMarker when attacker SPs < 4 (LOB §5.8)', () => {
      const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: makeOob(3) });
      expect(result.units.c1.cbfMarker).toBe(false);
    });

    it('DG state does NOT reduce SP contribution for gate check — gate uses raw current SPs (LOB §7.0)', () => {
      // §7.0 "SPs remaining in the attack" = current SP count, unmodified by DG.
      // DG halving (§5.3) applies only to the Combat Table column, not the §7.0 gate.
      // u1 has 4 SPs and is DG → still contributes 4 to the gate → loss fires.
      const state = {
        ...BASE_STATE,
        units: { ...BASE_STATE.units, u1: { ...BASE_STATE.units.u1, moraleState: 'disorganized' } },
      };
      const result = handleCloseCombat(state, CHARGE_ACTION, { oob: MOCK_OOB });
      expect(result.pendingResolution.context.defenderSpLoss).toBe(1);
    });
  });

  describe('leader loss trigger — LOB §9.1a (#581)', () => {
    it('leaderLossCheckRequired when attacker SPs ≥4 (SP loss occurs, LOB §9.1a)', () => {
      const result = handleCloseCombat(BASE_STATE, CHARGE_ACTION, { oob: MOCK_OOB });
      expect(result.pendingResolution.context.leaderLossCheckRequired).toBe(true);
    });

    it('leaderLossCheckRequired is false when attacker SPs <4 AND no OV loss (no SP loss, LOB §9.1a)', () => {
      // openingVolleyDie 1 → 0 OV loss; attacker SPs 3 → no auto defender loss → no check
      const action = {
        ...CHARGE_ACTION,
        payload: { ...CHARGE_ACTION.payload, openingVolleyDie: 1 },
      };
      const result = handleCloseCombat(BASE_STATE, action, { oob: makeOob(3) });
      expect(result.pendingResolution.context.leaderLossCheckRequired).toBe(false);
    });

    it('leaderLossCheckRequired is true when OV inflicts SP loss even with attacker SPs <4 (#617, LOB §9.1a)', () => {
      // attacker SPs 3 → no §7.0a(e) auto defender loss (defenderSpLoss = 0)
      // but OV die 6 → 2 SP loss on attacker → §9.1a leader check must still fire
      const action = {
        ...CHARGE_ACTION,
        payload: { ...CHARGE_ACTION.payload, openingVolleyDie: 6 },
      };
      const result = handleCloseCombat(BASE_STATE, action, { oob: makeOob(3) });
      expect(result.pendingResolution.context.defenderSpLoss).toBe(0); // confirm no auto loss
      expect(result.pendingResolution.context.openingVolleySpLoss).toBeGreaterThan(0); // OV fired
      expect(result.pendingResolution.context.leaderLossCheckRequired).toBe(true);
    });
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

    // #603 — attacker-side ownership check mirrors the fireCombat fix
    it('throws INVALID_ACTION when playerSide does not own the attacker units (#603)', () => {
      const action = { ...CHARGE_ACTION, playerSide: 'confederate' };
      try {
        handleCloseCombat(BASE_STATE, action, { oob: MOCK_OOB });
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
