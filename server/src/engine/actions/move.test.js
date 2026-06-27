import { describe, it, expect, beforeAll } from 'vitest';

import { resolveMove } from './move.js';
import { ActionError } from './actionError.js';
import { loadScenario } from '../scenario.js';

// ─── Shared fixtures ───────────────────────────────────────────────────────────

// Minimal OOB stub so findOobUnit('u1') returns an infantry unit entry.
// isVpControlEligible requires a non-null oobUnit with type='infantry' to grant VP control.
const MINIMAL_OOB = {
  union: {
    corps: [
      {
        divisions: [
          {
            brigades: [{ regiments: [{ id: 'u1', type: 'infantry', strengthPoints: 10 }] }],
          },
        ],
      },
    ],
  },
  confederate: { divisions: [] },
};

let scenario;
beforeAll(() => {
  scenario = loadScenario();
});

/** Minimal flat-top SM grid spec — matches map.json */
const SM_GRID = {
  cols: 64,
  rows: 35,
  dx: 39.75,
  dy: 36,
  hexWidth: 40.5,
  hexHeight: 40.7,
  imageScale: 1,
  strokeWidth: 2,
  orientation: 'flat',
  evenColUp: true,
};

// Three adjacent clear hexes in column 10: 10.10 → 10.11 → 10.12 (northward)
const THREE_HEXES = [
  { hex: '10.10', terrain: 'clear' },
  { hex: '10.11', terrain: 'clear' },
  { hex: '10.12', terrain: 'clear' },
];
const MAP_DATA = { gridSpec: SM_GRID, hexes: THREE_HEXES };

function makeUnit(overrides = {}) {
  return {
    id: 'u1',
    hex: '10.10',
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
    remainingMPs: 6,
    ...overrides,
  };
}

function makeState(unitOverrides = {}, stateOverrides = {}) {
  return {
    phase: 'activity',
    step: 'activation',
    hexControl: {},
    units: { u1: makeUnit(unitOverrides) },
    activityPhase: {
      activatedUnits: [],
      currentActivation: {
        hex: '10.10',
        movedThisActivation: false,
        openingVolley: false,
        zeroRuleFired: false,
      },
    },
    ...stateOverrides,
  };
}

const MOVE_ACTION = {
  type: 'MOVE',
  payload: { unitId: 'u1', path: ['10.10', '10.11'] },
  playerSide: 'union',
};

// ─── resolveMove — valid move ──────────────────────────────────────────────────

describe('resolveMove — valid move', () => {
  it('reduces remainingMPs by path cost (1 clear hex = 1 MP)', () => {
    const state = makeState();
    const result = resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(result.units.u1.remainingMPs).toBe(5);
  });

  it('updates unit hex to destination', () => {
    const state = makeState();
    const result = resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(result.units.u1.hex).toBe('10.11');
  });

  it('sets movedThisActivation to true on currentActivation (LOB §5.4)', () => {
    const state = makeState();
    const result = resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(result.activityPhase.currentActivation.movedThisActivation).toBe(true);
  });

  it('multi-hex path: cost 2, remainingMPs reduced from 6 to 4', () => {
    const state = makeState();
    const twoHexMove = {
      ...MOVE_ACTION,
      payload: { unitId: 'u1', path: ['10.10', '10.11', '10.12'] },
    };
    const result = resolveMove(state, twoHexMove, { scenario, mapData: MAP_DATA });
    expect(result.units.u1.remainingMPs).toBe(4);
    expect(result.units.u1.hex).toBe('10.12');
  });

  it('updates hexControl when destination is a VP hex (SM §5.1)', () => {
    const state = makeState();
    // Override scenario to make 10.11 a VP hex; supply OOB so unit is recognized as infantry
    const vpScenario = {
      ...scenario,
      victoryPoints: {
        ...scenario.victoryPoints,
        terrain: [{ hex: '10.11', unionVP: 2, confederateVP: 0 }],
      },
    };
    const result = resolveMove(state, MOVE_ACTION, {
      scenario: vpScenario,
      mapData: MAP_DATA,
      oob: MINIMAL_OOB,
    });
    expect(result.hexControl['10.11']).toBe('union');
  });

  it('leaves hexControl unchanged when destination is not a VP hex', () => {
    const state = makeState();
    const result = resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(result.hexControl).toEqual({});
  });

  it('does not mutate input state', () => {
    const state = makeState();
    const snapshot = JSON.parse(JSON.stringify(state));
    resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(state).toEqual(snapshot);
  });
});

// ─── resolveMove — INSUFFICIENT_MPs ───────────────────────────────────────────

describe('resolveMove — INSUFFICIENT_MPs', () => {
  it('throws when unit has 0 remaining MPs', () => {
    const state = makeState({ remainingMPs: 0 });
    expect(() => resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INSUFFICIENT_MPs');
    }
  });

  it('throws when unit remainingMPs is undefined (not yet activated)', () => {
    const state = makeState({ remainingMPs: undefined });
    expect(() => resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INSUFFICIENT_MPs');
    }
  });

  it('throws when path cost exceeds remainingMPs', () => {
    // Unit has 1 MP; 2-hex path costs 2
    const state = makeState({ remainingMPs: 1 });
    const twoHexMove = {
      ...MOVE_ACTION,
      payload: { unitId: 'u1', path: ['10.10', '10.11', '10.12'] },
    };
    expect(() => resolveMove(state, twoHexMove, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, twoHexMove, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INSUFFICIENT_MPs');
    }
  });
});

// ─── resolveMove — INVALID_MOVE ───────────────────────────────────────────────

describe('resolveMove — INVALID_MOVE', () => {
  it('throws when destination hex is not in mapData (impassable / not digitized)', () => {
    const state = makeState();
    const outOfBoundsMove = {
      ...MOVE_ACTION,
      payload: { unitId: 'u1', path: ['10.10', '99.99'] },
    };
    expect(() => resolveMove(state, outOfBoundsMove, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, outOfBoundsMove, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INVALID_MOVE');
    }
  });
});

// ─── resolveMove — guard errors ───────────────────────────────────────────────

describe('resolveMove — guard errors', () => {
  it('throws INVALID_ACTION when no activation is in progress', () => {
    const state = makeState({}, { activityPhase: { activatedUnits: [], currentActivation: null } });
    expect(() => resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when unitId not found in state', () => {
    const state = makeState();
    const badAction = {
      ...MOVE_ACTION,
      payload: { unitId: 'nonexistent', path: ['10.10', '10.11'] },
    };
    expect(() => resolveMove(state, badAction, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, badAction, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_ACTION when unit is not in the active stack hex', () => {
    // Unit is at 10.12 but activation hex is 10.10
    const state = makeState({ hex: '10.12' });
    expect(() => resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA })).toThrow(
      ActionError
    );
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when path does not start at unit hex', () => {
    const state = makeState();
    const badPath = { ...MOVE_ACTION, payload: { unitId: 'u1', path: ['10.11', '10.12'] } };
    expect(() => resolveMove(state, badPath, { scenario, mapData: MAP_DATA })).toThrow(ActionError);
    try {
      resolveMove(state, badPath, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when path is empty or has only one hex', () => {
    const state = makeState();
    const badPath = { ...MOVE_ACTION, payload: { unitId: 'u1', path: ['10.10'] } };
    expect(() => resolveMove(state, badPath, { scenario, mapData: MAP_DATA })).toThrow(ActionError);
    try {
      resolveMove(state, badPath, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });
});
