import { describe, it, expect } from 'vitest';

import { drainAutoSteps } from '../actions/index.js';
import { PHASES, STEPS } from '../../constants/phases.js';
import { RALLY_THRESHOLDS, rallyRollResult, applySection64AutoRecovery } from './rally.js';

// ─── RALLY_THRESHOLDS ─────────────────────────────────────────────────────────

describe('RALLY_THRESHOLDS (LOB §6.3)', () => {
  it('A-rated units have highest threshold (10)', () => {
    expect(RALLY_THRESHOLDS.A).toBe(10);
  });

  it('B-rated units have threshold 9', () => {
    expect(RALLY_THRESHOLDS.B).toBe(9);
  });

  it('D-rated units have threshold 7', () => {
    expect(RALLY_THRESHOLDS.D).toBe(7);
  });

  it('F-rated units have lowest threshold (5)', () => {
    expect(RALLY_THRESHOLDS.F).toBe(5);
  });

  it('thresholds decrease monotonically from A to F', () => {
    expect(RALLY_THRESHOLDS.A).toBeGreaterThan(RALLY_THRESHOLDS.B);
    expect(RALLY_THRESHOLDS.B).toBeGreaterThan(RALLY_THRESHOLDS.C);
    expect(RALLY_THRESHOLDS.C).toBeGreaterThan(RALLY_THRESHOLDS.D);
    expect(RALLY_THRESHOLDS.D).toBeGreaterThan(RALLY_THRESHOLDS.E);
    expect(RALLY_THRESHOLDS.E).toBeGreaterThan(RALLY_THRESHOLDS.F);
  });
});

// ─── rallyRollResult ─────────────────────────────────────────────────────────

describe('rallyRollResult (LOB §6.3)', () => {
  it('succeeds when 2d6 ≤ threshold (shaken B-rated, roll 9)', () => {
    const result = rallyRollResult('B', 9, 'shaken');
    expect(result.success).toBe(true);
    expect(result.threshold).toBe(9);
    expect(result.newMoraleState).toBe('normal');
  });

  it('fails when 2d6 > threshold (shaken B-rated, roll 10)', () => {
    const result = rallyRollResult('B', 10, 'shaken');
    expect(result.success).toBe(false);
    expect(result.newMoraleState).toBeNull();
  });

  it('succeeds on exact threshold boundary (shaken D-rated, roll 7)', () => {
    const result = rallyRollResult('D', 7, 'shaken');
    expect(result.success).toBe(true);
    expect(result.newMoraleState).toBe('normal');
  });

  it('routed unit improves to disorganized on success (LOB §6.3)', () => {
    const result = rallyRollResult('A', 5, 'routed');
    expect(result.success).toBe(true);
    expect(result.newMoraleState).toBe('disorganized');
  });

  it('disorganized unit improves to shaken on success (LOB §6.3)', () => {
    const result = rallyRollResult('A', 5, 'disorganized');
    expect(result.success).toBe(true);
    expect(result.newMoraleState).toBe('shaken');
  });

  it('unknown morale rating returns success=false, threshold=null (LOB §6.3)', () => {
    const result = rallyRollResult('Z', 5, 'shaken');
    expect(result.success).toBe(false);
    expect(result.threshold).toBeNull();
    expect(result.newMoraleState).toBeNull();
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
    expect(result.units.u1.cbfMarker).toBe(false); // §8.1 clears CBF after §6.4
  });

  it('§6.4 runs BEFORE §8.1 cbfMarker clearing (ordering invariant)', () => {
    // DG unit with cbfMarker: §6.4 flips it to shaken unconditionally (step 2),
    // then §8.1 clears cbfMarker. Sequence order must be §6.4 → §8.1.
    // Since DG→Sh is unconditional, this test primarily verifies the drain sequence
    // reaches the correct final state (shaken, cbfMarker=false) in one pass.
    const state = makeRallyState({
      u1: makeUnit('u1', 'disorganized', true),
    });
    const result = drainAutoSteps(state);
    expect(result.units.u1.moraleState).toBe('shaken');
    expect(result.units.u1.cbfMarker).toBe(false);
  });
});
