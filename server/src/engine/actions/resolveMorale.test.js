import { describe, it, expect } from 'vitest';

import { handleResolveMorale } from './resolveMorale.js';
import { handleFireCombat } from './fireCombat.js';
import { getValidActions } from './index.js';
import { ActionError } from './actionError.js';

// ─── Minimal OOB fixture ───────────────────────────────────────────────────────
// LOB §6.1 — morale rating lookup uses the OOB; pass as fixture to avoid disk reads.
// Units: two union regiments (morale B), one confederate regiment (morale B).
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
                  {
                    id: 'u2',
                    name: '2nd Union',
                    type: 'infantry',
                    morale: 'A',
                    weapon: 'R',
                    strengthPoints: 3,
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
    independentBrigades: [],
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

// ─── Game state factory ────────────────────────────────────────────────────────

/**
 * Build a minimal GameState with a combatResult pendingResolution.
 * The defending unit (c1) is placed in defenderHex with the given moraleState.
 * No disk reads — all OOB/scenario/map data is passed as fixtures or injected.
 *
 * LOB §6.1 — combatResult context mirrors what FIRE_COMBAT sets on the state.
 *
 * @param {object} opts
 * @param {'normal'|'shaken'|'disorganized'|'routed'|'bloodlust'} opts.moraleState
 * @param {number} opts.defenderSPs - SP count for the defender unit (default 4)
 * @returns {object} GameState
 */
function makeCombatResultState({
  moraleState = 'normal',
  defenderSPs = 4,
  leaderLossCheckRequired = false,
} = {}) {
  return {
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
    // LOB §6.1 — pendingResolution type 'combatResult' is set after FIRE_COMBAT
    pendingResolution: {
      type: 'combatResult',
      context: {
        attackerHex: '10.10',
        defenderHex: '10.11',
        resultType: 'morale',
        spLoss: defenderSPs > 0 ? 1 : 0,
        openingVolleySpLoss: 0,
        moraleCheckRequired: true,
        leaderLossCheckRequired,
        finalColumn: 3,
        netColumnShifts: 0,
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
        hex: '10.11',
        facing: 3,
        moraleState,
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
}

// ─── Standard action helper ────────────────────────────────────────────────────

function moraleAction(dice, mods = {}) {
  return {
    type: 'RESOLVE_MORALE',
    payload: { dice, mods },
    playerSide: 'union',
  };
}

// ─── Phase 1 tests: handleResolveMorale unit tests ────────────────────────────

describe('handleResolveMorale — validation', () => {
  it('throws INVALID_ACTION when pendingResolution is null', () => {
    const state = { ...makeCombatResultState(), pendingResolution: null };
    try {
      handleResolveMorale(state, moraleAction([3, 4]), { oob: MOCK_OOB });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_ACTION when pendingResolution is not combatResult', () => {
    const state = {
      ...makeCombatResultState(),
      pendingResolution: { type: 'leaderCasualty', context: {} },
    };
    try {
      handleResolveMorale(state, moraleAction([3, 4]), { oob: MOCK_OOB });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when dice is missing', () => {
    const state = makeCombatResultState();
    try {
      handleResolveMorale(state, { type: 'RESOLVE_MORALE', payload: {} }, { oob: MOCK_OOB });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when dice has wrong length', () => {
    const state = makeCombatResultState();
    try {
      handleResolveMorale(state, moraleAction([3]), { oob: MOCK_OOB });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when a die is out of range (0)', () => {
    const state = makeCombatResultState();
    try {
      handleResolveMorale(state, moraleAction([0, 4]), { oob: MOCK_OOB });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when a die is out of range (7)', () => {
    const state = makeCombatResultState();
    try {
      handleResolveMorale(state, moraleAction([3, 7]), { oob: MOCK_OOB });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });
});

// ─── Task 1.2: normal result — unit stays normal ───────────────────────────────

describe('handleResolveMorale — normal result (LOB §6.1, §6.2a)', () => {
  it('unit stays normal when dice produce no effect on morale B (roll 2+3=5 → NE)', () => {
    // LOB §6.1 — morale B, roll 5 → NE (no effect); normal/normal → normal per §6.2a
    const state = makeCombatResultState({ moraleState: 'normal' });
    // dice sum 5 for morale rating B → NE (row 5-2=3, col 1 → null → noEffect)
    const result = handleResolveMorale(state, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('normal');
  });

  it('pendingResolution is cleared after a no-effect morale check', () => {
    // LOB §6.1 — when no cascade is triggered, pendingResolution is set to null
    const state = makeCombatResultState({ moraleState: 'normal' });
    const result = handleResolveMorale(state, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(result.pendingResolution).toBeNull();
  });

  it('does not mutate input state', () => {
    const state = makeCombatResultState({ moraleState: 'normal' });
    const snapshot = JSON.parse(JSON.stringify(state));
    handleResolveMorale(state, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(state).toEqual(snapshot);
  });
});

// ─── Task 1.3: shaken result ──────────────────────────────────────────────────

describe('handleResolveMorale — shaken result (LOB §6.1, §6.2a)', () => {
  it('unit transitions to shaken when morale B roll 10 (10 → sh(1,1))', () => {
    // LOB §6.1 — morale B, effective roll 10 → sh(1, 1); normal/shaken → shaken per §6.2a
    const state = makeCombatResultState({ moraleState: 'normal' });
    // dice sum 10: [4, 6] → row 10-2=8, col 1 → sh(1,1) → shaken
    const result = handleResolveMorale(state, moraleAction([4, 6]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('shaken');
  });

  it('pendingResolution is cleared when shaken result has no SP loss (no leader loss check)', () => {
    // LOB §6.1 — sh without SP loss does not trigger leaderLossCheck → pending = null
    // morale B, roll 9 → sh(1) no SP loss → no leader loss; roll is deterministic
    const state = makeCombatResultState({ moraleState: 'normal' });
    const result = handleResolveMorale(state, moraleAction([4, 5]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('shaken');
    expect(result.pendingResolution).toBeNull();
  });

  it('shaken/shaken stays shaken (Additive Morale Effects Chart LOB §6.2a)', () => {
    // LOB §6.2a — shaken/shaken → shaken
    const state = makeCombatResultState({ moraleState: 'shaken' });
    // roll 9 for B → sh result; shaken/shaken → shaken
    const result = handleResolveMorale(state, moraleAction([4, 5]), { oob: MOCK_OOB });
    // shaken unit with shaken incoming stays shaken
    expect(result.units.c1.moraleState).toBe('shaken');
  });
});

// ─── Task 1.4: disorganized result ────────────────────────────────────────────

describe('handleResolveMorale — disorganized result (LOB §6.1, §6.2a)', () => {
  it('unit transitions to disorganized when morale B roll 12 → dg(4,1)', () => {
    // LOB §6.1 — morale B, roll 12 → dg(4,1); normal/disorganized → disorganized per §6.2a
    const state = makeCombatResultState({ moraleState: 'normal' });
    // dice [6, 6] = 12 → row 10, col 1 → dg(4,1)
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('disorganized');
  });

  it('normal/disorganized additive transition resolves to disorganized (LOB §6.2a)', () => {
    // LOB §6.2a: normal + disorganized incoming = disorganized; roll 12/B → dg(4,1) is deterministic
    const state = makeCombatResultState({ moraleState: 'normal' });
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('disorganized');
  });

  it('disorganized/disorganized transitions to routed (Additive Morale Effects Chart LOB §6.2a)', () => {
    // LOB §6.2a — disorganized + incoming disorganized → routed; roll 11/B → dg(3,1) is deterministic
    const state = makeCombatResultState({ moraleState: 'disorganized' });
    const result = handleResolveMorale(state, moraleAction([5, 6]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('routed');
  });
});

// ─── Task 1.5: routed result + cascade pending ────────────────────────────────

describe('handleResolveMorale — routed result + cascade (LOB §6.1, §6.3)', () => {
  it('disorganized unit + disorganized incoming (roll 12/B) → routed (LOB §6.2a additive chart)', () => {
    // LOB §6.2a — disorganized + disorganized → routed
    const state = makeCombatResultState({ moraleState: 'disorganized' });
    // morale B, roll 12 → dg(4,1); disorganized/disorganized → routed
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('routed');
  });

  it('pendingResolution is set after routed result (LOB §6.3, §9.1a)', () => {
    // LOB §6.3 — cascade fires if pendingResolution was null before cascade check.
    // In resolvePendingMorale, cascadeMorale runs on afterMorale which still carries
    // the original combatResult pending. Because pendingResolution !== null, cascade does
    // NOT set a new moraleCheck pending. Instead the leaderCasualty pending wins if
    // the routed result had SP loss (roll 12 for B → dg(4,1) spLoss=1 → leaderLossCheck).
    const state = makeCombatResultState({ moraleState: 'disorganized' });
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    // Unit should be routed (disorganized + disorganized incoming → routed, LOB §6.2a)
    expect(result.units.c1.moraleState).toBe('routed');
    // pendingResolution is set (leaderCasualty due to SP loss from the dg result)
    expect(result.pendingResolution).not.toBeNull();
    // type is leaderCasualty (SP loss from roll 12/B triggers leader loss check, LOB §9.1a)
    expect(result.pendingResolution.type).toBe('leaderCasualty');
  });

  it('on combatResult path, leaderCasualty wins over cascade when SP loss triggers leader check (LOB §6.3)', () => {
    // LOB §6.3 — cascadeMorale fires only when pendingResolution is null on entry.
    // On the combatResult path the pending slot is already occupied, so cascade cannot
    // set a moraleCheck pending — leaderCasualty from SP loss wins instead.
    const state = makeCombatResultState({ moraleState: 'disorganized' });
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    // roll 12/B → dg(4,1) spLoss=1; disorganized+disorganized→routed; leaderCasualty pending wins
    expect(result.units.c1.moraleState).toBe('routed');
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('leaderCasualty');
  });
});

// ─── Task 1.6: bloodlust result ───────────────────────────────────────────────

describe('handleResolveMorale — bloodlust result (LOB §6.1, §6.2)', () => {
  it('unit transitions to bloodlust when morale A roll 2 → BL', () => {
    // LOB §6.1 — morale A, roll 2 → BL; normal/bloodlust → bloodlust per §6.2a
    // c1 is morale B in MOCK_OOB; use u2 (morale A) as the defending unit instead.
    // To avoid complexity, override the state to have a morale-A unit in the defender hex.
    const state = {
      ...makeCombatResultState({ moraleState: 'normal' }),
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
        // Use u2 (morale A from MOCK_OOB) as the only defender in 10.11
        u2: {
          id: 'u2',
          hex: '10.11',
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
    // LOB §6.1 — morale A (u2), roll 2 → BL; normal/bloodlust → bloodlust
    const result = handleResolveMorale(state, moraleAction([1, 1]), { oob: MOCK_OOB });
    expect(result.units.u2.moraleState).toBe('bloodlust');
  });

  it('bloodlust/shaken transitions to shaken with suppressed retreats (LOB §6.2a *rule)', () => {
    // LOB §6.2a — BL + incoming SH → SH, suppress retreats & losses
    // Place a unit currently in bloodlust and apply shaken incoming result
    const state = {
      ...makeCombatResultState({ moraleState: 'normal' }),
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
        // c1 with bloodlust; morale B; roll 9 → sh(1); bloodlust/shaken → shaken
        c1: {
          id: 'c1',
          hex: '10.11',
          facing: 3,
          moraleState: 'bloodlust',
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
    // roll 9, morale B → sh; bloodlust/shaken → shaken per §6.2a
    const result = handleResolveMorale(state, moraleAction([4, 5]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('shaken');
  });

  it('bloodlust/normal stays bloodlust (Additive Morale Effects Chart LOB §6.2a)', () => {
    // LOB §6.2a — bloodlust + normal (NE roll) → bloodlust (no change)
    const state = {
      ...makeCombatResultState({ moraleState: 'normal' }),
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
          hex: '10.11',
          facing: 3,
          moraleState: 'bloodlust',
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
    // roll 5, morale B → NE (no effect); bloodlust/normal → bloodlust
    const result = handleResolveMorale(state, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(result.units.c1.moraleState).toBe('bloodlust');
  });
});

// ─── Task 1.7: leaderCasualty pending when dice indicate leader loss ───────────

describe('handleResolveMorale — leaderCasualty pending (LOB §9.1a)', () => {
  it('sets pendingResolution to leaderCasualty when morale result has SP loss (LOB §9.1a)', () => {
    // LOB §6.1 — moraleResult.leaderLossCheck = true when spLoss > 0
    // LOB §9.1a — a leaderCasualty pending is created when leaderLossCheck triggers
    // morale B, roll 10 → sh(1,1): spLoss=1 → leaderLossCheck=true; roll is deterministic
    const state = makeCombatResultState({ moraleState: 'normal' });
    const result = handleResolveMorale(state, moraleAction([4, 6]), { oob: MOCK_OOB });
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('leaderCasualty');
    expect(result.pendingResolution.context.hex).toBe('10.11');
  });

  it('leaderCasualty pending includes hex in context (LOB §9.1a)', () => {
    // LOB §9.1a — context must have hex so the route layer can identify the leader
    // morale B, roll 11 → dg(3,1): spLoss=1 → leaderLossCheck=true; roll is deterministic
    const state = makeCombatResultState({ moraleState: 'normal' });
    const result = handleResolveMorale(state, moraleAction([5, 6]), { oob: MOCK_OOB });
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('leaderCasualty');
    expect(result.pendingResolution.context).toHaveProperty('hex', '10.11');
  });

  it('pendingResolution is null when no SP loss result (no leader loss check triggered)', () => {
    // LOB §6.1 — leaderLossCheck is false when spLoss === 0
    // morale B, roll 5 → NE; no spLoss → leaderLossCheck=false → pending=null
    const state = makeCombatResultState({ moraleState: 'normal' });
    const result = handleResolveMorale(state, moraleAction([2, 3]), { oob: MOCK_OOB });
    // roll 5 → NE → no leader loss
    expect(result.pendingResolution).toBeNull();
  });
});

// ─── Phase 2 — Dispatch integration: FIRE_COMBAT → RESOLVE_MORALE ─────────────

// These tests exercise the two-step fire-combat → resolve-morale pipeline
// by calling handlers directly (not through dispatch, since dispatch blocks
// RESOLVE_MORALE when pendingResolution is combatResult per getValidActions).

// LOB §5 / §6 — fire combat sets combatResult pending; morale resolution clears it.

// Base game state for fire-combat integration (no pendingResolution yet)
const FIRE_INTEGRATION_STATE = {
  id: 'g2',
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
      hex: '10.11',
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

const FIRE_ACTION = {
  type: 'FIRE_COMBAT',
  payload: {
    attackerHex: '10.10',
    defenderHex: '10.11',
    weaponClass: 'smallArms',
    weaponType: 'R',
    dice: [2, 4],
  },
  playerSide: 'union',
};

describe('Integration: FIRE_COMBAT → RESOLVE_MORALE (LOB §5 / §6)', () => {
  it('Step 1: FIRE_COMBAT sets pendingResolution.type === combatResult (LOB §5.6)', () => {
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    expect(afterFire.pendingResolution).not.toBeNull();
    expect(afterFire.pendingResolution.type).toBe('combatResult');
  });

  it('Step 2: getValidActions returns [RESOLVE_MORALE] when combatResult is pending — no soft-lock (LOB §6.1 #571)', () => {
    // LOB §6.1 — while combatResult pending, only RESOLVE_MORALE is valid. (#571 fix)
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    expect(afterFire.pendingResolution.type).toBe('combatResult');
    const validActions = getValidActions(afterFire, 'union');
    expect(validActions).toHaveLength(1);
    expect(validActions[0].type).toBe('RESOLVE_MORALE');
  });

  it('Step 3: RESOLVE_MORALE clears pendingResolution and updates unit morale (LOB §6.1)', () => {
    // Full pipeline: fire → morale resolution
    // LOB §6.1 — roll 5/B → NE → unit stays normal, pending = null (deterministic)
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    expect(afterFire.pendingResolution.type).toBe('combatResult');

    const afterMorale = handleResolveMorale(afterFire, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(afterMorale.pendingResolution).toBeNull();
    expect(afterMorale.units.c1.moraleState).toBe('normal');
  });

  it('RESOLVE_MORALE after FIRE_COMBAT: no effect roll leaves unit normal (LOB §6.1)', () => {
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    // dice [2, 3] = 5, morale B → NE (no effect); unit stays normal
    const afterMorale = handleResolveMorale(afterFire, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(afterMorale.units.c1.moraleState).toBe('normal');
    expect(afterMorale.pendingResolution).toBeNull();
  });

  it('RESOLVE_MORALE after FIRE_COMBAT: high roll transitions unit away from normal (LOB §6.1)', () => {
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    // dice [6, 6] = 12, morale B → dg(4,1); normal/disorganized → disorganized
    const afterMorale = handleResolveMorale(afterFire, moraleAction([6, 6]), { oob: MOCK_OOB });
    expect(afterMorale.units.c1.moraleState).toBe('disorganized');
  });

  it('RESOLVE_MORALE does not mutate the state returned by FIRE_COMBAT', () => {
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    const snapshot = JSON.parse(JSON.stringify(afterFire));
    handleResolveMorale(afterFire, moraleAction([2, 3]), { oob: MOCK_OOB });
    expect(afterFire).toEqual(snapshot);
  });

  it('RESOLVE_MORALE: high roll with SP loss produces leaderCasualty pending (LOB §9.1a)', () => {
    // dice [4,6] = 10, morale B → sh(1,1) spLoss=1 → leaderLossCheck=true → leaderCasualty pending (deterministic)
    const afterFire = handleFireCombat(FIRE_INTEGRATION_STATE, FIRE_ACTION, { oob: MOCK_OOB });
    const afterMorale = handleResolveMorale(afterFire, moraleAction([4, 6]), { oob: MOCK_OOB });
    expect(afterMorale.pendingResolution).not.toBeNull();
    expect(afterMorale.pendingResolution.type).toBe('leaderCasualty');
  });
});

// ─── Phase 2 — Multi-unit defender hex and mods propagation (#590) ────────────

// LOB §6.1 — each unit in the defender hex takes the morale check with the same dice
// roll and modifiers. These tests verify both units are updated and mods do not drop.
//
// NOTE §6.1 divergence: the engine applies each unit's own morale rating independently.
// Per §6.1, the stack's TOP combat unit should provide the rating for a single shared
// check, applied to all units. This simplification is intentional for M6 but should be
// revisited before final rules correctness sign-off. Tracked in domain-expert backlog.

describe('handleResolveMorale — multi-unit defender hex (LOB §6.1 #590)', () => {
  // Build a state with TWO confederate units in the defender hex
  function makeTwoDefenderState() {
    return {
      ...makeCombatResultState({ moraleState: 'normal' }),
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
        // Two CSA units stacked in the defender hex
        c1: {
          id: 'c1',
          hex: '10.11',
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
        // u2 (morale A from MOCK_OOB) also in defender hex
        u2: {
          id: 'u2',
          hex: '10.11',
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
  }

  it('applies morale check to ALL units in the defender hex (LOB §6.1)', () => {
    // dice [6,6]=12: morale B → dg(4,1) [disorganized], morale A → dg(3,1) [disorganized]
    const state = makeTwoDefenderState();
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    // Both c1 (morale B) and u2 (morale A) are in defenderHex — both must be updated
    expect(result.units.c1.moraleState).toBe('disorganized');
    expect(result.units.u2.moraleState).toBe('disorganized');
  });

  it('attacker unit (u1) in a different hex is NOT affected by the morale check (LOB §6.1)', () => {
    const state = makeTwoDefenderState();
    const result = handleResolveMorale(state, moraleAction([6, 6]), { oob: MOCK_OOB });
    // u1 is in attackerHex 10.10, not the defender hex 10.11
    expect(result.units.u1.moraleState).toBe('normal');
  });

  it('mods object is propagated to each unit in the defender hex (LOB §6.1 #590)', () => {
    // Discriminating test: roll 11 with no mods degrades both units, but leaderMoraleValue:3
    // reduces effective roll to 8, at which morale A and B both produce NE (stay normal).
    // If mods silently dropped, both units would still degrade — so this test can only pass
    // if mods are correctly forwarded to every unit's morale check.
    //
    // Morale table (roll 11): A → sh(2,1) [shaken], B → dg(3,1) [disorganized]
    // Morale table (roll 8):  A → NE [normal],       B → NE [normal]
    const state = makeTwoDefenderState();
    const result = handleResolveMorale(
      state,
      moraleAction([5, 6], { leaderMoraleValue: 3 }), // effective roll 8
      { oob: MOCK_OOB }
    );
    // c1 (morale B) and u2 (morale A) both stay normal — roll 8 = NE for both
    expect(result.units.c1.moraleState).toBe('normal');
    expect(result.units.u2.moraleState).toBe('normal');
  });
});
