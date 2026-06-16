/**
 * drainAutoSteps — Phase 5 (Rally, Fluke Stoppage, Attack Recovery) unit tests.
 *
 * Tests the CBF clearing, stopped-order detection, and attack-order detection
 * logic added in M6. The drain function itself is also exercised through dispatch
 * in smoke.test.js; these tests target the M6-specific state transformations.
 */
import { describe, it, expect } from 'vitest';

import { drainAutoSteps } from './index.js';
import { PHASES, STEPS } from '../../constants/phases.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeUnit = (id, hex, opts = {}) => ({
  id,
  hex,
  facing: 0,
  moraleState: opts.moraleState ?? 'normal',
  wrecked: false,
  orders: opts.orders ?? null,
  ammo: 'full',
  depletionMarker: false,
  cbfMarker: opts.cbfMarker ?? false,
  isOnBoard: opts.isOnBoard ?? true,
  entryTurn: null,
  isDetached: false,
});

const RALLY_STATE = {
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
  units: {
    u1: makeUnit('u1', '10.10'),
    u2: makeUnit('u2', '10.11'),
  },
};

const ATTACK_RECOVERY_STATE = {
  ...RALLY_STATE,
  phase: PHASES.COMMAND,
  step: STEPS.ATTACK_RECOVERY,
  rallyPhase: null,
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
};

const FLUKE_STOPPAGE_STATE = {
  ...RALLY_STATE,
  phase: PHASES.COMMAND,
  step: STEPS.FLUKE_STOPPAGE,
  rallyPhase: null,
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
};

// ─── Rally Phase — CBF clearing (LOB §8.1) ────────────────────────────────────

describe('drainAutoSteps — Rally Phase CBF clearing (LOB §8.1)', () => {
  it('advances from rally to command/orders', () => {
    const result = drainAutoSteps(RALLY_STATE);
    expect(result.phase).toBe(PHASES.COMMAND);
    expect(result.step).toBe(STEPS.ORDERS);
  });

  it('increments turn counter on rally advancement', () => {
    const result = drainAutoSteps(RALLY_STATE);
    expect(result.turn).toBe(RALLY_STATE.turn + 1);
  });

  it('flips active player from union to confederate', () => {
    const result = drainAutoSteps({ ...RALLY_STATE, activePlayer: 'union' });
    expect(result.activePlayer).toBe('confederate');
  });

  it('flips active player from confederate to union', () => {
    const result = drainAutoSteps({ ...RALLY_STATE, activePlayer: 'confederate' });
    expect(result.activePlayer).toBe('union');
  });

  it('clears cbfMarker from all units (LOB §8.1)', () => {
    const state = {
      ...RALLY_STATE,
      units: {
        u1: makeUnit('u1', '10.10', { cbfMarker: true }),
        u2: makeUnit('u2', '10.11', { cbfMarker: true }),
      },
    };
    const result = drainAutoSteps(state);
    expect(result.units.u1.cbfMarker).toBe(false);
    expect(result.units.u2.cbfMarker).toBe(false);
  });

  it('does not alter units without cbfMarker', () => {
    const result = drainAutoSteps(RALLY_STATE);
    // Original units had cbfMarker: false; should remain false
    expect(result.units.u1.cbfMarker).toBe(false);
    expect(result.units.u2.cbfMarker).toBe(false);
  });

  it('preserves other unit fields after CBF clearing', () => {
    // §6.4 step 1 unconditionally removes Sh markers (CBF has no effect on morale recovery),
    // then §8.1 clears cbfMarker. A shaken+cbfMarker unit ends up normal with cbfMarker=false.
    const state = {
      ...RALLY_STATE,
      units: {
        u1: makeUnit('u1', '10.10', { cbfMarker: true, moraleState: 'shaken' }),
      },
    };
    const result = drainAutoSteps(state);
    expect(result.units.u1.moraleState).toBe('normal'); // §6.4 step 1 unconditional
    expect(result.units.u1.hex).toBe('10.10');
    expect(result.units.u1.cbfMarker).toBe(false); // §8.1 clears CBF
  });

  it('resets activityPhase to null after rally', () => {
    const result = drainAutoSteps(RALLY_STATE);
    expect(result.activityPhase).toBeNull();
  });

  it('resets rallyPhase to null after rally', () => {
    const result = drainAutoSteps(RALLY_STATE);
    expect(result.rallyPhase).toBeNull();
  });

  it('initialises ordersPhase for next command turn', () => {
    const result = drainAutoSteps(RALLY_STATE);
    expect(result.ordersPhase).toEqual({ leaderRollUsed: {}, pendingOrderIssuance: null });
  });
});

// ─── Attack Recovery (LOB §10.8c) ────────────────────────────────────────────

describe('drainAutoSteps — Attack Recovery (LOB §10.8c)', () => {
  it('advances from attackRecovery to flukeStoppage', () => {
    const result = drainAutoSteps(ATTACK_RECOVERY_STATE);
    // drainAutoSteps continues through fluke → activity; final step is ACTIVATION
    expect(result.phase).toBe(PHASES.ACTIVITY);
    expect(result.step).toBe(STEPS.ACTIVATION);
  });

  it('auto-advances when no stopped orders exist', () => {
    // No units with orders.status === 'stopped'
    const result = drainAutoSteps(ATTACK_RECOVERY_STATE);
    expect(result.phase).toBe(PHASES.ACTIVITY);
  });

  it('auto-advances when a unit has stopped orders (M6 depth — real dice deferred to M7)', () => {
    const state = {
      ...ATTACK_RECOVERY_STATE,
      units: {
        u1: makeUnit('u1', '10.10', {
          orders: { type: 'attack', status: 'stopped', deliveryTurnDue: null },
        }),
      },
    };
    // At M6 depth: still auto-advances (interactive dice path deferred to M7)
    const result = drainAutoSteps(state);
    expect(result.phase).toBe(PHASES.ACTIVITY);
  });
});

// ─── Fluke Stoppage (LOB §10.7b) ─────────────────────────────────────────────

describe('drainAutoSteps — Fluke Stoppage (LOB §10.7b)', () => {
  it('advances from flukeStoppage to activity/activation', () => {
    const result = drainAutoSteps(FLUKE_STOPPAGE_STATE);
    expect(result.phase).toBe(PHASES.ACTIVITY);
    expect(result.step).toBe(STEPS.ACTIVATION);
  });

  it('initialises activityPhase envelope on transition', () => {
    const result = drainAutoSteps(FLUKE_STOPPAGE_STATE);
    expect(result.activityPhase).toEqual({ activatedUnits: [], currentActivation: null });
  });

  it('auto-advances when no units have accepted attack orders', () => {
    const result = drainAutoSteps(FLUKE_STOPPAGE_STATE);
    expect(result.phase).toBe(PHASES.ACTIVITY);
  });

  it('auto-advances when a unit has accepted attack orders (M6 depth — real dice deferred to M7)', () => {
    const state = {
      ...FLUKE_STOPPAGE_STATE,
      units: {
        u1: makeUnit('u1', '10.10', {
          orders: { type: 'attack', status: 'accepted', deliveryTurnDue: null },
        }),
      },
    };
    // At M6 depth: still auto-advances
    const result = drainAutoSteps(state);
    expect(result.phase).toBe(PHASES.ACTIVITY);
  });

  it('clears ordersPhase on transition to activity', () => {
    const result = drainAutoSteps(FLUKE_STOPPAGE_STATE);
    expect(result.ordersPhase).toBeNull();
  });
});
