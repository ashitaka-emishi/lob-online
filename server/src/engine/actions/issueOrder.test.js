import { describe, it, expect } from 'vitest';

import { handleRollInitiative, handleIssueOrder } from './issueOrder.js';
import { ActionError } from './actionError.js';

const BASE_UNIT = {
  id: 'colquitt',
  hex: '29.22',
  facing: 0,
  moraleState: 'normal',
  wrecked: false,
  orders: null,
  ammo: 'full',
  isOnBoard: true,
  entryTurn: null,
  isDetached: false,
};

const COMMAND_ORDERS = {
  id: 'g1',
  scenarioId: 'south-mountain',
  version: 1,
  turn: 1,
  phase: 'command',
  step: 'orders',
  activePlayer: 'union',
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-u', confederate: 'tok-c' },
  units: { colquitt: BASE_UNIT },
  reinforcementQueue: [],
  status: 'active',
  leaderState: {},
  pendingResolution: null,
  activityPhase: null,
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
};

describe('handleRollInitiative', () => {
  it('marks leader as rolled and sets pendingOrderIssuance (M5 always succeeds)', () => {
    const action = {
      type: 'ROLL_INITIATIVE',
      payload: { leaderId: 'cox', unitId: 'colquitt', diceResult: 4 },
    };
    const result = handleRollInitiative(COMMAND_ORDERS, action);
    expect(result.ordersPhase.leaderRollUsed['cox']).toBe(true);
    expect(result.ordersPhase.pendingOrderIssuance).toEqual({
      leaderId: 'cox',
      unitId: 'colquitt',
    });
  });

  it('throws INVALID_ACTION if leader has already rolled this turn (LOB §10.6)', () => {
    const state = {
      ...COMMAND_ORDERS,
      ordersPhase: { leaderRollUsed: { cox: true }, pendingOrderIssuance: null },
    };
    const action = {
      type: 'ROLL_INITIATIVE',
      payload: { leaderId: 'cox', unitId: 'colquitt', diceResult: 3 },
    };
    expect(() => handleRollInitiative(state, action)).toThrow(ActionError);
    try {
      handleRollInitiative(state, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD if leaderId is missing', () => {
    const action = { type: 'ROLL_INITIATIVE', payload: { unitId: 'colquitt' } };
    expect(() => handleRollInitiative(COMMAND_ORDERS, action)).toThrow(ActionError);
    try {
      handleRollInitiative(COMMAND_ORDERS, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD if unitId is missing', () => {
    const action = { type: 'ROLL_INITIATIVE', payload: { leaderId: 'cox' } };
    expect(() => handleRollInitiative(COMMAND_ORDERS, action)).toThrow(ActionError);
  });

  it('does not mutate input state', () => {
    const action = {
      type: 'ROLL_INITIATIVE',
      payload: { leaderId: 'cox', unitId: 'colquitt', diceResult: 5 },
    };
    handleRollInitiative(COMMAND_ORDERS, action);
    expect(COMMAND_ORDERS.ordersPhase.pendingOrderIssuance).toBeNull();
  });
});

describe('handleIssueOrder', () => {
  const PENDING_STATE = {
    ...COMMAND_ORDERS,
    ordersPhase: {
      leaderRollUsed: { cox: true },
      pendingOrderIssuance: { leaderId: 'cox', unitId: 'colquitt' },
    },
  };

  it('sets the unit orders to accepted and clears pendingOrderIssuance (LOB §10.4a–b)', () => {
    const action = { type: 'ISSUE_ORDER', payload: { unitId: 'colquitt', orderType: 'move' } };
    const result = handleIssueOrder(PENDING_STATE, action);
    expect(result.units['colquitt'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
    expect(result.ordersPhase.pendingOrderIssuance).toBeNull();
  });

  it('accepts attack order type (LOB §10.4a)', () => {
    const action = { type: 'ISSUE_ORDER', payload: { unitId: 'colquitt', orderType: 'attack' } };
    const result = handleIssueOrder(PENDING_STATE, action);
    expect(result.units['colquitt'].orders.type).toBe('attack');
  });

  it('throws INVALID_ACTION when no pending order issuance', () => {
    const action = { type: 'ISSUE_ORDER', payload: { unitId: 'colquitt', orderType: 'move' } };
    expect(() => handleIssueOrder(COMMAND_ORDERS, action)).toThrow(ActionError);
    try {
      handleIssueOrder(COMMAND_ORDERS, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when unitId does not match pending target', () => {
    const action = { type: 'ISSUE_ORDER', payload: { unitId: 'other-unit', orderType: 'move' } };
    expect(() => handleIssueOrder(PENDING_STATE, action)).toThrow(ActionError);
    try {
      handleIssueOrder(PENDING_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD if unit does not exist in game state', () => {
    const state = { ...PENDING_STATE, units: {} };
    const action = { type: 'ISSUE_ORDER', payload: { unitId: 'colquitt', orderType: 'move' } };
    expect(() => handleIssueOrder(state, action)).toThrow(ActionError);
  });

  it('does not mutate input state', () => {
    const action = { type: 'ISSUE_ORDER', payload: { unitId: 'colquitt', orderType: 'move' } };
    handleIssueOrder(PENDING_STATE, action);
    expect(PENDING_STATE.ordersPhase.pendingOrderIssuance).not.toBeNull();
  });
});
