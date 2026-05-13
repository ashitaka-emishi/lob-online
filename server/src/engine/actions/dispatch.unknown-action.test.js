import { describe, it, expect, vi } from 'vitest';

// ⚠ FILE ISOLATION: this file's vi.mock replaces handleEndPhase with undefined for the entire module
// scope so HANDLERS.END_PHASE is undefined, triggering the UNKNOWN_ACTION path in dispatch().
// Do NOT add tests here that require the real handleEndPhase — they will silently receive undefined.
// For tests needing real handlers, use index.test.js or dispatch.invalid-state.test.js.
vi.mock('./endPhase.js', () => ({
  handleEndPhase: undefined,
}));

import { dispatch, ActionError } from './index.js';

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
    // END_PHASE is returned by getValidActions but its handler is mocked to undefined above.
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
