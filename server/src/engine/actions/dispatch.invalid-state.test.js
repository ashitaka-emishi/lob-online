import { describe, it, expect, vi } from 'vitest';

// vi.mock is hoisted before imports, so index.js picks up the mocked handleEndPhase
// when building its HANDLERS map — the only way to inject a broken handler in ESM.
vi.mock('./endPhase.js', () => ({
  handleEndPhase: vi.fn(() => ({ id: 'corrupt-state' })),
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

describe('dispatch — INVALID_STATE path', () => {
  it('throws ActionError{ code: INVALID_STATE } when a handler returns schema-invalid state', () => {
    const action = { type: 'END_PHASE', payload: null, playerSide: 'union' };
    expect(() => dispatch(COMMAND_ORDERS_STATE, action)).toThrow(ActionError);
    try {
      dispatch(COMMAND_ORDERS_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_STATE');
    }
  });
});
