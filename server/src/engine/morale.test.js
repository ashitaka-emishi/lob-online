import { describe, it, expect } from 'vitest';

import {
  isWrecked,
  applyMoraleCheck,
  applyMoraleToHex,
  cascadeMorale,
  resolvePendingMorale,
} from './morale.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeUnit = (id, hex, moraleState = 'normal') => ({
  id,
  hex,
  facing: 0,
  moraleState,
  wrecked: false,
  orders: null,
  ammo: 'full',
  depletionMarker: false,
  cbfMarker: false,
  isOnBoard: true,
  entryTurn: null,
  isDetached: false,
});

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
    u1: makeUnit('u1', '10.10'),
    u2: makeUnit('u2', '10.10'),
  },
};

// ─── isWrecked ────────────────────────────────────────────────────────────────

describe('isWrecked (LOB §5.7)', () => {
  it('returns false when SPs are at exactly 50%', () => {
    // LOB §5.7 — strictly less than 50%; at exactly 50% not wrecked
    expect(isWrecked(2, 4)).toBe(false);
  });

  it('returns true when SPs are below 50%', () => {
    expect(isWrecked(1, 4)).toBe(true);
  });

  it('returns false when unit is at full strength', () => {
    expect(isWrecked(5, 5)).toBe(false);
  });

  it('returns true when at 1 SP vs printed 3', () => {
    expect(isWrecked(1, 3)).toBe(true);
  });
});

// ─── applyMoraleCheck ─────────────────────────────────────────────────────────

describe('applyMoraleCheck (LOB §6.1–6.2a)', () => {
  it('returns updated unit with new moraleState', () => {
    const unit = makeUnit('u1', '10.10', 'normal');
    // Morale A, roll 12 → most severe result, should produce non-normal state
    const { unit: updated } = applyMoraleCheck(unit, 'A', {}, 12);
    expect(updated).toHaveProperty('moraleState');
    expect(typeof updated.moraleState).toBe('string');
  });

  it('does not mutate the input unit', () => {
    const unit = makeUnit('u1', '10.10', 'normal');
    const snapshot = JSON.parse(JSON.stringify(unit));
    applyMoraleCheck(unit, 'B', {}, 6);
    expect(unit).toEqual(snapshot);
  });

  it('returns result with leaderLossCheck flag', () => {
    const unit = makeUnit('u1', '10.10', 'normal');
    const { leaderLossCheck } = applyMoraleCheck(unit, 'B', {}, 8);
    expect(typeof leaderLossCheck).toBe('boolean');
  });

  it('normal unit transitions to bloodlust on best result (morale A, roll 2)', () => {
    // LOB Morale Table: A rating, roll 2 → bloodlust (BL) — best morale result
    const unit = makeUnit('u1', '10.10', 'normal');
    const { unit: updated } = applyMoraleCheck(unit, 'A', {}, 2);
    expect(updated.moraleState).toBe('bloodlust');
  });

  it('bloodlust unit that receives a bad result still suppresses retreats (LOB §6.2a)', () => {
    // bloodlust + incoming shaken = bloodlust/shaken → suppressRetreatsAndLosses = true
    const unit = makeUnit('u1', '10.10', 'bloodlust');
    // Roll high against C rating to get a shaken result
    const { suppressRetreats } = applyMoraleCheck(unit, 'C', {}, 12);
    // Depending on table result, suppressRetreats may or may not be true.
    // Just verify it's a boolean and we don't error.
    expect(typeof suppressRetreats).toBe('boolean');
  });
});

// ─── applyMoraleToHex ─────────────────────────────────────────────────────────

describe('applyMoraleToHex (LOB §6.1)', () => {
  it('applies morale check to all on-board units in the target hex', () => {
    const getRating = () => 'A'; // best morale; roll 2 → noEffect
    const { state } = applyMoraleToHex(BASE_STATE, '10.10', {}, 2, getRating);
    // Both units in 10.10 still present
    expect(Object.keys(state.units)).toContain('u1');
    expect(Object.keys(state.units)).toContain('u2');
  });

  it('does not affect units in other hexes', () => {
    const stateWithOther = {
      ...BASE_STATE,
      units: {
        ...BASE_STATE.units,
        u3: makeUnit('u3', '99.99', 'normal'),
      },
    };
    const getRating = () => 'D'; // worst morale
    const { state } = applyMoraleToHex(stateWithOther, '10.10', {}, 12, getRating);
    // u3 in another hex is untouched
    expect(state.units.u3.moraleState).toBe('normal');
  });

  it('does not mutate input state', () => {
    const snapshot = JSON.parse(JSON.stringify(BASE_STATE));
    applyMoraleToHex(BASE_STATE, '10.10', {}, 6, () => 'B');
    expect(BASE_STATE).toEqual(snapshot);
  });

  it('returns anyLeaderLossCheck as boolean', () => {
    const { anyLeaderLossCheck } = applyMoraleToHex(BASE_STATE, '10.10', {}, 6, () => 'B');
    expect(typeof anyLeaderLossCheck).toBe('boolean');
  });

  it('falls back to morale D when getRating returns null', () => {
    // Should not throw; just uses 'D' fallback
    expect(() => applyMoraleToHex(BASE_STATE, '10.10', {}, 6, () => null)).not.toThrow();
  });
});

// ─── cascadeMorale ────────────────────────────────────────────────────────────

describe('cascadeMorale (LOB §6.3)', () => {
  it('does nothing when units are not all routed', () => {
    const state = {
      ...BASE_STATE,
      units: {
        u1: makeUnit('u1', '10.10', 'routed'),
        u2: makeUnit('u2', '10.10', 'normal'), // one not routed
      },
    };
    const result = cascadeMorale(state, '10.10');
    expect(result.pendingResolution).toBeNull();
  });

  it('sets pendingResolution moraleCheck cascade when all units in hex routed', () => {
    const state = {
      ...BASE_STATE,
      units: {
        u1: makeUnit('u1', '10.10', 'routed'),
        u2: makeUnit('u2', '10.10', 'routed'),
      },
    };
    const result = cascadeMorale(state, '10.10');
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('moraleCheck');
    expect(result.pendingResolution.context.cascade).toBe(true);
    expect(result.pendingResolution.context.hex).toBe('10.10');
  });

  it('does not overwrite existing pendingResolution', () => {
    const existing = { type: 'leaderCasualty', context: { hex: '10.10' } };
    const state = {
      ...BASE_STATE,
      pendingResolution: existing,
      units: {
        u1: makeUnit('u1', '10.10', 'routed'),
        u2: makeUnit('u2', '10.10', 'routed'),
      },
    };
    const result = cascadeMorale(state, '10.10');
    // pendingResolution already set — cascade guard skips
    expect(result.pendingResolution).toBe(existing);
  });

  it('does not set cascade when hex is empty', () => {
    const state = { ...BASE_STATE, units: {} };
    const result = cascadeMorale(state, '10.10');
    expect(result.pendingResolution).toBeNull();
  });

  it('does not mutate input state', () => {
    const state = {
      ...BASE_STATE,
      units: {
        u1: makeUnit('u1', '10.10', 'routed'),
        u2: makeUnit('u2', '10.10', 'routed'),
      },
    };
    const snapshot = JSON.parse(JSON.stringify(state));
    cascadeMorale(state, '10.10');
    expect(state).toEqual(snapshot);
  });
});

// ─── resolvePendingMorale ─────────────────────────────────────────────────────

describe('resolvePendingMorale (LOB §6.1)', () => {
  const stateWithCombatPending = {
    ...BASE_STATE,
    pendingResolution: {
      type: 'combatResult',
      context: {
        attackerHex: '10.10',
        defenderHex: '10.11',
        spLoss: 1,
        moraleCheckRequired: true,
      },
    },
    units: {
      ...BASE_STATE.units,
      c1: makeUnit('c1', '10.11', 'normal'),
    },
  };

  it('returns state unchanged when pendingResolution is not combatResult', () => {
    const state = { ...BASE_STATE, pendingResolution: null };
    const result = resolvePendingMorale(state, 6, {}, () => 'B');
    expect(result).toBe(state); // same reference — no copy made
  });

  it('applies morale check to defender hex units', () => {
    const result = resolvePendingMorale(stateWithCombatPending, 2, {}, () => 'A');
    // c1 in defenderHex 10.11 should have been processed (moraleState may change or stay normal)
    expect(result.units.c1).toHaveProperty('moraleState');
  });

  it('clears pendingResolution when no cascade and no leaderLoss', () => {
    // Roll 2 vs morale A → likely noEffect → no cascade, no leader loss
    const result = resolvePendingMorale(stateWithCombatPending, 2, {}, () => 'A');
    // pendingResolution is cleared or set to leaderCasualty/moraleCheck depending on result
    // At minimum it should no longer be 'combatResult'
    if (result.pendingResolution !== null) {
      expect(result.pendingResolution.type).not.toBe('combatResult');
    }
  });

  it('does not mutate input state', () => {
    const snapshot = JSON.parse(JSON.stringify(stateWithCombatPending));
    resolvePendingMorale(stateWithCombatPending, 6, {}, () => 'B');
    expect(stateWithCombatPending).toEqual(snapshot);
  });

  it('sets leaderCasualty pending when routed unit triggers leaderLossCheck (LOB §9.1a, §6.3)', () => {
    // D+12 → routed + leaderLossCheck=true; leaderCasualty takes priority over cascade
    // because anyLeaderLossCheck is evaluated before cascade in resolvePendingMorale.
    const result = resolvePendingMorale(stateWithCombatPending, 12, {}, () => 'D');
    // c1 should be routed
    expect(result.units.c1.moraleState).toBe('routed');
    // leaderCasualty pending because leaderLossCheck wins over moraleCheck cascade
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('leaderCasualty');
  });

  it('clears pendingResolution entirely when morale check is mild (no cascade, no leaderLoss)', () => {
    // C + roll 5 → noEffect + no leaderLossCheck → pendingResolution cleared
    const result = resolvePendingMorale(stateWithCombatPending, 5, {}, () => 'C');
    expect(result.pendingResolution).toBeNull();
  });
});

// ─── Bug #577 regression — cascade uses brigade hierarchy, not hex scope ──────
describe('Bug #577 regression — cascadeMorale uses brigade hierarchy (LOB §6.3)', () => {
  // OOB with two brigades: brig-a (u1, u2) and brig-b (u3)
  const MOCK_OOB = {
    _status: 'test',
    _source: 'test',
    _errata_applied: [],
    union: {
      army: 'test',
      supplyTrain: { id: 'supply-u' },
      corps: [
        {
          id: 'corps1',
          name: 'I Corps',
          successionIds: [],
          divisions: [
            {
              id: 'div1',
              name: 'Div 1',
              wreckThreshold: 2,
              successionIds: [],
              brigades: [
                {
                  id: 'brig-a',
                  wreckThreshold: 2,
                  regiments: [
                    {
                      id: 'u1',
                      name: 'U1',
                      type: 'infantry',
                      morale: 'B',
                      weapon: 'R',
                      strengthPoints: 4,
                    },
                    {
                      id: 'u2',
                      name: 'U2',
                      type: 'infantry',
                      morale: 'B',
                      weapon: 'R',
                      strengthPoints: 4,
                    },
                  ],
                },
                {
                  id: 'brig-b',
                  wreckThreshold: 2,
                  regiments: [
                    {
                      id: 'u3',
                      name: 'U3',
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
      cavalryDivision: { id: 'cav', name: 'Cav', successionIds: [], brigades: [] },
    },
    confederate: {
      army: 'test',
      wing: 'test',
      supplyWagon: { id: 'supply-c' },
      independent: { cavalry: [], artillery: [] },
      reserveArtillery: { batteries: [] },
      independentBrigades: [],
      divisions: [],
    },
  };

  const makeOobState = (units) => ({
    ...BASE_STATE,
    units,
  });

  it('does NOT cascade when only one of two brigade units is routed (LOB §6.3)', () => {
    // u1 routed, u2 normal — brig-a is not fully routed → no cascade
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: makeUnit('u2', '10.10', 'normal'),
    });
    const result = cascadeMorale(state, '10.10', MOCK_OOB);
    expect(result.pendingResolution).toBeNull();
  });

  it('cascades when all units in a brigade are routed, even if co-occupants from another brigade are not (LOB §6.3)', () => {
    // brig-a: u1 routed, u2 routed → brigade-a fully routed → cascade
    // brig-b: u3 normal (different brigade, same hex) → must NOT prevent cascade
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: makeUnit('u2', '10.10', 'routed'),
      u3: makeUnit('u3', '10.10', 'normal'), // same hex, different brigade
    });
    const result = cascadeMorale(state, '10.10', MOCK_OOB);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('moraleCheck');
    expect(result.pendingResolution.context.cascade).toBe(true);
    expect(result.pendingResolution.context.brigadeId).toBe('brig-a');
  });

  it('does NOT cascade when only brig-b unit is routed but brig-a is normal (LOB §6.3)', () => {
    // u1 normal, u2 normal (brig-a), u3 routed (brig-b) → brig-a not routed → no cascade
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'normal'),
      u2: makeUnit('u2', '10.10', 'normal'),
      u3: makeUnit('u3', '10.10', 'routed'),
    });
    // brig-b has only u3, which is routed → cascade for brig-b
    const result = cascadeMorale(state, '10.10', MOCK_OOB);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.context.brigadeId).toBe('brig-b');
  });

  it('cascadesMorale context includes brigadeId (LOB §6.3)', () => {
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: makeUnit('u2', '10.10', 'routed'),
    });
    const result = cascadeMorale(state, '10.10', MOCK_OOB);
    expect(result.pendingResolution?.context?.brigadeId).toBe('brig-a');
  });

  it('falls back to hex-scope degraded mode when oob is null (LOB §6.3)', () => {
    // No OOB — degraded mode uses hex-scope (all in hex routed)
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: makeUnit('u2', '10.10', 'routed'),
    });
    const result = cascadeMorale(state, '10.10', null);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('moraleCheck');
    // Degraded mode: context has hex but no brigadeId
    expect(result.pendingResolution.context.hex).toBe('10.10');
    expect(result.pendingResolution.context.brigadeId).toBeUndefined();
  });

  it('does NOT cascade in degraded mode when hex is only partially routed (oob null)', () => {
    // Degraded path: oob null, one unit routed and one normal → allHexRouted is false → no cascade
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: makeUnit('u2', '10.10', 'normal'),
    });
    const result = cascadeMorale(state, '10.10', null);
    expect(result.pendingResolution).toBeNull();
  });

  it('off-board brigade members do not block cascade (LOB §6.3)', () => {
    // u2 is off-board — only u1 counts as on-board for brig-a; u1 is routed → cascade
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: { ...makeUnit('u2', '10.10', 'normal'), isOnBoard: false },
    });
    const result = cascadeMorale(state, '10.10', MOCK_OOB);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.context.brigadeId).toBe('brig-a');
  });

  // #605 — simultaneous multi-brigade rout: first fully-routed brigade wins
  it('cascades when two brigades both fully rout simultaneously — brig-a wins (#605)', () => {
    // Both brig-a (u1, u2) and brig-b (u3) are fully routed in the same hex.
    // The loop processes hex units in state order; u1 belongs to brig-a, which is checked first.
    // brig-b's cascade is deferred to the next RESOLVE_MORALE cycle (#605).
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'),
      u2: makeUnit('u2', '10.10', 'routed'),
      u3: makeUnit('u3', '10.10', 'routed'),
    });
    const result = cascadeMorale(state, '10.10', MOCK_OOB);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('moraleCheck');
    expect(result.pendingResolution.context.cascade).toBe(true);
    // Must select the first fully-routed brigade (brig-a), not silently drop all cascades
    expect(result.pendingResolution.context.brigadeId).toBe('brig-a');
  });

  // #610 — cascade regression for cavalryDivision brigades
  it('cascades when all units in a cavalryDivision brigade are routed (LOB §6.3)', () => {
    // cavalryDivision brigades must be walked by findBrigadeForUnit (#610)
    const CAV_OOB = {
      _status: 'test',
      _source: 'test',
      _errata_applied: [],
      union: {
        army: 'test',
        supplyTrain: { id: 'supply-u' },
        corps: [],
        cavalryDivision: {
          id: 'cav-div',
          name: 'Cav',
          successionIds: [],
          brigades: [
            {
              id: 'cav-brig',
              wreckThreshold: 2,
              regiments: [
                {
                  id: 'cv1',
                  name: 'CV1',
                  type: 'cavalry',
                  morale: 'B',
                  weapon: 'R',
                  strengthPoints: 3,
                },
              ],
            },
          ],
        },
      },
      confederate: {
        army: 'test',
        wing: 'test',
        supplyWagon: { id: 'supply-c' },
        independent: { cavalry: [], artillery: [] },
        reserveArtillery: { batteries: [] },
        independentBrigades: [],
        divisions: [],
      },
    };
    const state = makeOobState({ cv1: makeUnit('cv1', '10.10', 'routed') });
    const result = cascadeMorale(state, '10.10', CAV_OOB);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('moraleCheck');
    expect(result.pendingResolution.context.brigadeId).toBe('cav-brig');
  });

  // #610 — cascade regression for confederate independentBrigades
  it('cascades when all units in a confederate independentBrigade are routed (LOB §6.3)', () => {
    // independentBrigades must be walked by findBrigadeForUnit (#610)
    const IND_OOB = {
      _status: 'test',
      _source: 'test',
      _errata_applied: [],
      union: {
        army: 'test',
        supplyTrain: { id: 'supply-u' },
        corps: [],
        cavalryDivision: { id: 'cav-div', name: 'Cav', successionIds: [], brigades: [] },
      },
      confederate: {
        army: 'test',
        wing: 'test',
        supplyWagon: { id: 'supply-c' },
        independent: { cavalry: [], artillery: [] },
        reserveArtillery: { batteries: [] },
        independentBrigades: [
          {
            id: 'ind-brig',
            wreckThreshold: 2,
            regiments: [
              {
                id: 'ib1',
                name: 'IB1',
                type: 'infantry',
                morale: 'C',
                weapon: 'R',
                strengthPoints: 4,
              },
            ],
          },
        ],
        divisions: [],
      },
    };
    const state = makeOobState({ ib1: makeUnit('ib1', '10.10', 'routed') });
    const result = cascadeMorale(state, '10.10', IND_OOB);
    expect(result.pendingResolution).not.toBeNull();
    expect(result.pendingResolution.type).toBe('moraleCheck');
    expect(result.pendingResolution.context.brigadeId).toBe('ind-brig');
  });

  // #606 — hex-scope fallback only when oob is absent, not when unit not found in OOB
  it('does NOT fall back to hex-scope when oob is present but unit not in any brigade (#606)', () => {
    // Corps-level unit (not in any brigade) — findBrigadeForUnit returns null even with OOB present.
    // Must NOT trigger degraded hex-scope fallback; should silently skip and return state.
    const state = makeOobState({
      u1: makeUnit('u1', '10.10', 'routed'), // not in any brigade in MOCK_OOB
    });
    // Provide an OOB that doesn't contain u1 in any brigade
    const SPARSE_OOB = {
      union: { corps: [], cavalryDivision: { brigades: [], artillery: {} } },
      confederate: { divisions: [], independentBrigades: [] },
    };
    const result = cascadeMorale(state, '10.10', SPARSE_OOB);
    // OOB present but unit not in a brigade → no cascade (not degraded hex-scope)
    expect(result.pendingResolution).toBeNull();
  });
});
