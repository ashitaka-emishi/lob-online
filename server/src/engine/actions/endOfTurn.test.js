import { describe, it, expect } from 'vitest';
import {
  handleRollAttackRecovery,
  handleAcknowledgeRandomEvent,
  handleScheduleVariableReinforcements,
  resolveRandomEvent,
  isRandomEventReroll,
} from './endOfTurn.js';
import { ActionError } from './actionError.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeUnit(id, overrides = {}) {
  return {
    id,
    hex: '05.05',
    facing: 0,
    moraleState: 'normal',
    wrecked: false,
    orders: null,
    ammo: 'full',
    depletionMarker: false,
    cbfMarker: false,
    isOnBoard: true,
    entryTurn: null,
    isDetached: false,
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    id: 'g1',
    scenarioId: 'south-mountain',
    schemaVersion: 3,
    version: 1,
    turn: 5,
    phase: 'command',
    step: 'attackRecovery',
    activePlayer: 'confederate',
    completedSteps: ['orders'],
    initiative: null,
    sides: { union: 'tok-u', confederate: 'tok-c' },
    reinforcementQueue: [],
    status: 'active',
    leaderState: {},
    pendingResolution: null,
    pendingAttackRecovery: null,
    variableReinforcementsScheduled: false,
    ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null, pendingRandomEvent: null },
    rallyPhase: null,
    activityPhase: null,
    units: {
      div1: makeUnit('div1', {
        orders: { type: 'attack', status: 'stopped', deliveryTurnDue: null },
      }),
    },
    ...overrides,
  };
}

// ─── ROLL_ATTACK_RECOVERY tests ───────────────────────────────────────────────

describe('handleRollAttackRecovery', () => {
  const ACTION = {
    type: 'ROLL_ATTACK_RECOVERY',
    payload: { divisionId: 'div1', commandValue: 3, step1Roll: 8, step2Roll: 9 },
    playerSide: 'confederate',
  };

  it('throws INVALID_ACTION when pendingAttackRecovery is null', () => {
    const state = makeState({ pendingAttackRecovery: null });
    expect(() => handleRollAttackRecovery(state, ACTION)).toThrow(ActionError);
  });

  it('throws INVALID_ACTION when divisionId not in pending list', () => {
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['other-div'] } });
    expect(() => handleRollAttackRecovery(state, ACTION)).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when step1Roll out of range', () => {
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['div1'] } });
    const badAction = { ...ACTION, payload: { ...ACTION.payload, step1Roll: 13 } };
    expect(() => handleRollAttackRecovery(state, badAction)).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when commandValue out of range', () => {
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['div1'] } });
    const badAction = { ...ACTION, payload: { ...ACTION.payload, commandValue: 5 } };
    expect(() => handleRollAttackRecovery(state, badAction)).toThrow(ActionError);
  });

  it('clears pendingAttackRecovery when last division is processed (LOB §10.8c)', () => {
    // step1Roll=8 ≥ threshold for 'clean' (8), step2Roll=9 ≥ threshold for CV=3 (8) → recovered
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['div1'] } });
    const result = handleRollAttackRecovery(state, ACTION);
    expect(result.pendingAttackRecovery).toBeNull();
  });

  it('removes recovered division from pending list but keeps others (LOB §10.8c)', () => {
    const state = makeState({
      pendingAttackRecovery: { divisionIds: ['div1', 'div2'] },
      units: {
        div1: makeUnit('div1', {
          orders: { type: 'attack', status: 'stopped', deliveryTurnDue: null },
        }),
        div2: makeUnit('div2', {
          orders: { type: 'attack', status: 'stopped', deliveryTurnDue: null },
        }),
      },
    });
    const result = handleRollAttackRecovery(state, ACTION);
    expect(result.pendingAttackRecovery?.divisionIds).toEqual(['div2']);
  });

  it('clears stopped order when division recovers (LOB §10.8c)', () => {
    // step1Roll=8 ≥ 8 (clean), step2Roll=9 ≥ 8 (CV=3) → recovered
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['div1'] } });
    const result = handleRollAttackRecovery(state, ACTION);
    expect(result.units.div1.orders?.status).toBe('none');
    expect(result.units.div1.orders?.type).toBeNull();
  });

  it('does not clear order when recovery fails (LOB §10.8c)', () => {
    // step1Roll=2 < 8 → base check fails → no recovery
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['div1'] } });
    const failAction = { ...ACTION, payload: { ...ACTION.payload, step1Roll: 2 } };
    const result = handleRollAttackRecovery(state, failAction);
    expect(result.units.div1.orders?.status).toBe('stopped');
  });

  it('does not mutate input state', () => {
    const state = makeState({ pendingAttackRecovery: { divisionIds: ['div1'] } });
    const snap = JSON.parse(JSON.stringify(state));
    handleRollAttackRecovery(state, ACTION);
    expect(state).toEqual(snap);
  });
});

// ─── ACKNOWLEDGE_RANDOM_EVENT tests ──────────────────────────────────────────

describe('handleAcknowledgeRandomEvent', () => {
  const EVENT = { side: 'confederate', roll: 4, event: 'Brigade Morale', text: 'Test event text.' };

  const PENDING_STATE = makeState({
    ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null, pendingRandomEvent: EVENT },
  });

  it('clears pendingRandomEvent from ordersPhase (SM §7.0)', () => {
    const result = handleAcknowledgeRandomEvent(PENDING_STATE);
    expect(result.ordersPhase?.pendingRandomEvent).toBeNull();
  });

  it('throws INVALID_ACTION when no event is pending', () => {
    const state = makeState(); // pendingRandomEvent: null
    expect(() => handleAcknowledgeRandomEvent(state)).toThrow(ActionError);
  });

  it('does not mutate input state', () => {
    const snap = JSON.parse(JSON.stringify(PENDING_STATE));
    handleAcknowledgeRandomEvent(PENDING_STATE);
    expect(PENDING_STATE).toEqual(snap);
  });
});

// ─── SCHEDULE_VARIABLE_REINFORCEMENTS tests ───────────────────────────────────

const MOCK_SCENARIO = {
  turnStructure: { firstTurn: '09:00' },
  reinforcements: {
    confederate: [
      {
        _id: 'force-a',
        variable: true,
        units: ['jones-hq', 'jones-btry'],
        variableTable: [
          { roll: 1, time: '14:30', entryHex: '39.35' },
          { roll: '2-3', time: '15:00', entryHex: '20.34' },
          { roll: '4-5', time: '15:30', entryHex: '39.35' },
          { roll: 6, time: '16:00', entryHex: '39.35' },
        ],
      },
    ],
    union: [],
  },
};

function makeSetupState(overrides = {}) {
  return {
    ...makeState({
      status: 'setup',
      phase: null,
      activePlayer: null,
      variableReinforcementsScheduled: false,
      reinforcementQueue: [
        { unitId: 'jones-hq', turn: 23, entryHex: '39.35' },
        { unitId: 'jones-btry', turn: 23, entryHex: '39.35' },
      ],
      units: {
        'jones-hq': makeUnit('jones-hq', { isOnBoard: false, entryTurn: 23 }),
        'jones-btry': makeUnit('jones-btry', { isOnBoard: false, entryTurn: 23 }),
      },
      ...overrides,
    }),
  };
}

describe('handleScheduleVariableReinforcements', () => {
  it('updates queue entry to resolved time/hex for roll=1 (→ 14:30, 39.35)', () => {
    const state = makeSetupState();
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 1 }] },
    };
    const result = handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO });
    const entry = result.reinforcementQueue.find((e) => e.unitId === 'jones-hq');
    // 14:30 = 09:00 + 330 min → ceil(330/20)+1 = 16+1 = turn 17 in 20-min turns
    expect(entry.entryHex).toBe('39.35');
    expect(result.variableReinforcementsScheduled).toBe(true);
  });

  it('resolves roll range 2–3 to 15:00@20.34', () => {
    const state = makeSetupState();
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 2 }] },
    };
    const result = handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO });
    const entry = result.reinforcementQueue.find((e) => e.unitId === 'jones-hq');
    expect(entry.entryHex).toBe('20.34');
  });

  it('marks variableReinforcementsScheduled true', () => {
    const state = makeSetupState();
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 4 }] },
    };
    const result = handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO });
    expect(result.variableReinforcementsScheduled).toBe(true);
  });

  it('throws INVALID_ACTION when already scheduled', () => {
    const state = makeSetupState({ variableReinforcementsScheduled: true });
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 1 }] },
    };
    expect(() =>
      handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO })
    ).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD when dieRoll out of range', () => {
    const state = makeSetupState();
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 7 }] },
    };
    expect(() =>
      handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO })
    ).toThrow(ActionError);
  });

  it('throws INVALID_PAYLOAD for unknown groupId', () => {
    const state = makeSetupState();
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-z', dieRoll: 1 }] },
    };
    expect(() =>
      handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO })
    ).toThrow(ActionError);
  });

  it('throws INVALID_STATE when scenario ctx missing', () => {
    const state = makeSetupState();
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 1 }] },
    };
    expect(() => handleScheduleVariableReinforcements(state, action)).toThrow(ActionError);
  });

  it('does not mutate input state', () => {
    const state = makeSetupState();
    const snap = JSON.parse(JSON.stringify(state));
    const action = {
      type: 'SCHEDULE_VARIABLE_REINFORCEMENTS',
      payload: { rolls: [{ groupId: 'force-a', dieRoll: 3 }] },
    };
    handleScheduleVariableReinforcements(state, action, { scenario: MOCK_SCENARIO });
    expect(state).toEqual(snap);
  });
});

// ─── resolveRandomEvent tests ─────────────────────────────────────────────────

const MOCK_SCENARIO_EVENTS = {
  randomEvents: {
    confederate: {
      _rerollOn: '11 or 12',
      table: [
        { roll: 4, event: 'Brigade Morale', text: 'CSA event text' },
        { roll: '5-6', event: 'Ammo Shortage', text: 'Ammo event text' },
      ],
    },
    union: {
      _rerollOn: '10, 11 or 12',
      table: [{ roll: 7, event: 'Corps Confusion', text: 'Union event text' }],
    },
  },
};

describe('resolveRandomEvent', () => {
  it('returns matching event for exact roll (SM §7.1)', () => {
    const result = resolveRandomEvent(4, 'confederate', MOCK_SCENARIO_EVENTS);
    expect(result?.event).toBe('Brigade Morale');
    expect(result?.roll).toBe(4);
  });

  it('returns matching event for range roll (SM §7.1)', () => {
    const result = resolveRandomEvent(5, 'confederate', MOCK_SCENARIO_EVENTS);
    expect(result?.event).toBe('Ammo Shortage');
  });

  it('returns null when no table entry matches', () => {
    const result = resolveRandomEvent(12, 'confederate', MOCK_SCENARIO_EVENTS);
    expect(result).toBeNull();
  });

  it('returns null when scenario has no randomEvents', () => {
    expect(resolveRandomEvent(7, 'union', {})).toBeNull();
  });

  it('looks up union table for union side (SM §7.2)', () => {
    const result = resolveRandomEvent(7, 'union', MOCK_SCENARIO_EVENTS);
    expect(result?.event).toBe('Corps Confusion');
  });
});

// ─── isRandomEventReroll tests ────────────────────────────────────────────────

describe('isRandomEventReroll', () => {
  it('Confederate rerolls on 11 (SM §7.1)', () => {
    expect(isRandomEventReroll(11, 'confederate')).toBe(true);
  });

  it('Confederate rerolls on 12 (SM §7.1)', () => {
    expect(isRandomEventReroll(12, 'confederate')).toBe(true);
  });

  it('Confederate does not reroll on 10 (SM §7.1)', () => {
    expect(isRandomEventReroll(10, 'confederate')).toBe(false);
  });

  it('Union rerolls on 10 (SM §7.2)', () => {
    expect(isRandomEventReroll(10, 'union')).toBe(true);
  });

  it('Union rerolls on 12 (SM §7.2)', () => {
    expect(isRandomEventReroll(12, 'union')).toBe(true);
  });

  it('Union does not reroll on 9 (SM §7.2)', () => {
    expect(isRandomEventReroll(9, 'union')).toBe(false);
  });
});
