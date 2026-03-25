import { describe, it, expect } from 'vitest';

import { OOBSchema } from './oob.schema.js';

const MINIMAL_UNIT = {
  id: 'test-unit',
  name: 'Test Unit',
  type: 'infantry',
  morale: 'B',
  weapon: 'R',
  strengthPoints: 4,
  stragglerBoxes: 9,
};

const MINIMAL_BATTERY = {
  id: 'test-bat',
  name: 'Test Battery',
  gunType: 'R',
  strengthPoints: 4,
  ammoClass: 'B',
};

const MINIMAL_BRIGADE = {
  id: 'test-brig',
  name: 'Test Brigade',
  morale: 'B',
  wreckThreshold: 5,
  wreckTrackTotal: 10,
  regiments: [MINIMAL_UNIT],
};

const MINIMAL_DIVISION = {
  id: 'test-div',
  name: 'Test Division',
  divisionStragglerBoxes: 5,
  divisionWreckThreshold: 10,
  brigades: [MINIMAL_BRIGADE],
};

const MINIMAL_CORPS = {
  id: 'test-corps',
  name: 'Test Corps',
  divisions: [MINIMAL_DIVISION],
};

const MINIMAL_CAVAIRY_DIV = {
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
    cavalryDivision: MINIMAL_CAVAIRY_DIV,
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

describe('OOBSchema — counterRef on InfantryCavalryUnit', () => {
  it('accepts unit without counterRef', () => {
    const result = OOBSchema.safeParse(MINIMAL_OOB);
    expect(result.success).toBe(true);
  });

  it('accepts unit with counterRef null', () => {
    const oob = {
      ...MINIMAL_OOB,
      union: {
        ...MINIMAL_OOB.union,
        corps: [
          {
            ...MINIMAL_CORPS,
            divisions: [
              {
                ...MINIMAL_DIVISION,
                brigades: [
                  {
                    ...MINIMAL_BRIGADE,
                    regiments: [{ ...MINIMAL_UNIT, counterRef: null }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
  });

  it('accepts unit with counterRef object including confidence', () => {
    const oob = {
      ...MINIMAL_OOB,
      union: {
        ...MINIMAL_OOB.union,
        corps: [
          {
            ...MINIMAL_CORPS,
            divisions: [
              {
                ...MINIMAL_DIVISION,
                brigades: [
                  {
                    ...MINIMAL_BRIGADE,
                    regiments: [
                      {
                        ...MINIMAL_UNIT,
                        counterRef: {
                          front: 'CS1-Front_01.jpg',
                          frontConfidence: 0.9,
                          back: 'CS1-Back_01.jpg',
                          backConfidence: 0.85,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
  });

  it('accepts unit with counterRef object having null filenames', () => {
    const oob = {
      ...MINIMAL_OOB,
      union: {
        ...MINIMAL_OOB.union,
        corps: [
          {
            ...MINIMAL_CORPS,
            divisions: [
              {
                ...MINIMAL_DIVISION,
                brigades: [
                  {
                    ...MINIMAL_BRIGADE,
                    regiments: [
                      {
                        ...MINIMAL_UNIT,
                        counterRef: {
                          front: null,
                          frontConfidence: null,
                          back: null,
                          backConfidence: null,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = OOBSchema.safeParse(oob);
    expect(result.success).toBe(true);
  });
});

describe('OOBSchema — counterRef on ArtilleryBattery', () => {
  const oobWithBattery = (batteryOverrides) => ({
    ...MINIMAL_OOB,
    confederate: {
      ...MINIMAL_OOB.confederate,
      reserveArtillery: {
        batteries: [{ ...MINIMAL_BATTERY, ...batteryOverrides }],
      },
    },
  });

  it('accepts battery without counterRef', () => {
    const result = OOBSchema.safeParse(oobWithBattery({}));
    expect(result.success).toBe(true);
  });

  it('accepts battery with counterRef null', () => {
    const result = OOBSchema.safeParse(oobWithBattery({ counterRef: null }));
    expect(result.success).toBe(true);
  });

  it('accepts battery with counterRef object including confidence', () => {
    const result = OOBSchema.safeParse(
      oobWithBattery({
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
});
