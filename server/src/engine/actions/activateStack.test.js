import { describe, it, expect } from 'vitest';

import { handleActivateStack } from './activateStack.js';
import { ActionError } from './actionError.js';

const ACTIVITY_STATE = {
  id: 'g1',
  scenarioId: 'south-mountain',
  version: 1,
  turn: 1,
  phase: 'activity',
  step: 'activation',
  activePlayer: 'union',
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-u', confederate: 'tok-c' },
  units: {},
  reinforcementQueue: [],
  status: 'active',
  leaderState: {},
  pendingResolution: null,
  ordersPhase: null,
  activityPhase: { activatedUnits: [], currentActivation: null },
};

describe('handleActivateStack', () => {
  it('sets currentActivation to the given hex', () => {
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    const result = handleActivateStack(ACTIVITY_STATE, action);
    expect(result.activityPhase.currentActivation).toBe('29.22');
  });

  it('does not add the hex to activatedUnits yet (activation not complete)', () => {
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    const result = handleActivateStack(ACTIVITY_STATE, action);
    expect(result.activityPhase.activatedUnits).toEqual([]);
  });

  it('throws INVALID_ACTION when another stack is mid-activation (LOB §3.0d)', () => {
    const state = {
      ...ACTIVITY_STATE,
      activityPhase: { activatedUnits: [], currentActivation: '10.10' },
    };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    expect(() => handleActivateStack(state, action)).toThrow(ActionError);
    try {
      handleActivateStack(state, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_ACTION when the hex stack was already activated this phase', () => {
    const state = {
      ...ACTIVITY_STATE,
      activityPhase: { activatedUnits: ['29.22'], currentActivation: null },
    };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    expect(() => handleActivateStack(state, action)).toThrow(ActionError);
    try {
      handleActivateStack(state, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when hex is missing', () => {
    const action = { type: 'ACTIVATE_STACK', payload: {} };
    expect(() => handleActivateStack(ACTIVITY_STATE, action)).toThrow(ActionError);
    try {
      handleActivateStack(ACTIVITY_STATE, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_ACTION when activityPhase is null', () => {
    const state = { ...ACTIVITY_STATE, activityPhase: null };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    expect(() => handleActivateStack(state, action)).toThrow(ActionError);
    try {
      handleActivateStack(state, action);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('does not mutate input state', () => {
    const snapshot = JSON.parse(JSON.stringify(ACTIVITY_STATE));
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    handleActivateStack(ACTIVITY_STATE, action);
    expect(ACTIVITY_STATE).toEqual(snapshot);
  });
});
