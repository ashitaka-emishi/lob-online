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

// OOB stubs for formation-branch tests (H6)
const CAVALRY_OOB = {
  union: {
    corps: [
      {
        divisions: [
          { brigades: [{ regiments: [{ id: 'u1', type: 'cavalry', strengthPoints: 4 }] }] },
        ],
      },
    ],
  },
  confederate: { divisions: [] },
};

const LEADER_OOB = {
  union: {
    corps: [
      {
        divisions: [{ brigades: [{ regiments: [{ id: 'u1', type: 'leader' }] }] }],
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
        activatedUnitIds: ['u1'],
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

  it('second MOVE in same activation succeeds and charges remaining MPs (#680)', () => {
    const initialState = makeState({ remainingMPs: 6 });
    // First MOVE: 10.10 → 10.11 (1 MP for clear hex)
    const afterFirstMove = resolveMove(initialState, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(afterFirstMove.units.u1.hex).toBe('10.11');
    expect(afterFirstMove.units.u1.remainingMPs).toBe(5);
    // activatedUnitIds persists on the spread activation
    expect(afterFirstMove.activityPhase.currentActivation.activatedUnitIds).toContain('u1');
    // Second MOVE: 10.11 → 10.12 (1 MP for clear hex)
    const secondMoveAction = {
      type: 'MOVE',
      payload: { unitId: 'u1', path: ['10.11', '10.12'] },
      playerSide: 'union',
    };
    const afterSecondMove = resolveMove(afterFirstMove, secondMoveAction, {
      scenario,
      mapData: MAP_DATA,
    });
    expect(afterSecondMove.units.u1.hex).toBe('10.12');
    expect(afterSecondMove.units.u1.remainingMPs).toBe(4);
  });

  it('succeeds when path cost exactly equals remainingMPs (boundary: totalCost === remainingMPs)', () => {
    const state = makeState({ remainingMPs: 1 });
    const result = resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(result.units.u1.remainingMPs).toBe(0);
    expect(result.units.u1.hex).toBe('10.11');
  });
});

// ─── resolveMove — INSUFFICIENT_MPS ───────────────────────────────────────────

describe('resolveMove — INSUFFICIENT_MPS', () => {
  it('throws INSUFFICIENT_MPS when unit has 0 remaining MPs', () => {
    expect.assertions(2);
    const state = makeState({ remainingMPs: 0 });
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INSUFFICIENT_MPS');
    }
  });

  it('throws INSUFFICIENT_MPS when unit remainingMPs is undefined (not yet activated)', () => {
    expect.assertions(2);
    const state = makeState({ remainingMPs: undefined });
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INSUFFICIENT_MPS');
    }
  });

  it('throws INSUFFICIENT_MPS when path cost exceeds remainingMPs', () => {
    expect.assertions(2);
    // Unit has 1 MP; 2-hex path costs 2
    const state = makeState({ remainingMPs: 1 });
    const twoHexMove = {
      ...MOVE_ACTION,
      payload: { unitId: 'u1', path: ['10.10', '10.11', '10.12'] },
    };
    try {
      resolveMove(state, twoHexMove, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INSUFFICIENT_MPS');
    }
  });
});

// ─── resolveMove — INVALID_MOVE ───────────────────────────────────────────────

describe('resolveMove — INVALID_MOVE', () => {
  it('throws INVALID_MOVE when destination hex is not in mapData (impassable / not digitized)', () => {
    expect.assertions(2);
    const state = makeState();
    const outOfBoundsMove = {
      ...MOVE_ACTION,
      payload: { unitId: 'u1', path: ['10.10', '99.99'] },
    };
    try {
      resolveMove(state, outOfBoundsMove, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_MOVE');
    }
  });

  it('throws INVALID_MOVE for unlimbered artillery — no movement allowance (LOB §3.6a)', () => {
    expect.assertions(2);
    const state = makeState({ formation: 'unlimbered' });
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_MOVE');
    }
  });
});

// ─── resolveMove — guard errors ───────────────────────────────────────────────

describe('resolveMove — guard errors', () => {
  it('throws INVALID_ACTION when no activation is in progress', () => {
    expect.assertions(2);
    const state = makeState({}, { activityPhase: { activatedUnits: [], currentActivation: null } });
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when unitId not found in state', () => {
    expect.assertions(2);
    const state = makeState();
    const badAction = {
      ...MOVE_ACTION,
      payload: { unitId: 'nonexistent', path: ['10.10', '10.11'] },
    };
    try {
      resolveMove(state, badAction, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_ACTION when unit is not in the activated roster (LOB §3 — #680)', () => {
    expect.assertions(2);
    // u1 present in state but excluded from activatedUnitIds
    const state = makeState(
      {},
      {
        activityPhase: {
          activatedUnits: [],
          currentActivation: {
            hex: '10.10',
            activatedUnitIds: [],
            movedThisActivation: false,
            openingVolley: false,
            zeroRuleFired: false,
          },
        },
      }
    );
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_ACTION');
    }
  });

  it('throws INVALID_PAYLOAD when path does not start at unit hex', () => {
    expect.assertions(2);
    const state = makeState();
    const badPath = { ...MOVE_ACTION, payload: { unitId: 'u1', path: ['10.11', '10.12'] } };
    try {
      resolveMove(state, badPath, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('throws INVALID_PAYLOAD when path is empty or has only one hex', () => {
    expect.assertions(2);
    const state = makeState();
    const badPath = { ...MOVE_ACTION, payload: { unitId: 'u1', path: ['10.10'] } };
    try {
      resolveMove(state, badPath, { scenario, mapData: MAP_DATA });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_PAYLOAD');
    }
  });
});

// ─── resolveMove — formation branches (H6) ────────────────────────────────────

describe('resolveMove — formation branches', () => {
  it('limbered artillery moves normally (limbered formation path)', () => {
    const state = makeState({ formation: 'limbered' });
    const result = resolveMove(state, MOVE_ACTION, { scenario, mapData: MAP_DATA });
    expect(result.units.u1.hex).toBe('10.11');
  });

  it('cavalry unit (OOB type=cavalry) moves using mounted formation', () => {
    const state = makeState();
    const result = resolveMove(state, MOVE_ACTION, {
      scenario,
      mapData: MAP_DATA,
      oob: CAVALRY_OOB,
    });
    expect(result.units.u1.hex).toBe('10.11');
  });

  it('leader unit (OOB type=leader) moves using leader formation', () => {
    const state = makeState();
    const result = resolveMove(state, MOVE_ACTION, {
      scenario,
      mapData: MAP_DATA,
      oob: LEADER_OOB,
    });
    expect(result.units.u1.hex).toBe('10.11');
  });
});

// ─── resolveMove — VP control eligibility (SM §5.1) ───────────────────────────

describe('resolveMove — VP control eligibility', () => {
  it('cavalry moving to VP hex does not claim control (SM §5.1 — cavalry ineligible)', () => {
    const state = makeState();
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
      oob: CAVALRY_OOB,
    });
    expect(result.hexControl['10.11']).toBeUndefined();
  });
});

// ─── resolveMove — path cost (submitted path, not Dijkstra optimal) (#675) ────

describe('resolveMove — path cost charges submitted path (#675)', () => {
  // Routes from 10.10:
  //   dir 0 (N)  → 10.11
  //   dir 1 (NE) → 11.11  (also NE of 10.10, SE of 10.11 — shared neighbor)
  // Two routes to 11.11:
  //   cheap: 10.10 → 11.11           (1 MP, clear)
  //   expensive: 10.10 → 10.11 → 11.11  (2 + 1 = 3 MPs if 10.11 is woods)

  it('charges the submitted path cost even when Dijkstra optimal is cheaper (LOB §3 fix #675)', () => {
    const hexIndexWithWoods = new Map([
      ['10.10', { hex: '10.10', terrain: 'clear' }],
      ['10.11', { hex: '10.11', terrain: 'woods' }], // woods: 2 MP for line
      ['11.11', { hex: '11.11', terrain: 'clear' }], // NE of 10.10, SE of 10.11
    ]);
    const mapData = { gridSpec: SM_GRID, hexes: [] };
    const state = makeState(
      { remainingMPs: 6 },
      {
        activityPhase: {
          activatedUnits: [],
          currentActivation: {
            hex: '10.10',
            activatedUnitIds: ['u1'],
            movedThisActivation: false,
            openingVolley: false,
            zeroRuleFired: false,
          },
        },
      }
    );
    const woodsPathAction = {
      type: 'MOVE',
      payload: { unitId: 'u1', path: ['10.10', '10.11', '11.11'] },
      playerSide: 'union',
    };
    // Submitted path: 10.10 → 10.11(woods, 2 MP) → 11.11(clear, 1 MP) = 3 MPs charged
    const result = resolveMove(state, woodsPathAction, {
      scenario,
      mapData,
      hexIndex: hexIndexWithWoods,
    });
    expect(result.units.u1.hex).toBe('11.11');
    expect(result.units.u1.remainingMPs).toBe(3); // 6 − 3 = 3
  });

  it('throws INVALID_MOVE when submitted path crosses an impassable hexside (LOB §3)', () => {
    expect.assertions(2);
    // verticalSlope on face 0 (N) of 10.10 makes 10.10→10.11 impassable (SM §1.1)
    const hexIndexWithSlope = new Map([
      ['10.10', { hex: '10.10', terrain: 'clear', edges: { 0: [{ type: 'verticalSlope' }] } }],
      ['10.11', { hex: '10.11', terrain: 'clear' }],
    ]);
    const mapData = { gridSpec: SM_GRID, hexes: [] };
    const state = makeState({ remainingMPs: 6 });
    try {
      resolveMove(state, MOVE_ACTION, { scenario, mapData, hexIndex: hexIndexWithSlope });
    } catch (e) {
      expect(e).toBeInstanceOf(ActionError);
      expect(e.code).toBe('INVALID_MOVE');
    }
  });
});
