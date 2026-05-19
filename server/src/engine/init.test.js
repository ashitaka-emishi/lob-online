import { describe, it, expect } from 'vitest';

import { initGameState } from './init.js';
import { GameStateSchema } from '../schemas/gameState.schema.js';

// Minimal scenario fixture matching the real scenario.json structure
const SCENARIO = {
  id: 'south-mountain',
  turnStructure: {
    firstTurn: '09:00',
    minutesPerTurn: 20,
    firstPlayer: 'union',
  },
  setup: {
    union: [
      {
        _groupNote: 'Cavalry Division — within 5 hexes of 18.05',
        setupZone: 'within5Of',
        referenceHex: '18.05',
        order: 'none',
        units: ['pleasonton', 'fcav', '8ill'],
      },
    ],
    confederate: [
      // Individual unit at fixed hex
      { unitId: '5va-cav', hex: '19.23', order: 'move' },
      // Leader with no order
      { unitId: 'pelham-a', hex: '22.23', order: null },
      // Group where each unit has its own hex
      {
        _groupNote: 'Colquitt Brigade',
        order: 'move',
        units: [
          { unitId: 'colquitt', hex: '29.22' },
          { unitId: '23ga', hex: '30.21' },
        ],
      },
      // Group with zone constraint (CSA)
      {
        _groupNote: 'Anderson Brigade — within 2 hexes of 38.31',
        setupZone: 'within2Of',
        referenceHex: '38.31',
        order: 'move',
        units: ['gb-anderson', '2nc'],
      },
      // attack order — exercises LOB §10.4a path in mapOrder
      { unitId: 'test-attack', hex: '25.20', order: 'attack' },
      // complexDefense legacy token — LOB_GAME_UPDATES SM section maps to 'move'
      { unitId: 'test-complex', hex: '26.20', order: 'complexDefense' },
      // SM §3.3 — detached brigade; isDetached must propagate to UnitState (#361)
      {
        _groupNote: 'Garland Brigade — DETACHED (SM §3.3)',
        isDetached: true,
        order: 'move',
        units: [
          { unitId: 'garland-test', hex: '28.25' },
          { unitId: '5nc-test', hex: '25.25' },
        ],
      },
    ],
  },
  reinforcements: {
    union: [
      {
        time: '09:00',
        entryHex: '01.09',
        orderType: 'move',
        units: ['cox', 'scammon'],
      },
      {
        time: '11:30',
        entryHex: '15.01',
        orderType: 'move',
        units: ['willcox'],
      },
    ],
    confederate: [
      {
        time: '11:30',
        entryHex: '39.35',
        orderType: 'move',
        units: ['ripley', 'rodes'],
      },
      // Variable reinforcement — queue at first variableTable entry
      {
        variable: true,
        variableTable: [
          { roll: 1, time: '14:30', entryHex: '39.35' },
          { roll: '2-3', time: '15:00', entryHex: '20.34' },
        ],
        orderType: 'move',
        units: ['dr-jones'],
      },
    ],
  },
};

describe('initGameState — structure', () => {
  it('returns an object that validates against GameStateSchema', () => {
    const state = initGameState(SCENARIO, 'game-test-001');
    const result = GameStateSchema.safeParse(state);
    expect(result.success, result.error?.message).toBe(true);
  });

  it('sets id to the provided gameId', () => {
    const state = initGameState(SCENARIO, 'game-abc');
    expect(state.id).toBe('game-abc');
  });

  it('sets scenarioId from scenario.id', () => {
    const state = initGameState(SCENARIO, 'game-abc');
    expect(state.scenarioId).toBe('south-mountain');
  });

  it('initialises at turn 1, phase null (pre-game), status setup', () => {
    const state = initGameState(SCENARIO, 'game-abc');
    expect(state.turn).toBe(1);
    expect(state.phase).toBeNull();
    expect(state.status).toBe('setup');
  });

  it('initialises initiative as null', () => {
    const state = initGameState(SCENARIO, 'game-abc');
    expect(state.initiative).toBeNull();
  });

  it('initialises sides with both tokens null', () => {
    const state = initGameState(SCENARIO, 'game-abc');
    expect(state.sides.union).toBeNull();
    expect(state.sides.confederate).toBeNull();
  });
});

describe('initGameState — CSA fixed-hex placement', () => {
  it('places individual CSA unit at its declared hex (5va-cav → 19.23)', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['5va-cav'].hex).toBe('19.23');
    expect(units['5va-cav'].isOnBoard).toBe(true);
  });

  it('places unit with null order (pelham-a) with orders: null', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['pelham-a'].hex).toBe('22.23');
    expect(units['pelham-a'].orders).toBeNull();
  });

  it('places CSA group units at their per-unit hexes (colquitt, 23ga)', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['colquitt'].hex).toBe('29.22');
    expect(units['23ga'].hex).toBe('30.21');
  });

  it('maps setup order "move" → accepted UnitOrderState with type move', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['5va-cav'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
    expect(units['colquitt'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
  });

  it('maps setup order "attack" → accepted UnitOrderState with type attack (LOB §10.4a)', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['test-attack'].orders).toEqual({
      type: 'attack',
      status: 'accepted',
      deliveryTurnDue: null,
    });
  });

  it('maps legacy "complexDefense" → accepted UnitOrderState with type move (LOB_GAME_UPDATES SM)', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['test-complex'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
  });
});

describe('initGameState — union zone-constraint placement (M4 initial pass: place at referenceHex)', () => {
  it('places union zone-constraint units at the reference hex', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    for (const unitId of ['pleasonton', 'fcav', '8ill']) {
      expect(units[unitId].hex).toBe('18.05');
      expect(units[unitId].isOnBoard).toBe(true);
    }
  });

  it('maps setup order "none" → orders: null for union units', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['pleasonton'].orders).toBeNull();
  });
});

describe('initGameState — CSA zone-constraint placement (M4 initial pass: place at referenceHex)', () => {
  it('places CSA zone-constraint units at the reference hex', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['gb-anderson'].hex).toBe('38.31');
    expect(units['2nc'].hex).toBe('38.31');
  });
});

describe('initGameState — default unit fields', () => {
  it('gives all at-start units normal morale, not wrecked, full ammo, facing 0', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    const atStartIds = ['5va-cav', 'pelham-a', 'colquitt', '23ga', 'pleasonton', 'gb-anderson'];
    for (const id of atStartIds) {
      expect(units[id].moraleState, id).toBe('normal');
      expect(units[id].wrecked, id).toBe(false);
      expect(units[id].ammo, id).toBe('full');
      expect(units[id].facing, id).toBe(0);
      expect(units[id].entryTurn, id).toBeNull();
    }
  });

  it('all at-start units default to isDetached: false', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    const atStartIds = ['5va-cav', 'pelham-a', 'colquitt', '23ga', 'pleasonton', 'gb-anderson'];
    for (const id of atStartIds) {
      expect(units[id].isDetached, id).toBe(false);
    }
  });

  it('all reinforcement units default to isDetached: false', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    for (const id of ['cox', 'willcox', 'ripley', 'dr-jones']) {
      expect(units[id].isDetached, id).toBe(false);
    }
  });

  it('init never produces a delay or none status order (all orders are pre-accepted at setup)', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    for (const u of Object.values(units)) {
      if (u.orders !== null) {
        expect(u.orders.status, u.id).toBe('accepted');
      }
    }
  });
});

describe('initGameState — reinforcement pre-queuing', () => {
  it('queues reinforcement units with correct turn numbers', () => {
    const { reinforcementQueue } = initGameState(SCENARIO, 'g1');
    // 09:00 → turn 1; 11:30 → turn 8
    const coxEntry = reinforcementQueue.find((e) => e.unitId === 'cox');
    expect(coxEntry).toBeDefined();
    expect(coxEntry.turn).toBe(1);
    expect(coxEntry.entryHex).toBe('01.09');

    const willcoxEntry = reinforcementQueue.find((e) => e.unitId === 'willcox');
    expect(willcoxEntry).toBeDefined();
    expect(willcoxEntry.turn).toBe(8);
    expect(willcoxEntry.entryHex).toBe('15.01');
  });

  it('queues CSA fixed reinforcements correctly', () => {
    const { reinforcementQueue } = initGameState(SCENARIO, 'g1');
    const ripleyEntry = reinforcementQueue.find((e) => e.unitId === 'ripley');
    expect(ripleyEntry).toBeDefined();
    expect(ripleyEntry.turn).toBe(8);
    expect(ripleyEntry.entryHex).toBe('39.35');
  });

  it('queues variable reinforcements at earliest variableTable entry', () => {
    const { reinforcementQueue } = initGameState(SCENARIO, 'g1');
    const jonesEntry = reinforcementQueue.find((e) => e.unitId === 'dr-jones');
    expect(jonesEntry).toBeDefined();
    // 14:30 → (14*60+30 - 9*60) / 20 = (870-540)/20 = 330/20 = 16.5 → floor 16 → turn 17
    expect(jonesEntry.turn).toBe(17);
    expect(jonesEntry.entryHex).toBe('39.35');
  });

  it('reinforcement units are not on board', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    for (const unitId of ['cox', 'willcox', 'ripley', 'dr-jones']) {
      expect(units[unitId].isOnBoard, unitId).toBe(false);
      expect(units[unitId].hex, unitId).toBeNull();
    }
  });

  it('reinforcement units have their scheduled entry turn in entryTurn field', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['cox'].entryTurn).toBe(1);
    expect(units['willcox'].entryTurn).toBe(8);
    expect(units['ripley'].entryTurn).toBe(8);
  });
});

// #361 — scenario-start detached brigades must be flagged isDetached:true
describe('initGameState — isDetached propagation from setup entries (#361)', () => {
  it('group entry with isDetached:true produces units with isDetached:true', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['garland-test'].isDetached).toBe(true);
    expect(units['5nc-test'].isDetached).toBe(true);
  });

  it('detached units still receive valid UnitOrderState (schema refine: isDetached requires orders !== null)', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['garland-test'].orders).not.toBeNull();
    expect(units['garland-test'].orders.type).toBe('move');
    expect(units['garland-test'].orders.status).toBe('accepted');
  });

  it('non-detached group entry still produces isDetached:false units', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['colquitt'].isDetached).toBe(false);
    expect(units['23ga'].isDetached).toBe(false);
  });
});

// #360 — reinforcement units must receive the orderType declared in scenario.json
describe('initGameState — reinforcement orderType propagation (#360)', () => {
  it('union reinforcement unit inherits orderType:move as accepted UnitOrderState', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['cox'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
    expect(units['willcox'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
  });

  it('CSA reinforcement unit inherits orderType:move as accepted UnitOrderState', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['ripley'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
  });

  it('variable reinforcement unit inherits orderType:move as accepted UnitOrderState', () => {
    const { units } = initGameState(SCENARIO, 'g1');
    expect(units['dr-jones'].orders).toEqual({
      type: 'move',
      status: 'accepted',
      deliveryTurnDue: null,
    });
  });

  it('reinforcement group with no orderType produces orders:null', () => {
    const scenarioNoOrderType = {
      ...SCENARIO,
      reinforcements: {
        union: [{ time: '09:00', entryHex: '01.09', units: ['test-unit-no-order'] }],
        confederate: [],
      },
    };
    const { units } = initGameState(scenarioNoOrderType, 'g1');
    expect(units['test-unit-no-order'].orders).toBeNull();
  });
});

// #363 — schemaVersion must be present in initGameState output
describe('initGameState — schemaVersion (#363)', () => {
  it('output includes schemaVersion: 1', () => {
    const state = initGameState(SCENARIO, 'g1');
    expect(state.schemaVersion).toBe(1);
  });
});
