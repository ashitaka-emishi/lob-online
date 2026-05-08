import { describe, it, expect } from 'vitest';

import {
  GameStateSchema,
  UnitStateSchema,
  MoraleState,
  OrderType,
  UnitOrderState,
  AmmoState,
} from './gameState.schema.js';

const BASE_UNIT = {
  id: 'test-unit',
  hex: '19.23',
  facing: 0,
  moraleState: 'normal',
  wrecked: false,
  orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
  ammo: 'full',
  isOnBoard: true,
  entryTurn: null,
  isDetached: false,
};

const BASE_GAME_STATE = {
  id: 'game-abc123',
  scenarioId: 'south-mountain',
  version: 0,
  turn: 1,
  phase: null,
  initiative: null,
  sides: { union: 'token-union-abc', confederate: null },
  units: { 'test-unit': BASE_UNIT },
  reinforcementQueue: [],
  status: 'setup',
};

describe('UnitStateSchema', () => {
  it('accepts a valid unit state', () => {
    expect(UnitStateSchema.safeParse(BASE_UNIT).success).toBe(true);
  });

  it('accepts a unit not on board (hex null, entryTurn set)', () => {
    const unit = { ...BASE_UNIT, hex: null, isOnBoard: false, entryTurn: 3 };
    expect(UnitStateSchema.safeParse(unit).success).toBe(true);
  });

  it('accepts orders: null (non-order-holding unit — inherits from parent division)', () => {
    const unit = { ...BASE_UNIT, orders: null };
    expect(UnitStateSchema.safeParse(unit).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = BASE_UNIT;
    expect(UnitStateSchema.safeParse(noId).success).toBe(false);
  });

  it('rejects facing out of range (0–5)', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, facing: 6 }).success).toBe(false);
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, facing: -1 }).success).toBe(false);
  });

  it('rejects invalid hex format', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, hex: 'bad' }).success).toBe(false);
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, hex: '19-23' }).success).toBe(false);
  });

  it('rejects invalid moraleState', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, moraleState: 'wrecked' }).success).toBe(false);
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, moraleState: 'disrupted' }).success).toBe(
      false
    );
  });

  it('rejects orders as a raw string (must be UnitOrderState object or null)', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, orders: 'move' }).success).toBe(false);
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, orders: 'complexDefense' }).success).toBe(
      false
    );
  });

  it('rejects invalid ammo value', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, ammo: 'depleted' }).success).toBe(false);
  });

  it('accepts isDetached: true (detached brigade)', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, isDetached: true }).success).toBe(true);
  });

  it('rejects missing isDetached field', () => {
    const { isDetached: _d, ...noDetached } = BASE_UNIT;
    expect(UnitStateSchema.safeParse(noDetached).success).toBe(false);
  });

  it('rejects non-boolean isDetached', () => {
    expect(UnitStateSchema.safeParse({ ...BASE_UNIT, isDetached: 'true' }).success).toBe(false);
  });
});

describe('MoraleState enum exhaustiveness', () => {
  const validStates = ['normal', 'bloodLust', 'shaken', 'DG', 'routed'];
  for (const state of validStates) {
    it(`accepts moraleState: '${state}'`, () => {
      expect(MoraleState.safeParse(state).success).toBe(true);
    });
  }

  it('rejects wrecked as a morale state (LOB §5.7 — wrecked is a separate boolean)', () => {
    expect(MoraleState.safeParse('wrecked').success).toBe(false);
  });
});

describe('AmmoState enum exhaustiveness', () => {
  const validStates = ['full', 'low', 'none'];
  for (const state of validStates) {
    it(`accepts ammo: '${state}'`, () => {
      expect(AmmoState.safeParse(state).success).toBe(true);
    });
  }
});

describe('OrderType enum', () => {
  it('accepts attack and move', () => {
    expect(OrderType.safeParse('attack').success).toBe(true);
    expect(OrderType.safeParse('move').success).toBe(true);
  });

  it('accepts null (no current order in pipeline — LOB §10.4a–b)', () => {
    expect(OrderType.safeParse(null).success).toBe(true);
  });

  it('rejects complexDefense (not a LOB v2.0 order type)', () => {
    expect(OrderType.safeParse('complexDefense').success).toBe(false);
  });
});

describe('UnitOrderState', () => {
  it('accepts an accepted order with no delivery turn', () => {
    expect(
      UnitOrderState.safeParse({ type: 'attack', status: 'accepted', deliveryTurnDue: null })
        .success
    ).toBe(true);
  });

  it('accepts a delayed order with a delivery turn set', () => {
    expect(
      UnitOrderState.safeParse({ type: 'move', status: 'delay', deliveryTurnDue: 3 }).success
    ).toBe(true);
  });

  it('accepts no-order state (type null, status none, deliveryTurnDue null)', () => {
    expect(
      UnitOrderState.safeParse({ type: null, status: 'none', deliveryTurnDue: null }).success
    ).toBe(true);
  });

  it('rejects delay status without a deliveryTurnDue (LOB §10.6a)', () => {
    expect(
      UnitOrderState.safeParse({ type: 'attack', status: 'delay', deliveryTurnDue: null }).success
    ).toBe(false);
  });

  it('rejects none status with a non-null type', () => {
    expect(
      UnitOrderState.safeParse({ type: 'move', status: 'none', deliveryTurnDue: null }).success
    ).toBe(false);
  });

  it('rejects accepted status with a non-null deliveryTurnDue (LOB §10.6a)', () => {
    expect(
      UnitOrderState.safeParse({ type: 'move', status: 'accepted', deliveryTurnDue: 5 }).success
    ).toBe(false);
  });

  it('rejects accepted status with a null type (LOB §10.4a–b)', () => {
    expect(
      UnitOrderState.safeParse({ type: null, status: 'accepted', deliveryTurnDue: null }).success
    ).toBe(false);
  });

  it('rejects delay status with a null type (LOB §10.4a–b)', () => {
    expect(
      UnitOrderState.safeParse({ type: null, status: 'delay', deliveryTurnDue: 3 }).success
    ).toBe(false);
  });

  it('rejects none status with a non-null deliveryTurnDue', () => {
    expect(
      UnitOrderState.safeParse({ type: null, status: 'none', deliveryTurnDue: 2 }).success
    ).toBe(false);
  });
});

describe('GameStateSchema', () => {
  it('accepts a valid full game state', () => {
    const state = {
      ...BASE_GAME_STATE,
      units: {
        'test-unit': BASE_UNIT,
        'offboard-unit': {
          ...BASE_UNIT,
          id: 'offboard-unit',
          hex: null,
          isOnBoard: false,
          entryTurn: 5,
        },
      },
      reinforcementQueue: [{ unitId: 'offboard-unit', turn: 5, entryHex: '01.09' }],
    };
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it('accepts active status with initiative set', () => {
    const state = { ...BASE_GAME_STATE, status: 'active', phase: 'movement', initiative: 'union' };
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it('accepts complete status with a non-null phase', () => {
    const state = { ...BASE_GAME_STATE, status: 'complete', phase: 'recovery', turn: 45 };
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = BASE_GAME_STATE;
    expect(GameStateSchema.safeParse(noId).success).toBe(false);
  });

  it('requires a version field (integer ≥ 0) for optimistic concurrency (#332)', () => {
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, version: 0 }).success).toBe(true);
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, version: 7 }).success).toBe(true);
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, version: -1 }).success).toBe(false);
    const { version: _v, ...noVersion } = BASE_GAME_STATE;
    expect(GameStateSchema.safeParse(noVersion).success).toBe(false);
  });

  it('rejects invalid phase', () => {
    expect(
      GameStateSchema.safeParse({ ...BASE_GAME_STATE, phase: 'combat_resolution' }).success
    ).toBe(false);
  });

  it("rejects phase: 'setup' — setup is a status value, not a phase (#333)", () => {
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, phase: 'setup' }).success).toBe(false);
  });

  it('rejects phase: null when status is active — cross-field constraint (#ARCH-M1)', () => {
    expect(
      GameStateSchema.safeParse({ ...BASE_GAME_STATE, status: 'active', phase: null }).success
    ).toBe(false);
  });

  it('rejects non-null phase when status is setup — cross-field constraint (#ARCH-M1)', () => {
    expect(
      GameStateSchema.safeParse({ ...BASE_GAME_STATE, status: 'setup', phase: 'initiative' })
        .success
    ).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, status: 'pending' }).success).toBe(
      false
    );
  });

  it('rejects invalid initiative value', () => {
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, initiative: 'neutral' }).success).toBe(
      false
    );
  });

  it('rejects turn < 1', () => {
    expect(GameStateSchema.safeParse({ ...BASE_GAME_STATE, turn: 0 }).success).toBe(false);
  });

  it('rejects invalid reinforcement entry hex format', () => {
    const state = {
      ...BASE_GAME_STATE,
      reinforcementQueue: [{ unitId: 'foo', turn: 3, entryHex: 'bad-hex' }],
    };
    expect(GameStateSchema.safeParse(state).success).toBe(false);
  });
});
