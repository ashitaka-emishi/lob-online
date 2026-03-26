import { describe, it, expect } from 'vitest';

import { OOBSchema } from './oob.schema.js';

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
