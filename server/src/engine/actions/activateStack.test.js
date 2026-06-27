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
  it('sets currentActivation to an object with the hex and default flags', () => {
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    const result = handleActivateStack(ACTIVITY_STATE, action);
    expect(result.activityPhase.currentActivation).toEqual({
      hex: '29.22',
      movedThisActivation: false,
      openingVolley: false,
      zeroRuleFired: false,
    });
  });

  it('does not add the hex to activatedUnits yet (activation not complete)', () => {
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '29.22' } };
    const result = handleActivateStack(ACTIVITY_STATE, action);
    expect(result.activityPhase.activatedUnits).toEqual([]);
  });

  it('throws INVALID_ACTION when another stack is mid-activation (LOB §3.0d)', () => {
    const state = {
      ...ACTIVITY_STATE,
      activityPhase: {
        activatedUnits: [],
        currentActivation: {
          hex: '10.10',
          movedThisActivation: false,
          openingVolley: false,
          zeroRuleFired: false,
        },
      },
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

// ─── handleActivateStack — remainingMPs initialization (LOB §3) ───────────────

describe('handleActivateStack — remainingMPs initialization', () => {
  // Mirrors scenario.json movementCosts.movementAllowances structure
  const ALLOWANCES = { line: 6, column: 6, mounted: 12, limbered: 7, leader: 12 };
  const MOCK_SCENARIO = { movementCosts: { movementAllowances: ALLOWANCES } };

  // Minimal OOB with infantry, cavalry, and leader unit entries
  const MOCK_OOB = {
    union: {
      corps: [
        {
          divisions: [
            {
              brigades: [
                {
                  regiments: [
                    { id: 'inf1', type: 'infantry', strengthPoints: 10 },
                    { id: 'cav1', type: 'cavalry', strengthPoints: 4 },
                    { id: 'lead1', type: 'leader' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    confederate: { divisions: [] },
  };

  function makeOnBoardUnit(id, hex, overrides = {}) {
    return {
      id,
      hex,
      isOnBoard: true,
      facing: 0,
      moraleState: 'normal',
      wrecked: false,
      orders: null,
      ammo: 'full',
      depletionMarker: false,
      cbfMarker: false,
      entryTurn: null,
      isDetached: false,
      ...overrides,
    };
  }

  it('sets remainingMPs to movementAllowances.line for infantry (default type)', () => {
    const state = { ...ACTIVITY_STATE, units: { inf1: makeOnBoardUnit('inf1', '10.10') } };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, { scenario: MOCK_SCENARIO, oob: MOCK_OOB });
    expect(result.units.inf1.remainingMPs).toBe(6);
  });

  it('sets remainingMPs to movementAllowances.mounted for cavalry (LOB §3)', () => {
    const state = { ...ACTIVITY_STATE, units: { cav1: makeOnBoardUnit('cav1', '10.10') } };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, { scenario: MOCK_SCENARIO, oob: MOCK_OOB });
    expect(result.units.cav1.remainingMPs).toBe(12);
  });

  it('sets remainingMPs to movementAllowances.leader for leader type', () => {
    const state = { ...ACTIVITY_STATE, units: { lead1: makeOnBoardUnit('lead1', '10.10') } };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, { scenario: MOCK_SCENARIO, oob: MOCK_OOB });
    expect(result.units.lead1.remainingMPs).toBe(12);
  });

  it('sets remainingMPs to movementAllowances.limbered for limbered artillery', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: { inf1: makeOnBoardUnit('inf1', '10.10', { formation: 'limbered' }) },
    };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, { scenario: MOCK_SCENARIO, oob: MOCK_OOB });
    expect(result.units.inf1.remainingMPs).toBe(7);
  });

  it('sets remainingMPs to 0 for unlimbered artillery (LOB §3.6a)', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: { inf1: makeOnBoardUnit('inf1', '10.10', { formation: 'unlimbered' }) },
    };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, { scenario: MOCK_SCENARIO, oob: MOCK_OOB });
    expect(result.units.inf1.remainingMPs).toBe(0);
  });

  it('does not set remainingMPs on off-board units in the activated hex', () => {
    const state = {
      ...ACTIVITY_STATE,
      units: { inf1: makeOnBoardUnit('inf1', '10.10', { isOnBoard: false }) },
    };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, { scenario: MOCK_SCENARIO, oob: MOCK_OOB });
    expect(result.units.inf1.remainingMPs).toBeUndefined();
  });

  it('leaves units unchanged when ctx has no scenario (test-stub fallback)', () => {
    const state = { ...ACTIVITY_STATE, units: { inf1: makeOnBoardUnit('inf1', '10.10') } };
    const action = { type: 'ACTIVATE_STACK', payload: { hex: '10.10' } };
    const result = handleActivateStack(state, action, {});
    expect(result.units.inf1.remainingMPs).toBeUndefined();
  });
});
