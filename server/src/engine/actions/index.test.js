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
  schemaVersion: 1,
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

  // Task 1.1: ROLL_INITIATIVE candidates include { leaderId, unitId } payloads (#550)
  it('ROLL_INITIATIVE candidate carries { leaderId, unitId } payload for each eligible leader-unit pair', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      units: {
        colquitt: {
          ...BASE_UNIT,
          id: 'colquitt',
          orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
        },
        rodes: {
          ...BASE_UNIT,
          id: 'rodes',
          orders: { type: 'attack', status: 'accepted', deliveryTurnDue: null },
        },
      },
      leaderState: { cox: { hex: '29.22', isOnBoard: true } },
      ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
    };
    const actions = getValidActions(state, 'union');
    const rollAction = actions.find((a) => a.type === 'ROLL_INITIATIVE');
    expect(rollAction).toBeDefined();
    // payload must include leaderId and unitId — engine-side candidates for the M5 steel-thread
    expect(rollAction.payload).toMatchObject({
      leaderId: expect.any(String),
      unitId: expect.any(String),
    });
  });

  it('ROLL_INITIATIVE candidate is null-payload when no leaders are available (base case #550)', () => {
    // When state has no leaderState entries, fall back to null payload (existing behavior)
    const actions = getValidActions(COMMAND_ORDERS_STATE, 'union');
    const rollAction = actions.find((a) => a.type === 'ROLL_INITIATIVE');
    expect(rollAction).toBeDefined();
    expect(rollAction.payload).toBeNull();
  });

  it('ROLL_INITIATIVE excludes leaders that have already rolled this turn (#550)', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      leaderState: {
        cox: { hex: '29.22', isOnBoard: true },
        jones: { hex: '30.22', isOnBoard: true },
      },
      ordersPhase: { leaderRollUsed: { cox: true }, pendingOrderIssuance: null },
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt' },
        rodes: { ...BASE_UNIT, id: 'rodes' },
      },
    };
    const actions = getValidActions(state, 'union');
    const rollActions = actions.filter((a) => a.type === 'ROLL_INITIATIVE');
    // cox already rolled — should only get candidates for jones
    const leaderIds = rollActions.map((a) => a.payload?.leaderId).filter(Boolean);
    expect(leaderIds).not.toContain('cox');
  });

  // Task 1.2: ISSUE_ORDER candidates include { unitId, orderType } payloads (#550)
  it('returns only ISSUE_ORDER after a successful initiative roll', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      ordersPhase: {
        leaderRollUsed: { cox: true },
        pendingOrderIssuance: { leaderId: 'cox', unitId: 'colquitt' },
      },
    };
    const actions = getValidActions(state, 'union');
    // Two ISSUE_ORDER candidates — one per order type (attack + move) (#550)
    expect(actions.map((a) => a.type)).toEqual(['ISSUE_ORDER', 'ISSUE_ORDER']);
  });

  it('ISSUE_ORDER candidates carry { unitId, orderType } payloads for attack and move (#550)', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      ordersPhase: {
        leaderRollUsed: { cox: true },
        pendingOrderIssuance: { leaderId: 'cox', unitId: 'colquitt' },
      },
    };
    const actions = getValidActions(state, 'union');
    const orderTypes = actions
      .filter((a) => a.type === 'ISSUE_ORDER')
      .map((a) => a.payload?.orderType);
    // Must offer both attack and move as concrete candidates
    expect(orderTypes).toContain('attack');
    expect(orderTypes).toContain('move');
    // All ISSUE_ORDER candidates must have the correct unitId
    const unitIds = actions.filter((a) => a.type === 'ISSUE_ORDER').map((a) => a.payload?.unitId);
    expect(unitIds.every((id) => id === 'colquitt')).toBe(true);
  });

  // Task 1.3: ACTIVATE_STACK candidates include { hex } payloads (#550)
  it('returns ACTIVATE_STACK and END_PHASE during activity/activation (no current activation)', () => {
    const actions = getValidActions(ACTIVITY_STATE, 'union');
    expect(actions.map((a) => a.type)).toEqual(['ACTIVATE_STACK', 'END_PHASE']);
  });

  it('ACTIVATE_STACK candidates carry { hex } payloads for each occupied, un-activated hex (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt', hex: '29.22', isOnBoard: true },
        rodes: { ...BASE_UNIT, id: 'rodes', hex: '30.22', isOnBoard: true },
      },
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
    const actions = getValidActions(state, 'union');
    const activateActions = actions.filter((a) => a.type === 'ACTIVATE_STACK');
    const hexes = activateActions.map((a) => a.payload?.hex);
    expect(hexes).toContain('29.22');
    expect(hexes).toContain('30.22');
  });

  // Task 1.3: already-activated stacks excluded from ACTIVATE_STACK candidates (#550)
  it('ACTIVATE_STACK excludes already-activated hexes (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt', hex: '29.22', isOnBoard: true },
        rodes: { ...BASE_UNIT, id: 'rodes', hex: '30.22', isOnBoard: true },
      },
      activityPhase: { activatedUnits: ['29.22'], currentActivation: null },
    };
    const actions = getValidActions(state, 'union');
    const hexes = actions.filter((a) => a.type === 'ACTIVATE_STACK').map((a) => a.payload?.hex);
    expect(hexes).not.toContain('29.22');
    expect(hexes).toContain('30.22');
  });

  it('ACTIVATE_STACK excludes off-board units (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt', hex: '29.22', isOnBoard: true },
        offboard: { ...BASE_UNIT, id: 'offboard', hex: null, isOnBoard: false },
      },
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
    const actions = getValidActions(state, 'union');
    const hexes = actions.filter((a) => a.type === 'ACTIVATE_STACK').map((a) => a.payload?.hex);
    expect(hexes).toContain('29.22');
    expect(hexes).not.toContain(null);
  });

  // Task 1.4: END_ACTIVATION only when currentActivation is set (#550)
  it('returns only END_ACTIVATION when a stack is mid-activation', () => {
    const state = {
      ...ACTIVITY_STATE,
      activityPhase: { activatedUnits: [], currentActivation: '29.22' },
    };
    const actions = getValidActions(state, 'union');
    expect(actions.map((a) => a.type)).toEqual(['END_ACTIVATION']);
  });

  it('END_ACTIVATION has null payload (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      activityPhase: { activatedUnits: [], currentActivation: '29.22' },
    };
    const actions = getValidActions(state, 'union');
    expect(actions[0].payload).toBeNull();
  });

  it('does not return END_ACTIVATION when no stack is mid-activation (#550)', () => {
    const actions = getValidActions(ACTIVITY_STATE, 'union');
    expect(actions.map((a) => a.type)).not.toContain('END_ACTIVATION');
  });

  // Task 1.5: END_PHASE, wrong-side, pending-resolution guards (#550)
  it('END_PHASE has null payload (#550)', () => {
    const actions = getValidActions(COMMAND_ORDERS_STATE, 'union');
    const endPhase = actions.find((a) => a.type === 'END_PHASE');
    expect(endPhase?.payload).toBeNull();
  });

  it('returns [] for wrong playerSide (no payloads leak to wrong side) (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt', hex: '29.22', isOnBoard: true },
      },
    };
    expect(getValidActions(state, 'confederate')).toEqual([]);
  });

  it('returns [] when pendingResolution blocks all actions (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      pendingResolution: { type: 'looseCannonRoll', context: {} },
    };
    expect(getValidActions(state, 'union')).toEqual([]);
  });

  it('ACTIVATE_STACK is not included when all on-board hexes already activated (#550)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt', hex: '29.22', isOnBoard: true },
      },
      activityPhase: { activatedUnits: ['29.22'], currentActivation: null },
    };
    const actions = getValidActions(state, 'union');
    expect(actions.map((a) => a.type)).not.toContain('ACTIVATE_STACK');
    expect(actions.map((a) => a.type)).toContain('END_PHASE');
  });

  // Review H3 deferred: LOB §10.3 requires ROLL_INITIATIVE to target only friendly units.
  // UnitStateSchema has no side field (affiliation is OOB data); side-filtering is deferred
  // to M6. In M5, all units in game state are assumed to be from the same scenario OOB.
  // This test documents the current behaviour and pins that all on-board units appear as candidates.
  it('ROLL_INITIATIVE candidates include all on-board units (M5 — side-filter deferred to M6 LOB §10.3)', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      units: {
        colquitt: { ...BASE_UNIT, id: 'colquitt', isOnBoard: true },
        rodes: { ...BASE_UNIT, id: 'rodes', isOnBoard: true },
      },
      leaderState: { cox: { hex: '29.22', isOnBoard: true } },
      ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
    };
    const actions = getValidActions(state, 'union');
    const rollActions = actions.filter((a) => a.type === 'ROLL_INITIATIVE');
    const unitIds = rollActions.map((a) => a.payload?.unitId).filter(Boolean);
    expect(unitIds).toContain('colquitt');
    expect(unitIds).toContain('rodes');
  });

  // Review L3: ROLL_INITIATIVE cartesian expansion cardinality (leaders × units)
  it('ROLL_INITIATIVE produces L×U candidates for L leaders and U on-board units (#559 review L3)', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      units: {
        unit1: { ...BASE_UNIT, id: 'unit1', isOnBoard: true },
        unit2: { ...BASE_UNIT, id: 'unit2', isOnBoard: true },
      },
      leaderState: {
        cox: { hex: '29.22', isOnBoard: true },
        jones: { hex: '30.22', isOnBoard: true },
      },
      ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
    };
    const actions = getValidActions(state, 'union');
    const rollActions = actions.filter((a) => a.type === 'ROLL_INITIATIVE');
    // 2 leaders × 2 units = 4 candidates
    expect(rollActions).toHaveLength(4);
    const pairs = rollActions.map((a) => `${a.payload.leaderId}:${a.payload.unitId}`);
    expect(pairs).toContain('cox:unit1');
    expect(pairs).toContain('cox:unit2');
    expect(pairs).toContain('jones:unit1');
    expect(pairs).toContain('jones:unit2');
  });

  // Review L4: ACTIVATE_STACK same-hex deduplication
  it('ACTIVATE_STACK deduplicates stacked units at the same hex (#559 review L4)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: {
        unit1: { ...BASE_UNIT, id: 'unit1', hex: '29.22', isOnBoard: true },
        unit2: { ...BASE_UNIT, id: 'unit2', hex: '29.22', isOnBoard: true },
      },
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
    const actions = getValidActions(state, 'union');
    const activateActions = actions.filter((a) => a.type === 'ACTIVATE_STACK');
    // Both units at same hex — only one ACTIVATE_STACK candidate expected
    expect(activateActions).toHaveLength(1);
    expect(activateActions[0].payload.hex).toBe('29.22');
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

  it('throws INVALID_STATE if ordersPhase is non-null in non-command phase (#389)', () => {
    // Simulates a future handler bug that leaves ordersPhase set after leaving command phase.
    expect.assertions(3);
    const corrupt = {
      ...ACTIVITY_STATE,
      ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
    };
    try {
      drainAutoSteps(corrupt);
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_STATE');
      expect(e.message).toMatch(/ordersPhase is non-null outside command phase/);
    }
  });

  it('throws INVALID_STATE if activityPhase is non-null outside activity phase (#389)', () => {
    // Simulates a future handler bug that sets activityPhase during command phase.
    expect.assertions(3);
    const corrupt = {
      ...COMMAND_ORDERS_STATE,
      step: 'attackRecovery',
      completedSteps: ['orders'],
      ordersPhase: null,
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
    try {
      drainAutoSteps(corrupt);
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_STATE');
      expect(e.message).toMatch(/activityPhase is non-null outside activity phase/);
    }
  });

  it('throws INVALID_STATE if ordersPhase is non-null during rally phase (#389)', () => {
    // Rally phase must have both envelopes null; a leftover ordersPhase is a handler bug.
    expect.assertions(3);
    const corrupt = {
      ...SETUP_STATE,
      status: 'active',
      phase: 'rally',
      step: 'rally',
      activePlayer: 'union',
      completedSteps: [],
      ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
    };
    try {
      drainAutoSteps(corrupt);
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_STATE');
      expect(e.message).toMatch(/ordersPhase is non-null outside command phase/);
    }
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

  it('throws ActionError{ code: INVALID_ACTION } for action in setup state — via validActions path, not whose-turn guard (M3)', () => {
    const action = { type: 'END_PHASE', payload: null, playerSide: 'union' };
    expect(() => dispatch(SETUP_STATE, action)).toThrow(ActionError);
    try {
      dispatch(SETUP_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
      // Must hit the getValidActions path (activePlayer===null skips the whose-turn guard)
      expect(e.message).toMatch(/not valid in the current state/);
    }
  });

  it('throws INVALID_ACTION via validActions path (not whose-turn guard) when pendingResolution blocks correct side (L6)', () => {
    const state = {
      ...COMMAND_ORDERS_STATE,
      pendingResolution: { type: 'looseCannonRoll', context: {} },
    };
    const action = { type: 'END_PHASE', payload: null, playerSide: 'union' };
    expect(() => dispatch(state, action)).toThrow(ActionError);
    try {
      dispatch(state, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
      // Correct side but pendingResolution blocks — validActions returns [], not the whose-turn guard
      expect(e.message).toMatch(/not valid in the current state/);
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
