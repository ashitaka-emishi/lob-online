import { describe, it, expect } from 'vitest';

import { dispatch, getValidActions, drainAutoSteps, ActionError } from './index.js';

// ── Shared fixtures ─────────────────────────────────────────────────────────

const BASE_UNIT = {
  id: 'colquitt',
  hex: '29.22',
  facing: 0,
  moraleState: 'normal',
  wrecked: false,
  orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
  ammo: 'full',
  isOnBoard: true,
  entryTurn: null,
  isDetached: false,
};

const SETUP_STATE = {
  id: 'game-1',
  scenarioId: 'south-mountain',
  version: 1,
  turn: 1,
  phase: null,
  activePlayer: null,
  step: null,
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-union', confederate: 'tok-csa' },
  units: { colquitt: BASE_UNIT },
  reinforcementQueue: [],
  status: 'setup',
  leaderState: {},
  pendingResolution: null,
  activityPhase: null,
  ordersPhase: null,
};

const COMMAND_ORDERS_STATE = {
  ...SETUP_STATE,
  status: 'active',
  phase: 'command',
  activePlayer: 'union',
  step: 'orders',
  completedSteps: [],
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
};

const ACTIVITY_STATE = {
  ...SETUP_STATE,
  status: 'active',
  phase: 'activity',
  activePlayer: 'union',
  step: 'activation',
  completedSteps: [],
  activityPhase: { activatedUnits: [], currentActivation: null },
};

// ── getValidActions ──────────────────────────────────────────────────────────

describe('getValidActions', () => {
  it('returns [] for setup state (status !== active)', () => {
    expect(getValidActions(SETUP_STATE, 'union')).toEqual([]);
  });

  it('returns [] for wrong playerSide', () => {
    expect(getValidActions(COMMAND_ORDERS_STATE, 'confederate')).toEqual([]);
  });

  it('returns [] when pendingResolution is set', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      pendingResolution: { type: 'looseCannonRoll', context: {} },
    };
    expect(getValidActions(state, 'union')).toEqual([]);
  });

  it('returns ROLL_INITIATIVE and END_PHASE during command/orders step', () => {
    const actions = getValidActions(COMMAND_ORDERS_STATE, 'union');
    expect(actions.map((a) => a.type)).toEqual(['ROLL_INITIATIVE', 'END_PHASE']);
  });

  it('returns only ISSUE_ORDER after a successful initiative roll', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      ordersPhase: {
        leaderRollUsed: { cox: true },
        pendingOrderIssuance: { leaderId: 'cox', unitId: 'colquitt' },
      },
    };
    const actions = getValidActions(state, 'union');
    expect(actions.map((a) => a.type)).toEqual(['ISSUE_ORDER']);
  });

  it('returns ACTIVATE_STACK and END_PHASE during activity/activation (no current activation)', () => {
    const actions = getValidActions(ACTIVITY_STATE, 'union');
    expect(actions.map((a) => a.type)).toEqual(['ACTIVATE_STACK', 'END_PHASE']);
  });

  it('returns only END_ACTIVATION when a stack is mid-activation', () => {
    const state = {
      ...ACTIVITY_STATE,
      activityPhase: { activatedUnits: [], currentActivation: '29.22' },
    };
    const actions = getValidActions(state, 'union');
    expect(actions.map((a) => a.type)).toEqual(['END_ACTIVATION']);
  });
});

// ── drainAutoSteps ───────────────────────────────────────────────────────────

describe('drainAutoSteps', () => {
  it('drains attackRecovery → flukeStoppage → activity/activation in one pass (LOB §10.6b, §10.7)', () => {
    const state = { ...COMMAND_ORDERS_STATE, step: 'attackRecovery', completedSteps: ['orders'] };
    const result = drainAutoSteps(state);
    // Both attackRecovery and flukeStoppage are automatic; drain lands in activity
    expect(result.phase).toBe('activity');
    expect(result.step).toBe('activation');
    expect(result.activityPhase).toEqual({ activatedUnits: [], currentActivation: null });
  });

  it('advances flukeStoppage → activity/activation automatically (LOB §10.7)', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      step: 'flukeStoppage',
      completedSteps: ['orders', 'attackRecovery'],
    };
    const result = drainAutoSteps(state);
    expect(result.phase).toBe('activity');
    expect(result.step).toBe('activation');
    expect(result.activityPhase).toEqual({ activatedUnits: [], currentActivation: null });
    expect(result.ordersPhase).toBeNull();
  });

  it('Rally auto-drains to next-turn Command and increments turn (LOB §2.1)', () => {
    const state = {
      ...SETUP_STATE,
      status: 'active',
      phase: 'rally',
      step: 'rally',
      turn: 1,
      activePlayer: 'union',
      completedSteps: [],
    };
    const result = drainAutoSteps(state);
    expect(result.phase).toBe('command');
    expect(result.step).toBe('orders');
    expect(result.turn).toBe(2);
    expect(result.activePlayer).toBe('confederate');
    expect(result.ordersPhase).toEqual({ leaderRollUsed: {}, pendingOrderIssuance: null });
    expect(result.activityPhase).toBeNull();
  });

  it('does not advance interactive steps (orders, activation)', () => {
    expect(drainAutoSteps(COMMAND_ORDERS_STATE)).toBe(COMMAND_ORDERS_STATE);
    expect(drainAutoSteps(ACTIVITY_STATE)).toBe(ACTIVITY_STATE);
  });

  it('returns state unchanged when phase is null (setup state)', () => {
    expect(drainAutoSteps(SETUP_STATE)).toBe(SETUP_STATE);
  });

  it('is idempotent: calling twice on an already-drained state returns same reference', () => {
    const drained = drainAutoSteps(COMMAND_ORDERS_STATE);
    expect(drainAutoSteps(drained)).toBe(drained);
  });
});

// ── dispatch ─────────────────────────────────────────────────────────────────

describe('dispatch', () => {
  it('throws ActionError{ code: INVALID_ACTION } for action not in getValidActions', () => {
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' }, playerSide: 'union' };
    expect(() => dispatch(COMMAND_ORDERS_STATE, action)).toThrow(ActionError);
    try {
      dispatch(COMMAND_ORDERS_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws ActionError{ code: INVALID_ACTION } for wrong playerSide with whose-turn message (#377)', () => {
    const action = { type: 'END_PHASE', payload: null, playerSide: 'confederate' };
    expect(() => dispatch(COMMAND_ORDERS_STATE, action)).toThrow(ActionError);
    try {
      dispatch(COMMAND_ORDERS_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
      expect(e.message).toContain("union's turn");
    }
  });

  it('throws ActionError{ code: INVALID_ACTION } for action in setup state', () => {
    const action = { type: 'END_PHASE', payload: null, playerSide: 'union' };
    expect(() => dispatch(SETUP_STATE, action)).toThrow(ActionError);
    try {
      dispatch(SETUP_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  // INVALID_STATE path is tested in dispatch.invalid-state.test.js (requires vi.mock for handler injection)

  it('returns a schema-validated state after END_PHASE from orders step', () => {
    const action = { type: 'END_PHASE', payload: null, playerSide: 'union' };
    const result = dispatch(COMMAND_ORDERS_STATE, action);
    // After orders END_PHASE + drainAutoSteps: attackRecovery → flukeStoppage → activity
    expect(result.phase).toBe('activity');
    expect(result.step).toBe('activation');
    expect(result.status).toBe('active');
  });

  it('full command → activity → rally → next turn cycle', () => {
    let state = COMMAND_ORDERS_STATE;

    // End orders step → drains to activity
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'union' });
    expect(state.phase).toBe('activity');
    expect(state.activePlayer).toBe('union');

    // Union ends their activation → confederate gets their turn
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'union' });
    expect(state.phase).toBe('activity');
    expect(state.activePlayer).toBe('confederate');

    // Confederate ends activation → Rally → auto-drain to Turn 2
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'confederate' });
    expect(state.phase).toBe('command');
    expect(state.step).toBe('orders');
    expect(state.turn).toBe(2);
    expect(state.activePlayer).toBe('confederate');
  });

  it('activePlayer alternates correctly over two full turns', () => {
    let state = COMMAND_ORDERS_STATE; // union goes first turn 1

    // Turn 1: union → confederate
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'union' }); // → activity
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'union' }); // union done
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'confederate' }); // → turn 2
    expect(state.turn).toBe(2);
    expect(state.activePlayer).toBe('confederate');

    // Turn 2: confederate → union
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'confederate' }); // → activity
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'confederate' }); // csa done
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'union' }); // → turn 3
    expect(state.turn).toBe(3);
    expect(state.activePlayer).toBe('union');
  });

  it('ROLL_INITIATIVE → ISSUE_ORDER round-trip through dispatch', () => {
    let state = dispatch(COMMAND_ORDERS_STATE, {
      type: 'ROLL_INITIATIVE',
      payload: { leaderId: 'cox', unitId: 'colquitt', diceResult: 4 },
      playerSide: 'union',
    });
    expect(state.ordersPhase.pendingOrderIssuance).toEqual({ leaderId: 'cox', unitId: 'colquitt' });
    expect(state.ordersPhase.leaderRollUsed['cox']).toBe(true);

    state = dispatch(state, {
      type: 'ISSUE_ORDER',
      payload: { unitId: 'colquitt', orderType: 'attack' },
      playerSide: 'union',
    });
    expect(state.units['colquitt'].orders).toEqual({
      type: 'attack',
      status: 'accepted',
      deliveryTurnDue: null,
    });
    expect(state.ordersPhase.pendingOrderIssuance).toBeNull();
  });

  it('ACTIVATE_STACK → END_ACTIVATION → END_PHASE through dispatch', () => {
    let state = dispatch(ACTIVITY_STATE, {
      type: 'ACTIVATE_STACK',
      payload: { hex: '29.22' },
      playerSide: 'union',
    });
    expect(state.activityPhase.currentActivation).toBe('29.22');

    state = dispatch(state, { type: 'END_ACTIVATION', payload: null, playerSide: 'union' });
    expect(state.activityPhase.activatedUnits).toContain('29.22');
    expect(state.activityPhase.currentActivation).toBeNull();

    // Union ends their activation turn; confederate gets theirs
    state = dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'union' });
    expect(state.phase).toBe('activity');
    expect(state.activePlayer).toBe('confederate');
  });
});
