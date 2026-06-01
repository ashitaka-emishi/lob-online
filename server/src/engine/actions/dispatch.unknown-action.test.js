import { afterEach, describe, it, expect } from 'vitest';

import { dispatch, ActionError, ACTION_HANDLERS } from './index.js';

// Save the real END_PHASE handler so we can restore it after each test.
const REAL_END_PHASE = ACTION_HANDLERS.get('END_PHASE');

afterEach(() => {
  ACTION_HANDLERS.set('END_PHASE', REAL_END_PHASE);
});

const COMMAND_ORDERS_STATE = {
  id: 'game-1',
  scenarioId: 'south-mountain',
  version: 1,
  turn: 1,
  phase: 'command',
  activePlayer: 'union',
  step: 'orders',
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-union', confederate: 'tok-csa' },
  units: {},
  reinforcementQueue: [],
  status: 'active',
  leaderState: {},
  pendingResolution: null,
  activityPhase: null,
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
};

describe('dispatch — UNKNOWN_ACTION path (#384)', () => {
  it('throws ActionError{ code: UNKNOWN_ACTION } with the action type in the message', () => {
    // Remove END_PHASE from the handler Map to simulate a registered-but-unimplemented action.
    // END_PHASE is returned by getValidActions for this state, so it passes the INVALID_ACTION
    // check; the missing Map entry then triggers the UNKNOWN_ACTION guard in dispatch().
    ACTION_HANDLERS.delete('END_PHASE');
    const action = { type: 'END_PHASE', payload: null, playerSide: 'union' };
    expect(() => dispatch(COMMAND_ORDERS_STATE, action)).toThrow(ActionError);
    try {
      dispatch(COMMAND_ORDERS_STATE, action);
    } catch (e) {
      expect(e.code).toBe('UNKNOWN_ACTION');
      expect(e.message).toContain('END_PHASE');
    }
  });
});
