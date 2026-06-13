import { describe, it, expect } from 'vitest';

import { ScenarioSchema } from './scenario.schema.js';

const BASE = {
  _status: 'available',
  _source: 'test',
  id: 'south-mountain',
  name: 'South Mountain',
  system: 'Line of Battle v2.0',
  publication: 'RSS #4',
  turnStructure: {
    firstTurn: '09:00',
    lastTurn: '20:00',
    firstPlayer: 'union',
    date: '1862-09-14',
  },
  rules: {},
  movementCosts: {
    movementAllowances: {},
    terrainCosts: {},
    hexsideCosts: {},
    noEffectTerrain: [],
  },
  ammoReserves: { confederate: {}, union: {} },
  setup: { union: [], confederate: [] },
  reinforcements: { union: [], confederate: [] },
  victoryPoints: { terrain: [], wreck: { confederate: {}, union: {} } },
  victoryConditions: { results: [] },
  randomEvents: { confederate: { table: [] }, union: { table: [] } },
};

describe('ScenarioSchema — base document', () => {
  it('accepts a minimal valid document', () => {
    expect(ScenarioSchema.safeParse(BASE).success).toBe(true);
  });

  it('accepts the real scenario.json structure (new fields present)', () => {
    const full = {
      ...BASE,
      lightingSchedule: [
        { startTurn: 1, condition: 'day', visibilityHexes: 999 },
        { startTurn: 28, condition: 'twilight', visibilityHexes: 4 },
        { startTurn: 31, condition: 'night', visibilityHexes: 2 },
      ],
      flukeStoppageGracePeriodTurns: 8,
      initiativeSystem: 'RSS',
      looseCannon: true,
      lossRecovery: { enabled: false, triggerTime: null },
      randomEventsEnabled: true,
      randomEventsTiming: 'commandPhaseAfterOrderAcceptance',
      _savedAt: 1234567890,
    };
    expect(ScenarioSchema.safeParse(full).success).toBe(true);
  });
});

describe('ScenarioSchema — backward compatibility', () => {
  it('accepts documents without any new fields (all optional)', () => {
    const result = ScenarioSchema.safeParse(BASE);
    expect(result.success).toBe(true);
  });

  it('accepts document with _savedAt injected by server', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, _savedAt: Date.now() }).success).toBe(true);
  });

  it('accepts document without totalTurns (now derived, field deprecated #533)', () => {
    const result = ScenarioSchema.safeParse(BASE);
    expect(result.success).toBe(true);
  });

  it('accepts document with totalTurns present (backward compat for scaffold files #533)', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      turnStructure: { ...BASE.turnStructure, totalTurns: 45 },
    });
    expect(result.success).toBe(true);
  });
});

describe('ScenarioSchema — lightingSchedule validation', () => {
  it('accepts valid condition values including fog and rain', () => {
    for (const [condition, visibilityHexes] of [
      ['day', 999],
      ['twilight', 4],
      ['night', 2],
      ['fog', 4],
      ['rain', 4],
    ]) {
      const result = ScenarioSchema.safeParse({
        ...BASE,
        lightingSchedule: [{ startTurn: 1, condition, visibilityHexes }],
      });
      expect(result.success, `condition=${condition}`).toBe(true);
    }
  });

  it('rejects invalid condition value', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 1, condition: 'dusk', visibilityHexes: 4 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive startTurn', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 0, condition: 'day', visibilityHexes: 999 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing visibilityHexes', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 1, condition: 'night' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero visibilityHexes', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 1, condition: 'day', visibilityHexes: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts day with unlimited visibility (999)', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 1, condition: 'day', visibilityHexes: 999 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts night with 2-hex cap', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 31, condition: 'night', visibilityHexes: 2 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('ScenarioSchema — visibilityHexes upper bound (#536)', () => {
  it('accepts values in normal range 1–20', () => {
    for (const v of [1, 2, 4, 10, 20]) {
      const result = ScenarioSchema.safeParse({
        ...BASE,
        lightingSchedule: [{ startTurn: 1, condition: 'twilight', visibilityHexes: v }],
      });
      expect(result.success, `visibilityHexes=${v}`).toBe(true);
    }
  });

  it('accepts 999 (unlimited day sentinel)', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 1, condition: 'day', visibilityHexes: 999 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects values above 20 that are not 999', () => {
    for (const v of [21, 50, 100, 998]) {
      const result = ScenarioSchema.safeParse({
        ...BASE,
        lightingSchedule: [{ startTurn: 1, condition: 'day', visibilityHexes: v }],
      });
      expect(result.success, `visibilityHexes=${v} should be rejected`).toBe(false);
    }
  });
});

describe('ScenarioSchema — startTurn uniqueness in lightingSchedule (#532)', () => {
  it('accepts a schedule with unique startTurn values', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [
        { startTurn: 1, condition: 'day', visibilityHexes: 999 },
        { startTurn: 28, condition: 'twilight', visibilityHexes: 4 },
        { startTurn: 31, condition: 'night', visibilityHexes: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a schedule with duplicate startTurn values', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [
        { startTurn: 1, condition: 'day', visibilityHexes: 999 },
        { startTurn: 1, condition: 'twilight', visibilityHexes: 4 },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.message.includes('Duplicate startTurn 1'))).toBe(true);
  });
});

describe('ScenarioSchema — initiativeSystem validation', () => {
  it('accepts RSS', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, initiativeSystem: 'RSS' }).success).toBe(true);
  });

  it('accepts LoB', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, initiativeSystem: 'LoB' }).success).toBe(true);
  });

  it('rejects unknown system', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, initiativeSystem: 'custom' }).success).toBe(false);
  });
});

describe('ScenarioSchema — lossRecovery validation', () => {
  it('accepts enabled:false with null triggerTime', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lossRecovery: { enabled: false, triggerTime: null },
    });
    expect(result.success).toBe(true);
  });

  it('accepts enabled:true with a time string', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lossRecovery: { enabled: true, triggerTime: '24:00' },
    });
    expect(result.success).toBe(true);
  });
});
