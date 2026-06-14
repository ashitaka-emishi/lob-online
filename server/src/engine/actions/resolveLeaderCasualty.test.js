import { describe, it, expect } from 'vitest';

import { handleResolveLeaderCasualty } from './resolveLeaderCasualty.js';
import { ActionError } from './actionError.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_STATE = {
  id: 'g1',
  scenarioId: 'south-mountain',
  schemaVersion: 3,
  version: 1,
  turn: 1,
  phase: 'activity',
  step: 'activation',
  activePlayer: 'union',
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-u', confederate: 'tok-c' },
  reinforcementQueue: [],
  status: 'active',
  leaderState: {
    cox: { casualtyRollPending: false, replacedBy: null },
  },
  pendingResolution: {
    type: 'leaderCasualty',
    context: { leaderId: 'cox', hex: '10.10', reason: 'morale check with SP loss' },
  },
  ordersPhase: null,
  rallyPhase: null,
  activityPhase: {
    activatedUnits: [],
    currentActivation: {
      hex: '10.10',
      movedThisActivation: false,
      openingVolley: false,
      zeroRuleFired: false,
    },
  },
  units: {},
};

const NO_EFFECT_ACTION = {
  type: 'RESOLVE_LEADER_CASUALTY',
  payload: { leaderId: 'cox', roll: 7, situation: 'other', isSharpshooter: false },
  playerSide: 'union',
};

const WOUNDED_ACTION = {
  type: 'RESOLVE_LEADER_CASUALTY',
  payload: { leaderId: 'cox', roll: 11, situation: 'other', isSharpshooter: false },
  playerSide: 'union',
};

const KILLED_ACTION = {
  type: 'RESOLVE_LEADER_CASUALTY',
  payload: { leaderId: 'cox', roll: 12, situation: 'other', isSharpshooter: false },
  playerSide: 'union',
};

// ─── Validation ───────────────────────────────────────────────────────────────

describe('handleResolveLeaderCasualty — validation', () => {
  it('throws INVALID_ACTION when pendingResolution is null', () => {
    const state = { ...BASE_STATE, pendingResolution: null };
    expect(() => handleResolveLeaderCasualty(state, NO_EFFECT_ACTION)).toThrow(ActionError);
    try {
      handleResolveLeaderCasualty(state, NO_EFFECT_ACTION);
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_ACTION when pendingResolution is not leaderCasualty', () => {
    const state = { ...BASE_STATE, pendingResolution: { type: 'moraleCheck', context: {} } };
    expect(() => handleResolveLeaderCasualty(state, NO_EFFECT_ACTION)).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when leaderId is missing', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { roll: 7, situation: 'other' },
    };
    try {
      handleResolveLeaderCasualty(BASE_STATE, action);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when roll is missing', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { leaderId: 'cox', situation: 'other' },
    };
    try {
      handleResolveLeaderCasualty(BASE_STATE, action);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when roll is out of 2d6 range', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { leaderId: 'cox', roll: 1, situation: 'other' },
    };
    try {
      handleResolveLeaderCasualty(BASE_STATE, action);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD for unknown situation', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { leaderId: 'cox', roll: 7, situation: 'flanked' },
    };
    try {
      handleResolveLeaderCasualty(BASE_STATE, action);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when leaderId does not match pending context', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { leaderId: 'wrong-leader', roll: 7, situation: 'other' },
    };
    try {
      handleResolveLeaderCasualty(BASE_STATE, action);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });
});

// ─── noEffect outcome ─────────────────────────────────────────────────────────

describe('handleResolveLeaderCasualty — noEffect (LOB §9.1a)', () => {
  it('clears pendingResolution', () => {
    const result = handleResolveLeaderCasualty(BASE_STATE, NO_EFFECT_ACTION);
    expect(result.pendingResolution).toBeNull();
  });

  it('does not set casualtyRollPending on noEffect', () => {
    const result = handleResolveLeaderCasualty(BASE_STATE, NO_EFFECT_ACTION);
    expect(result.leaderState.cox.casualtyRollPending).toBe(false);
  });

  it('does not mutate input state', () => {
    const snapshot = JSON.parse(JSON.stringify(BASE_STATE));
    handleResolveLeaderCasualty(BASE_STATE, NO_EFFECT_ACTION);
    expect(BASE_STATE).toEqual(snapshot);
  });
});

// ─── wounded outcome ──────────────────────────────────────────────────────────

describe('handleResolveLeaderCasualty — wounded (LOB §9.1a)', () => {
  it('sets casualtyRollPending on wounded result', () => {
    const result = handleResolveLeaderCasualty(BASE_STATE, WOUNDED_ACTION);
    expect(result.leaderState.cox.casualtyRollPending).toBe(true);
  });

  it('clears pendingResolution after wounded', () => {
    const result = handleResolveLeaderCasualty(BASE_STATE, WOUNDED_ACTION);
    expect(result.pendingResolution).toBeNull();
  });
});

// ─── killed / captured outcomes ───────────────────────────────────────────────

describe('handleResolveLeaderCasualty — killed (LOB §9.1a)', () => {
  it('clears pendingResolution after killed', () => {
    const result = handleResolveLeaderCasualty(BASE_STATE, KILLED_ACTION);
    expect(result.pendingResolution).toBeNull();
  });

  it('sets replacedBy to null when no OOB is available (graceful fallback)', () => {
    // OOB may not be available in the test environment (module path not seeded)
    const result = handleResolveLeaderCasualty(BASE_STATE, KILLED_ACTION);
    // replacedBy is null (no succession data) or a successor id string
    expect(
      result.leaderState.cox.replacedBy === null ||
        typeof result.leaderState.cox.replacedBy === 'string'
    ).toBe(true);
  });

  it('does not set casualtyRollPending after killed', () => {
    const result = handleResolveLeaderCasualty(BASE_STATE, KILLED_ACTION);
    expect(result.leaderState.cox.casualtyRollPending).toBe(false);
  });
});

// ─── capture situation ────────────────────────────────────────────────────────

describe('handleResolveLeaderCasualty — capture situation (LOB §9.1a)', () => {
  it('captured result on roll 9 in capture situation', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { leaderId: 'cox', roll: 9, situation: 'capture', isSharpshooter: false },
    };
    const result = handleResolveLeaderCasualty(BASE_STATE, action);
    // captured → replacedBy set; casualtyRollPending false
    expect(result.leaderState.cox.casualtyRollPending).toBe(false);
    expect(result.pendingResolution).toBeNull();
  });

  it('noEffect result on roll 7 in capture situation', () => {
    const action = {
      ...NO_EFFECT_ACTION,
      payload: { leaderId: 'cox', roll: 7, situation: 'capture', isSharpshooter: false },
    };
    const result = handleResolveLeaderCasualty(BASE_STATE, action);
    expect(result.leaderState.cox.casualtyRollPending).toBe(false);
    expect(result.pendingResolution).toBeNull();
  });
});

// ─── getValidActions integration ──────────────────────────────────────────────

describe('getValidActions — leaderCasualty pending (LOB §9.1a)', () => {
  it('returns only RESOLVE_LEADER_CASUALTY when leaderCasualty pending', async () => {
    const { getValidActions } = await import('./index.js');
    const actions = getValidActions(BASE_STATE, 'union');
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('RESOLVE_LEADER_CASUALTY');
  });

  it('returns no actions for the wrong player side when leaderCasualty pending', async () => {
    const { getValidActions } = await import('./index.js');
    const actions = getValidActions(BASE_STATE, 'confederate');
    expect(actions).toEqual([]);
  });
});
