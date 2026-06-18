import { describe, it, expect } from 'vitest';

import { handleRallyRoll } from './rallyRoll.js';
import { getValidActions, drainAutoSteps } from './index.js';
import { ActionError } from './actionError.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeUnit(id, hex, moraleState = 'routed') {
  return {
    id,
    hex,
    facing: 0,
    moraleState,
    wrecked: false,
    orders: null,
    ammo: 'full',
    depletionMarker: false,
    cbfMarker: false,
    isOnBoard: true,
    entryTurn: null,
    isDetached: false,
  };
}

function makeRallyState(pendingUnitIds, extraUnits = {}) {
  return {
    id: 'g1',
    scenarioId: 'south-mountain',
    schemaVersion: 3,
    version: 1,
    turn: 1,
    phase: 'rally',
    step: 'rally',
    activePlayer: 'union',
    completedSteps: [],
    initiative: null,
    sides: { union: 'tok-u', confederate: 'tok-c' },
    reinforcementQueue: [],
    status: 'active',
    leaderState: {},
    pendingResolution: null,
    activityPhase: null,
    ordersPhase: null,
    rallyPhase: {
      unitsPendingRally: [],
      pendingRallyRoll: pendingUnitIds.length > 0 ? { unitIds: pendingUnitIds } : null,
    },
    units: {
      u1: makeUnit('u1', '05.05', 'routed'),
      u2: makeUnit('u2', '05.06', 'routed'),
      ...extraUnits,
    },
  };
}

// ─── handleRallyRoll unit tests ───────────────────────────────────────────────

describe('handleRallyRoll', () => {
  it('converts routed unit to disorganized on successful rally (die+leader ≥ 5, LOB §6.4 step 3)', () => {
    const state = makeRallyState(['u1']);
    // die 3 + leaderMoraleValue 2 = 5 → success → DG
    const result = handleRallyRoll(state, {
      type: 'RALLY_ROLL',
      payload: { unitId: 'u1', die: 3, leaderMoraleValue: 2 },
      playerSide: 'union',
    });
    expect(result.units.u1.moraleState).toBe('disorganized');
  });

  it('leaves routed unit routed on failed rally (die+leader < 5, LOB §6.4 step 3)', () => {
    const state = makeRallyState(['u1']);
    // die 2 + leaderMoraleValue 0 = 2 → fail → remains routed
    const result = handleRallyRoll(state, {
      type: 'RALLY_ROLL',
      payload: { unitId: 'u1', die: 2, leaderMoraleValue: 0 },
      playerSide: 'union',
    });
    expect(result.units.u1.moraleState).toBe('routed');
  });

  it('removes resolved unitId from pendingRallyRoll (LOB §6.4 step 3)', () => {
    const state = makeRallyState(['u1', 'u2']);
    const result = handleRallyRoll(state, {
      type: 'RALLY_ROLL',
      payload: { unitId: 'u1', die: 5, leaderMoraleValue: 0 },
      playerSide: 'union',
    });
    expect(result.rallyPhase.pendingRallyRoll.unitIds).toEqual(['u2']);
    expect(result.rallyPhase.pendingRallyRoll.unitIds).not.toContain('u1');
  });

  it('sets pendingRallyRoll to null when last unit is resolved (LOB §6.4 step 3)', () => {
    const state = makeRallyState(['u1']);
    const result = handleRallyRoll(state, {
      type: 'RALLY_ROLL',
      payload: { unitId: 'u1', die: 6, leaderMoraleValue: 0 },
      playerSide: 'union',
    });
    expect(result.rallyPhase.pendingRallyRoll).toBeNull();
  });

  it('leaderMoraleValue defaults to 0 when omitted (LOB §6.4 step 3)', () => {
    const state = makeRallyState(['u1']);
    // die 5 + 0 = 5 → success
    const result = handleRallyRoll(state, {
      type: 'RALLY_ROLL',
      payload: { unitId: 'u1', die: 5 },
      playerSide: 'union',
    });
    expect(result.units.u1.moraleState).toBe('disorganized');
  });

  it('does not mutate input state', () => {
    const state = makeRallyState(['u1']);
    const snapshot = JSON.parse(JSON.stringify(state));
    handleRallyRoll(state, {
      type: 'RALLY_ROLL',
      payload: { unitId: 'u1', die: 6, leaderMoraleValue: 0 },
      playerSide: 'union',
    });
    expect(state).toEqual(snapshot);
  });

  describe('validation errors', () => {
    it('throws INVALID_ACTION when phase is not rally', () => {
      const state = { ...makeRallyState(['u1']), phase: 'activity' };
      expect(() =>
        handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { unitId: 'u1', die: 5 } })
      ).toThrow(ActionError);
    });

    it('throws INVALID_ACTION when pendingRallyRoll is null', () => {
      const state = makeRallyState([]); // no pending rolls
      expect(() =>
        handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { unitId: 'u1', die: 5 } })
      ).toThrow(ActionError);
    });

    it('throws INVALID_ACTION when unitId is not in pendingRallyRoll list', () => {
      const state = makeRallyState(['u2']); // u1 not pending
      expect(() =>
        handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { unitId: 'u1', die: 5 } })
      ).toThrow(ActionError);
    });

    it('throws INVALID_ACTION when unit is not routed', () => {
      const state = makeRallyState(['u1'], {
        u1: makeUnit('u1', '05.05', 'disorganized'),
      });
      expect(() =>
        handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { unitId: 'u1', die: 5 } })
      ).toThrow(ActionError);
    });

    it('throws INVALID_PAYLOAD when die is out of range', () => {
      const state = makeRallyState(['u1']);
      expect(() =>
        handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { unitId: 'u1', die: 7 } })
      ).toThrow(ActionError);
    });

    it('throws INVALID_PAYLOAD when die is missing', () => {
      const state = makeRallyState(['u1']);
      expect(() =>
        handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { unitId: 'u1' } })
      ).toThrow(ActionError);
    });

    it('throws INVALID_PAYLOAD when unitId is missing', () => {
      const state = makeRallyState(['u1']);
      expect(() => handleRallyRoll(state, { type: 'RALLY_ROLL', payload: { die: 5 } })).toThrow(
        ActionError
      );
    });
  });
});

// ─── getValidActions gate ─────────────────────────────────────────────────────

describe('getValidActions — RALLY_ROLL gate (LOB §6.4 step 3)', () => {
  it('returns RALLY_ROLL candidates for each pending unit when pendingRallyRoll is set', () => {
    const state = makeRallyState(['u1', 'u2']);
    const actions = getValidActions(state, 'union');
    expect(actions.map((a) => a.type)).toEqual(['RALLY_ROLL', 'RALLY_ROLL']);
    expect(actions[0].payload.unitId).toBe('u1');
    expect(actions[1].payload.unitId).toBe('u2');
  });

  it('returns no RALLY_ROLL when pendingRallyRoll is null', () => {
    const state = makeRallyState([]);
    const actions = getValidActions(state, 'union');
    expect(actions.some((a) => a.type === 'RALLY_ROLL')).toBe(false);
  });

  it('RALLY_ROLL gate blocks all other actions while rolls are pending', () => {
    const state = makeRallyState(['u1']);
    const actions = getValidActions(state, 'union');
    // Only RALLY_ROLL candidates returned — no END_PHASE etc.
    expect(actions.every((a) => a.type === 'RALLY_ROLL')).toBe(true);
  });
});

// ─── drainAutoSteps pause behaviour ──────────────────────────────────────────

describe('drainAutoSteps — pauses for RALLY_ROLL when routed units present (LOB §6.4 step 3)', () => {
  function makePreRallyState(routedUnitId) {
    // State entering Rally phase with one routed unit — drainAutoSteps should pause
    return {
      id: 'g1',
      scenarioId: 'south-mountain',
      schemaVersion: 3,
      version: 1,
      turn: 1,
      phase: 'rally',
      step: 'rally',
      activePlayer: 'union',
      completedSteps: [],
      initiative: null,
      sides: { union: 'tok-u', confederate: 'tok-c' },
      reinforcementQueue: [],
      status: 'active',
      leaderState: {},
      pendingResolution: null,
      activityPhase: null,
      ordersPhase: null,
      rallyPhase: { unitsPendingRally: [], pendingRallyRoll: null },
      units: {
        [routedUnitId]: makeUnit(routedUnitId, '05.05', 'routed'),
      },
    };
  }

  it('sets pendingRallyRoll when a routed unit is present in Rally Phase', () => {
    const state = makePreRallyState('u1');
    const drained = drainAutoSteps(state);
    // Must pause in rally phase with pendingRallyRoll set
    expect(drained.phase).toBe('rally');
    expect(drained.rallyPhase?.pendingRallyRoll?.unitIds).toContain('u1');
  });

  it('does NOT advance to next turn while pendingRallyRoll is set', () => {
    const state = makePreRallyState('u1');
    const drained = drainAutoSteps(state);
    expect(drained.turn).toBe(1); // still turn 1 — did not advance
    expect(drained.phase).toBe('rally');
  });

  it('advances to next turn when no routed units require rally rolls', () => {
    // Unit is normal (not routed) — should auto-advance past Rally Phase
    const state = {
      ...makePreRallyState('u1'),
      units: { u1: makeUnit('u1', '05.05', 'normal') },
    };
    const drained = drainAutoSteps(state);
    expect(drained.phase).toBe('command');
    expect(drained.turn).toBe(2);
  });
});
