import { describe, it, expect } from 'vitest';

import { handleEndPhase } from './endPhase.js';
import { ActionError } from './actionError.js';

const BASE = {
  id: 'g1',
  scenarioId: 'south-mountain',
  version: 1,
  turn: 1,
  initiative: null,
  sides: { union: 'tok-u', confederate: 'tok-c' },
  units: {},
  reinforcementQueue: [],
  status: 'active',
  leaderState: {},
  pendingResolution: null,
};

const COMMAND_ORDERS = {
  ...BASE,
  phase: 'command',
  step: 'orders',
  activePlayer: 'union',
  completedSteps: [],
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
  activityPhase: null,
};

const ACTIVITY_FIRST = {
  ...BASE,
  phase: 'activity',
  step: 'activation',
  activePlayer: 'union',
  completedSteps: [],
  ordersPhase: null,
  activityPhase: { activatedUnits: [], currentActivation: null },
};

describe('handleEndPhase — Command phase → attackRecovery', () => {
  it('advances orders step to attackRecovery and records completed step', () => {
    const result = handleEndPhase(COMMAND_ORDERS, { type: 'END_PHASE', payload: null });
    expect(result.step).toBe('attackRecovery');
    expect(result.completedSteps).toContain('orders');
    expect(result.ordersPhase).toBeNull();
  });

  it('preserves all other state fields', () => {
    const result = handleEndPhase(COMMAND_ORDERS, { type: 'END_PHASE', payload: null });
    expect(result.phase).toBe('command');
    expect(result.activePlayer).toBe('union');
    expect(result.turn).toBe(1);
  });
});

describe('handleEndPhase — Activity phase, first player done', () => {
  it('flips activePlayer to other side and resets activityPhase', () => {
    const result = handleEndPhase(ACTIVITY_FIRST, { type: 'END_PHASE', payload: null });
    expect(result.activePlayer).toBe('confederate');
    expect(result.activityPhase).toEqual({ activatedUnits: [], currentActivation: null });
    expect(result.completedSteps).toContain('activation-union');
  });

  it('stays in activity phase after first player ends', () => {
    const result = handleEndPhase(ACTIVITY_FIRST, { type: 'END_PHASE', payload: null });
    expect(result.phase).toBe('activity');
    expect(result.step).toBe('activation');
  });

  it('throws INVALID_ACTION when a stack is mid-activation (LOB §3.0d)', () => {
    const state = {
      ...ACTIVITY_FIRST,
      activityPhase: { activatedUnits: [], currentActivation: '29.22' },
    };
    expect(() => handleEndPhase(state, { type: 'END_PHASE', payload: null })).toThrow(ActionError);
    try {
      handleEndPhase(state, { type: 'END_PHASE', payload: null });
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });
});

describe('handleEndPhase — Activity phase, second player done → Rally', () => {
  it('transitions to Rally Phase when both players have completed activation', () => {
    const state = {
      ...ACTIVITY_FIRST,
      activePlayer: 'confederate',
      completedSteps: ['activation-union'], // first player already done
      activityPhase: { activatedUnits: ['29.22'], currentActivation: null },
    };
    const result = handleEndPhase(state, { type: 'END_PHASE', payload: null });
    expect(result.phase).toBe('rally');
    expect(result.step).toBe('rally');
    expect(result.activityPhase).toBeNull();
    expect(result.completedSteps).toEqual([]);
  });

  it('sets activePlayer to the turn first player before drainAutoSteps flips it', () => {
    const state = {
      ...ACTIVITY_FIRST,
      activePlayer: 'confederate', // second player ending
      completedSteps: ['activation-union'],
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
    const result = handleEndPhase(state, { type: 'END_PHASE', payload: null });
    // otherSide = 'union' (the player who already went) — preserved so Rally flip produces confederate
    expect(result.activePlayer).toBe('union');
  });
});

describe('handleEndPhase — invalid state', () => {
  it('throws INVALID_ACTION for unknown phase/step combination', () => {
    const state = { ...COMMAND_ORDERS, phase: 'rally', step: 'rally' };
    expect(() => handleEndPhase(state, { type: 'END_PHASE', payload: null })).toThrow(ActionError);
  });
});
