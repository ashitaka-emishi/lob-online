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
    totalTurns: 45,
    minutesPerTurn: 20,
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
        { startTurn: 1, condition: 'day' },
        { startTurn: 28, condition: 'twilight' },
        { startTurn: 31, condition: 'night' },
      ],
      nightVisibilityCap: 2,
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
});

describe('ScenarioSchema — lightingSchedule validation', () => {
  it('accepts valid condition values', () => {
    for (const condition of ['day', 'twilight', 'night']) {
      const result = ScenarioSchema.safeParse({
        ...BASE,
        lightingSchedule: [{ startTurn: 1, condition }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid condition value', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 1, condition: 'dusk' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive startTurn', () => {
    const result = ScenarioSchema.safeParse({
      ...BASE,
      lightingSchedule: [{ startTurn: 0, condition: 'day' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('ScenarioSchema — nightVisibilityCap validation', () => {
  it('accepts positive integer', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, nightVisibilityCap: 2 }).success).toBe(true);
  });

  it('rejects zero', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, nightVisibilityCap: 0 }).success).toBe(false);
  });

  it('rejects negative', () => {
    expect(ScenarioSchema.safeParse({ ...BASE, nightVisibilityCap: -1 }).success).toBe(false);
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
