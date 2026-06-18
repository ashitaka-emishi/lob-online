import { describe, it, expect } from 'vitest';

import { drainAutoSteps } from '../actions/index.js';
import { PHASES, STEPS } from '../../constants/phases.js';
import { rallyRollResult, applySection64AutoRecovery } from './rally.js';

// ─── rallyRollResult ─────────────────────────────────────────────────────────
// LOB §6.4 step 3: Roll 1d6 + leader Morale Value. Modified total ≥ 5 → Routed becomes DG.
// The unit's morale rating (A–F) is NOT a parameter — only Routed units roll, result is always →DG.

describe('rallyRollResult (LOB §6.4 step 3)', () => {
  it('succeeds when die + leaderMV ≥ 5 (roll 3 + MV 2 = 5)', () => {
    const result = rallyRollResult(3, 2);
    expect(result.success).toBe(true);
    expect(result.modifiedRoll).toBe(5);
    expect(result.newMoraleState).toBe('disorganized');
  });

  it('fails when die + leaderMV < 5 (roll 2 + MV 2 = 4)', () => {
    const result = rallyRollResult(2, 2);
    expect(result.success).toBe(false);
    expect(result.modifiedRoll).toBe(4);
    expect(result.newMoraleState).toBeNull();
  });

  it('succeeds on exact boundary (roll 4 + MV 1 = 5)', () => {
    const result = rallyRollResult(4, 1);
    expect(result.success).toBe(true);
    expect(result.modifiedRoll).toBe(5);
  });

  it('fails just below boundary (roll 3 + MV 1 = 4)', () => {
    const result = rallyRollResult(3, 1);
    expect(result.success).toBe(false);
    expect(result.modifiedRoll).toBe(4);
  });

  it('succeeds with no leader present (MV 0) when roll ≥ 5', () => {
    // No leader in hex — Morale Value contribution is 0
    const result = rallyRollResult(5, 0);
    expect(result.success).toBe(true);
    expect(result.modifiedRoll).toBe(5);
    expect(result.newMoraleState).toBe('disorganized');
  });

  it('fails with no leader when roll < 5 (roll 3 + MV 0 = 3)', () => {
    const result = rallyRollResult(3, 0);
    expect(result.success).toBe(false);
    expect(result.newMoraleState).toBeNull();
  });

  it('minimum die roll (1) + high leader MV can still succeed', () => {
    const result = rallyRollResult(1, 4);
    expect(result.success).toBe(true);
    expect(result.modifiedRoll).toBe(5);
  });

  it('maximum die roll (6) + MV 0 always succeeds', () => {
    const result = rallyRollResult(6, 0);
    expect(result.success).toBe(true);
    expect(result.modifiedRoll).toBe(6);
  });

  it('roll 4 + MV 0 = 4 fails — one below the threshold boundary (#620)', () => {
    // Boundary: threshold is ≥ 5; 4 is strictly below. Ensures ≥ vs > is not regressed.
    const result = rallyRollResult(4, 0);
    expect(result.success).toBe(false);
    expect(result.modifiedRoll).toBe(4);
    expect(result.newMoraleState).toBeNull();
  });

  it('roll 1 + MV 0 = 1 always fails (minimum possible total, #620)', () => {
    const result = rallyRollResult(1, 0);
    expect(result.success).toBe(false);
    expect(result.modifiedRoll).toBe(1);
  });
});

// ─── applySection64AutoRecovery ───────────────────────────────────────────────

const makeUnit = (id, moraleState, cbfMarker = false, isOnBoard = true) => ({
  id,
  hex: '10.10',
  facing: 0,
  moraleState,
  wrecked: false,
  orders: null,
  ammo: 'full',
  depletionMarker: false,
  cbfMarker,
  isOnBoard,
  entryTurn: null,
  isDetached: false,
});

describe('applySection64AutoRecovery (LOB §6.4)', () => {
  it('shaken unit without cbfMarker auto-recovers to normal (LOB §6.4)', () => {
    const units = { u1: makeUnit('u1', 'shaken', false) };
    const { units: result } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('normal');
  });

  it('shaken unit WITH cbfMarker auto-recovers to normal — CBF has no effect on morale recovery (LOB §6.4)', () => {
    // §6.4 step 1: "Remove all Sh markers" — unconditional, no CBF gate (LOB §5.8 lists
    // only two CBF effects: By Caisson replenishment and Combat Table shift).
    const units = { u1: makeUnit('u1', 'shaken', true) };
    const { units: result } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('normal');
  });

  it('disorganized unit flips to shaken automatically (LOB §6.4)', () => {
    const units = { u1: makeUnit('u1', 'disorganized') };
    const { units: result } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('shaken');
  });

  it('normal unit is unaffected by §6.4 (LOB §6.4)', () => {
    const units = { u1: makeUnit('u1', 'normal') };
    const { units: result } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('normal');
  });

  it('bloodlust unit is unaffected by §6.4 and not added to unitsPendingRallyRoll (LOB §6.4 #620)', () => {
    // bloodlust falls through all if/else branches — neither auto-recovers nor requires a roll
    const units = { u1: makeUnit('u1', 'bloodlust') };
    const { units: result, unitsPendingRallyRoll } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('bloodlust');
    expect(unitsPendingRallyRoll).not.toContain('u1');
  });

  it('routed unit is added to unitsPendingRallyRoll (LOB §6.4)', () => {
    const units = { u1: makeUnit('u1', 'routed') };
    const { unitsPendingRallyRoll } = applySection64AutoRecovery(units);
    expect(unitsPendingRallyRoll).toContain('u1');
  });

  it('shaken+cbfMarker unit auto-recovers — NOT added to unitsPendingRallyRoll (LOB §6.4)', () => {
    // §6.4 step 1 is unconditional; only routed units need a roll (step 3).
    const units = { u1: makeUnit('u1', 'shaken', true) };
    const { unitsPendingRallyRoll } = applySection64AutoRecovery(units);
    expect(unitsPendingRallyRoll).not.toContain('u1');
  });

  it('off-board units are not processed (LOB §6.4)', () => {
    const units = { u1: makeUnit('u1', 'shaken', false, false) };
    const { units: result } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('shaken');
  });

  it('does not mutate the input units map', () => {
    const units = { u1: makeUnit('u1', 'disorganized') };
    const snapshot = JSON.parse(JSON.stringify(units));
    applySection64AutoRecovery(units);
    expect(units).toEqual(snapshot);
  });

  it('mixed unit types all processed correctly in one call', () => {
    const units = {
      u1: makeUnit('u1', 'shaken', false), // auto-recovers to normal (§6.4 step 1)
      u2: makeUnit('u2', 'shaken', true), // also auto-recovers to normal — CBF no gate
      u3: makeUnit('u3', 'disorganized'), // flips to shaken (§6.4 step 2)
      u4: makeUnit('u4', 'routed'), // needs roll (§6.4 step 3)
      u5: makeUnit('u5', 'normal'), // unchanged
    };
    const { units: result, unitsPendingRallyRoll } = applySection64AutoRecovery(units);
    expect(result.u1.moraleState).toBe('normal');
    expect(result.u2.moraleState).toBe('normal'); // CBF does not gate Shaken recovery
    expect(result.u3.moraleState).toBe('shaken');
    expect(result.u4.moraleState).toBe('routed');
    expect(result.u5.moraleState).toBe('normal');
    expect(unitsPendingRallyRoll).toContain('u4');
    expect(unitsPendingRallyRoll).not.toContain('u1');
    expect(unitsPendingRallyRoll).not.toContain('u2'); // recovered, no roll needed
    expect(unitsPendingRallyRoll).not.toContain('u3');
    expect(unitsPendingRallyRoll).not.toContain('u5');
  });
});

// ─── drainAutoSteps — §6.4 integration ───────────────────────────────────────

// These tests verify that §6.4 runs during Rally Phase drain (before CBF clearing).

const makeRallyState = (unitOverrides = {}) => ({
  id: 'g1',
  scenarioId: 'south-mountain',
  schemaVersion: 3,
  version: 1,
  turn: 1,
  phase: PHASES.RALLY,
  step: STEPS.RALLY,
  activePlayer: 'union',
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-u', confederate: 'tok-c' },
  reinforcementQueue: [],
  status: 'active',
  leaderState: {},
  pendingResolution: null,
  ordersPhase: null,
  rallyPhase: { unitsPendingRally: [] },
  activityPhase: null,
  units: unitOverrides,
});

describe('drainAutoSteps — §6.4 automatic recovery integration', () => {
  it('shaken unit without cbfMarker recovers to normal after rally drain (LOB §6.4)', () => {
    const state = makeRallyState({
      u1: makeUnit('u1', 'shaken', false),
    });
    const result = drainAutoSteps(state);
    expect(result.units.u1.moraleState).toBe('normal');
  });

  it('disorganized unit flips to shaken after rally drain (LOB §6.4)', () => {
    const state = makeRallyState({
      u1: makeUnit('u1', 'disorganized', false),
    });
    const result = drainAutoSteps(state);
    expect(result.units.u1.moraleState).toBe('shaken');
  });

  it('shaken unit WITH cbfMarker recovers to normal after rally drain — CBF no gate (LOB §6.4)', () => {
    // §6.4 step 1 "Remove all Sh markers" is unconditional. CBF is cleared separately by §8.1.
    const state = makeRallyState({
      u1: makeUnit('u1', 'shaken', true),
    });
    const result = drainAutoSteps(state);
    expect(result.units.u1.moraleState).toBe('normal');
    expect(result.units.u1.cbfMarker).toBe(false); // §5.8c clears CBF after §6.4
  });

  it('§6.4 runs BEFORE §5.8c cbfMarker clearing — DG+cbf ends as shaken+false, not normal (#619)', () => {
    // Discriminating case: DG+cbfMarker unit.
    // §6.4 first: DG → shaken. §5.8c second: clears cbfMarker. Final: shaken, cbfMarker=false.
    // If §6.4 ran twice (incorrect double-pass), DG→shaken→normal; moraleState would be 'normal'.
    // This asserts that §6.4 ran exactly once before §5.8c cleared the marker.
    const state = makeRallyState({
      u1: makeUnit('u1', 'disorganized', true),
    });
    const result = drainAutoSteps(state);
    expect(result.units.u1.moraleState).toBe('shaken'); // not 'normal' — §6.4 ran once
    expect(result.units.u1.cbfMarker).toBe(false); // §5.8c cleared after §6.4
  });
});
