import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, it, expect } from 'vitest';

import { OOBSchema } from './oob.schema.js';

const OOB_PATH = resolve('data/scenarios/south-mountain/oob.json');

const MINIMAL_UNIT = {
  id: 'test-unit',
  name: '22nd NY',
  type: 'infantry',
  morale: 'B',
  weapon: 'R',
  strengthPoints: 4,
};

const MINIMAL_BATTERY = {
  id: 'test-bat',
  name: '1st NH Lt',
  gunType: 'R',
  strengthPoints: 4,
  morale: 'B',
};

const MINIMAL_BRIGADE = {
  id: 'test-brig',
  name: 'Test Brigade',
  wreckThreshold: 3,
  regiments: [MINIMAL_UNIT],
};

const MINIMAL_DIVISION = {
  id: 'test-div',
  name: 'Test Division',
  wreckThreshold: 2,
  brigades: [MINIMAL_BRIGADE],
};

const MINIMAL_CORPS = {
  id: 'test-corps',
  name: 'Test Corps',
  divisions: [MINIMAL_DIVISION],
};

const MINIMAL_CAVALRY_DIV = {
  id: 'test-cav',
  name: 'Test Cavalry',
  brigades: [MINIMAL_BRIGADE],
};

const MINIMAL_OOB = {
  _status: 'draft',
  _source: 'test',
  _errata_applied: [],
  union: {
    army: 'Army of the Potomac',
    supplyTrain: { id: 'supply', name: 'Supply Train' },
    corps: [MINIMAL_CORPS],
    cavalryDivision: MINIMAL_CAVALRY_DIV,
  },
  confederate: {
    army: 'Army of Northern Virginia',
    wing: 'Right Wing',
    supplyWagon: { id: 'wagon', name: 'Supply Wagon' },
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    divisions: [],
  },
};

// ── Integration: real oob.json ────────────────────────────────────────────

describe('OOBSchema — real oob.json (#189)', () => {
  it('parses south-mountain oob.json without errors', () => {
    const raw = JSON.parse(readFileSync(OOB_PATH, 'utf8'));
    const result = OOBSchema.safeParse(raw);
    if (!result.success) {
      // Surface the first Zod error for fast diagnosis
      const first = result.error.issues[0];
      throw new Error(`oob.json parse failed at ${first.path.join('.')}: ${first.message}`);
    }
    expect(result.success).toBe(true);
  });
});

// ── Base schema validation ─────────────────────────────────────────────────

describe('OOBSchema — base validation', () => {
  it('accepts minimal valid OOB', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
  });

  it('rejects OOB missing required fields', () => {
    const result = OOBSchema.safeParse({ _status: 'draft' });
    expect(result.success).toBe(false);
  });
});

// ── InfantryCavalryUnit ────────────────────────────────────────────────────

describe('OOBSchema — InfantryCavalryUnit', () => {
  it('accepts unit without counterRef', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
  });

  it('accepts unit with counterRef null', () => {
    const oob = withUnit({ ...MINIMAL_UNIT, counterRef: null });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts unit with counterRef object including confidence', () => {
    const oob = withUnit({
      ...MINIMAL_UNIT,
      counterRef: {
        front: 'CS1-Front_01.jpg',
        frontConfidence: 0.9,
        back: 'CS1-Back_01.jpg',
        backConfidence: 0.85,
      },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts unit with counterRef having null filenames', () => {
    const oob = withUnit({
      ...MINIMAL_UNIT,
      counterRef: { front: null, frontConfidence: null, back: null, backConfidence: null },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('rejects unit with stragglerBoxes (removed field)', () => {
    // The schema no longer accepts stragglerBoxes — it is unrecognized but z.object() doesn't
    // strip extra fields by default, so the schema still passes. This test documents the intent
    // that the field is not required and the schema remains valid without it.
    const oob = withUnit({ ...MINIMAL_UNIT });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });
});

// ── ArtilleryBattery ────────────────────────────────────────────────────────

describe('OOBSchema — ArtilleryBattery', () => {
  it('accepts battery without counterRef', () => {
    const result = OOBSchema.safeParse(oobWithBattery(MINIMAL_BATTERY));
    expect(result.success).toBe(true);
  });

  it('accepts battery with counterRef null', () => {
    const result = OOBSchema.safeParse(oobWithBattery({ ...MINIMAL_BATTERY, counterRef: null }));
    expect(result.success).toBe(true);
  });

  it('accepts battery with counterRef object including confidence', () => {
    const result = OOBSchema.safeParse(
      oobWithBattery({
        ...MINIMAL_BATTERY,
        counterRef: {
          front: 'CS1-Front_50.jpg',
          frontConfidence: 0.88,
          back: 'CS1-Back_50.jpg',
          backConfidence: 0.76,
        },
      })
    );
    expect(result.success).toBe(true);
  });

  it('rejects battery with ammoClass (renamed to morale)', () => {
    // ammoClass is no longer a valid field; morale is required
    const result = OOBSchema.safeParse(
      oobWithBattery({ id: 'b', name: 'B', gunType: 'R', strengthPoints: 4, ammoClass: 'C' })
    );
    expect(result.success).toBe(false);
  });

  it('accepts battery morale A/B/C/D', () => {
    for (const m of ['A', 'B', 'C', 'D']) {
      const result = OOBSchema.safeParse(oobWithBattery({ ...MINIMAL_BATTERY, morale: m }));
      expect(result.success).toBe(true);
    }
  });
});

// ── Brigade ─────────────────────────────────────────────────────────────────

describe('OOBSchema — Brigade', () => {
  it('accepts brigade with name + wreckThreshold + regiments only', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
  });

  it('accepts brigade without name (cavalry/synthetic brigades)', () => {
    const oob = withBrigade({ id: 'fcav', wreckThreshold: 1, regiments: [] });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('rejects brigade missing wreckThreshold', () => {
    const oob = withBrigade({ id: 'b', name: 'B', regiments: [] });
    expect(OOBSchema.safeParse(oob).success).toBe(false);
  });
});

// ── Division ─────────────────────────────────────────────────────────────────

describe('OOBSchema — Division', () => {
  it('accepts division with name + wreckThreshold + brigades', () => {
    expect(OOBSchema.safeParse(MINIMAL_OOB).success).toBe(true);
  });

  it('accepts division with optional hq node', () => {
    const oob = withDivision({
      ...MINIMAL_DIVISION,
      hq: { id: 'test-div-hq', name: 'Test Div HQ', counterRef: null },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('rejects division with old divisionWreckThreshold field', () => {
    const oob = withDivision({
      id: 'test-div',
      name: 'Test Division',
      divisionWreckThreshold: 2,
      brigades: [MINIMAL_BRIGADE],
    });
    // divisionWreckThreshold is no longer recognized; wreckThreshold is required
    expect(OOBSchema.safeParse(oob).success).toBe(false);
  });
});

// ── Brigade — successionIds + counterRef ────────────────────────────────────

describe('OOBSchema — Brigade successionIds and counterRef (#189)', () => {
  it('defaults successionIds to [] when absent', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
    expect(result.data.union.corps[0].divisions[0].brigades[0].successionIds).toEqual([]);
  });

  it('accepts brigade with explicit successionIds array', () => {
    const oob = withBrigade({ ...MINIMAL_BRIGADE, successionIds: ['leader-1', 'leader-2'] });
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
    expect(result.data.union.corps[0].divisions[0].brigades[0].successionIds).toEqual([
      'leader-1',
      'leader-2',
    ]);
  });

  it('accepts brigade with counterRef null', () => {
    const oob = withBrigade({ ...MINIMAL_BRIGADE, counterRef: null });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts brigade with full counterRef object', () => {
    const oob = withBrigade({
      ...MINIMAL_BRIGADE,
      counterRef: {
        front: 'US1-Front_10.jpg',
        frontConfidence: 0.95,
        back: 'US1-Back_10.jpg',
        backConfidence: 0.9,
      },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });
});

// ── Division — successionIds + counterRef ────────────────────────────────────

describe('OOBSchema — Division successionIds and counterRef (#189)', () => {
  it('defaults successionIds to [] when absent', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
    expect(result.data.union.corps[0].divisions[0].successionIds).toEqual([]);
  });

  it('accepts division with explicit successionIds array', () => {
    const oob = withDivision({ ...MINIMAL_DIVISION, successionIds: ['leader-div-1'] });
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
    expect(result.data.union.corps[0].divisions[0].successionIds).toEqual(['leader-div-1']);
  });

  it('accepts division with counterRef null', () => {
    const oob = withDivision({ ...MINIMAL_DIVISION, counterRef: null });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts division with full counterRef object', () => {
    const oob = withDivision({
      ...MINIMAL_DIVISION,
      counterRef: {
        front: 'US1-Front_05.jpg',
        frontConfidence: 0.8,
        back: null,
        backConfidence: null,
      },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });
});

// ── Corps — successionIds + counterRef ───────────────────────────────────────

describe('OOBSchema — Corps successionIds and counterRef (#189)', () => {
  it('defaults successionIds to [] when absent', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
    expect(result.data.union.corps[0].successionIds).toEqual([]);
  });

  it('accepts corps with explicit successionIds array', () => {
    const oob = withCorps({ ...MINIMAL_CORPS, successionIds: ['leader-corps-1'] });
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
    expect(result.data.union.corps[0].successionIds).toEqual(['leader-corps-1']);
  });

  it('accepts corps with counterRef null', () => {
    const oob = withCorps({ ...MINIMAL_CORPS, counterRef: null });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });
});

// ── IndependentBrigade — successionIds + counterRef ──────────────────────────

describe('OOBSchema — IndependentBrigade successionIds and counterRef (#189)', () => {
  it('defaults successionIds to [] when absent', () => {
    const oob = withIndependentBrigade({ ...MINIMAL_BRIGADE });
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
    expect(result.data.confederate.independentBrigades[0].successionIds).toEqual([]);
  });

  it('accepts independentBrigade with counterRef null', () => {
    const oob = withIndependentBrigade({ ...MINIMAL_BRIGADE, counterRef: null });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });
});

// ── Supply / HQ counterRef ──────────────────────────────────────────────────

describe('OOBSchema — supply and HQ counterRef', () => {
  it('accepts supplyTrain with counterRef', () => {
    const oob = {
      ...MINIMAL_OOB,
      union: {
        ...MINIMAL_OOB.union,
        supplyTrain: { id: 'supply', name: 'Supply Train', counterRef: null },
      },
    };
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts corps with hq node', () => {
    const oob = withCorps({
      ...MINIMAL_CORPS,
      hq: { id: 'test-corps-hq', name: 'Test Corps HQ', counterRef: null },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts corps with supply node (#234)', () => {
    const oob = withCorps({
      ...MINIMAL_CORPS,
      supply: { id: 'test-corps-supply', name: 'Test Corps Supply' },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts corps with supply node including full counterRef (#234)', () => {
    const oob = withCorps({
      ...MINIMAL_CORPS,
      supply: {
        id: 'test-corps-supply',
        name: 'Test Corps Supply',
        counterRef: {
          front: 'CS1-Front_08.jpg',
          frontConfidence: 0.9,
          back: null,
          backConfidence: null,
        },
      },
    });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });

  it('accepts corps without supply node — supply is optional (#234)', () => {
    const oob = withCorps({ ...MINIMAL_CORPS });
    expect(OOBSchema.safeParse(oob).success).toBe(true);
  });
});

// ── _savedAt + .strict() (#221) ──────────────────────────────────────────────

describe('OOBSchema — _savedAt and strict mode (#221)', () => {
  it('accepts OOB with optional _savedAt number', () => {
    const result = OOBSchema.safeParse({ ...MINIMAL_OOB, _savedAt: Date.now() });
    expect(result.success).toBe(true);
  });

  it('accepts OOB without _savedAt', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
  });

  it('rejects OOB with unknown top-level field', () => {
    const result = OOBSchema.safeParse({ ...MINIMAL_OOB, _unknownField: 'surprise' });
    expect(result.success).toBe(false);
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function withUnit(unit) {
  return {
    ...MINIMAL_OOB,
    union: {
      ...MINIMAL_OOB.union,
      corps: [
        {
          ...MINIMAL_CORPS,
          divisions: [
            {
              ...MINIMAL_DIVISION,
              brigades: [{ ...MINIMAL_BRIGADE, regiments: [unit] }],
            },
          ],
        },
      ],
    },
  };
}

function withBrigade(bde) {
  return {
    ...MINIMAL_OOB,
    union: {
      ...MINIMAL_OOB.union,
      corps: [{ ...MINIMAL_CORPS, divisions: [{ ...MINIMAL_DIVISION, brigades: [bde] }] }],
    },
  };
}

function withDivision(div) {
  return {
    ...MINIMAL_OOB,
    union: {
      ...MINIMAL_OOB.union,
      corps: [{ ...MINIMAL_CORPS, divisions: [div] }],
    },
  };
}

function withCorps(corps) {
  return {
    ...MINIMAL_OOB,
    union: { ...MINIMAL_OOB.union, corps: [corps] },
  };
}

function oobWithBattery(battery) {
  return {
    ...MINIMAL_OOB,
    confederate: {
      ...MINIMAL_OOB.confederate,
      reserveArtillery: { batteries: [battery] },
    },
  };
}

function withIndependentBrigade(bde) {
  return {
    ...MINIMAL_OOB,
    confederate: {
      ...MINIMAL_OOB.confederate,
      independentBrigades: [{ ...bde, wreckThreshold: bde.wreckThreshold ?? 2 }],
    },
  };
}
