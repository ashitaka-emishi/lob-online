import { describe, it, expect } from 'vitest';

import { handleEndActivation } from './endActivation.js';
import { ActionError } from './actionError.js';

const MID_ACTIVATION_STATE = {
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
  activityPhase: { activatedUnits: [], currentActivation: '29.22' },
};

describe('handleEndActivation', () => {
  it('moves currentActivation hex to activatedUnits (LOB §3.0d)', () => {
    const result = handleEndActivation(MID_ACTIVATION_STATE, { type: 'END_ACTIVATION' });
    expect(result.activityPhase.activatedUnits).toContain('29.22');
    expect(result.activityPhase.currentActivation).toBeNull();
  });

  it('appends to existing activatedUnits without overwriting', () => {
    const state = {
      ...MID_ACTIVATION_STATE,
      activityPhase: { activatedUnits: ['10.10'], currentActivation: '29.22' },
    };
    const result = handleEndActivation(state, { type: 'END_ACTIVATION' });
    expect(result.activityPhase.activatedUnits).toEqual(['10.10', '29.22']);
  });

  it('keeps phase and step unchanged (player must call END_PHASE separately)', () => {
    const result = handleEndActivation(MID_ACTIVATION_STATE, { type: 'END_ACTIVATION' });
    expect(result.phase).toBe('activity');
    expect(result.step).toBe('activation');
  });

  it('throws INVALID_ACTION when no stack is mid-activation', () => {
    const state = {
      ...MID_ACTIVATION_STATE,
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
    expect(() => handleEndActivation(state, { type: 'END_ACTIVATION' })).toThrow(ActionError);
    try {
      handleEndActivation(state, { type: 'END_ACTIVATION' });
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_ACTION when activityPhase is null', () => {
    const state = { ...MID_ACTIVATION_STATE, activityPhase: null };
    expect(() => handleEndActivation(state, { type: 'END_ACTIVATION' })).toThrow(ActionError);
    try {
      handleEndActivation(state, { type: 'END_ACTIVATION' });
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('does not mutate input state', () => {
    const snapshot = JSON.parse(JSON.stringify(MID_ACTIVATION_STATE));
    handleEndActivation(MID_ACTIVATION_STATE, { type: 'END_ACTIVATION' });
    expect(MID_ACTIVATION_STATE).toEqual(snapshot);
  });
});
