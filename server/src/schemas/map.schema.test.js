import { describe, it, expect } from 'vitest';

import { MapSchema } from './map.schema.js';

const MINIMAL_VALID = {
  _status: 'draft',
  scenario: 'south-mountain',
  layout: 'pointy-top',
  vpHexes: [],
  hexes: [],
};

describe('MapSchema — HexId validation', () => {
  it('accepts valid hex id "06.10"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '06.10', terrain: 'clear' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid hex id "19.23"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '19.23', terrain: 'woods' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects hex id "invalid"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: 'invalid', terrain: 'clear' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects hex id "ab.cd"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: 'ab.cd', terrain: 'clear' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects hex id "1.2.3"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '1.2.3', terrain: 'clear' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('MapSchema — valid documents', () => {
  it('accepts minimal required fields', () => {
    const result = MapSchema.safeParse(MINIMAL_VALID);
    expect(result.success).toBe(true);
  });

  it('accepts full gridSpec', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: {
        cols: 64,
        rows: 35,
        dx: 100,
        dy: 50,
        hexWidth: 35,
        hexHeight: 35,
        imageScale: 1,
        strokeWidth: 0.5,
        orientation: 'flat',
        evenColUp: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts hex with all optional fields', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [
        {
          hex: '05.10',
          terrain: 'woods',
          elevation: 2,
          hexFeature: { type: 'building' },
          vpHex: true,
          entryHex: false,
          side: 'union',
          setupUnits: ['1/A/1'],
          _note: 'test',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts vpHex entries', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      vpHexes: [{ hex: '10.10', unionVP: 3, confederateVP: 2, label: 'Fox Gap' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional description and digitizationNote', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      _description: 'Test map',
      _digitizationNote: 'some note',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all terrain types', () => {
    const terrains = [
      'clear',
      'woods',
      'slopingGround',
      'woodedSloping',
      'orchard',
      'marsh',
      'unknown',
    ];
    for (const terrain of terrains) {
      const result = MapSchema.safeParse({
        ...MINIMAL_VALID,
        hexes: [{ hex: '01.01', terrain }],
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('MapSchema — gridSpec rotation and locked', () => {
  const BASE_GRIDSPEC = {
    cols: 64,
    rows: 35,
    dx: 0,
    dy: 0,
    hexWidth: 35,
    hexHeight: 35,
    imageScale: 1,
    strokeWidth: 0.5,
    orientation: 'flat',
    evenColUp: false,
  };

  it('accepts gridSpec with rotation: 5', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, rotation: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts gridSpec with locked: true', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, locked: true },
    });
    expect(result.success).toBe(true);
  });

  it('accepts gridSpec with rotation: -15 (lower boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, rotation: -15 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts gridSpec with rotation: 15 (upper boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, rotation: 15 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts gridSpec with rotation: 0', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, rotation: 0 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects rotation > 15', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, rotation: 20 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects rotation < -15', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, rotation: -20 },
    });
    expect(result.success).toBe(false);
  });
});

describe('MapSchema — gridSpec northOffset', () => {
  const BASE_GRIDSPEC = {
    cols: 64,
    rows: 35,
    dx: 0,
    dy: 0,
    hexWidth: 35,
    hexHeight: 35,
    imageScale: 1,
    strokeWidth: 0.5,
    orientation: 'flat',
    evenColUp: false,
  };

  it('accepts northOffset: 0 (lower boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, northOffset: 0 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts northOffset: 3 (SM default)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, northOffset: 3 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts northOffset: 11 (upper boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, northOffset: 11 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts gridSpec without northOffset (optional)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC },
    });
    expect(result.success).toBe(true);
  });

  it('rejects northOffset: 12 (above upper boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, northOffset: 12 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects northOffset: -1 (below lower boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, northOffset: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects northOffset: 1.5 (non-integer)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: { ...BASE_GRIDSPEC, northOffset: 1.5 },
    });
    expect(result.success).toBe(false);
  });
});

describe('MapSchema — HexEntry playable and auto-detect fields', () => {
  it('accepts HexEntry with playable: false', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '02.00', terrain: 'unknown', playable: false }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts HexEntry with all three new fields present', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [
        {
          hex: '10.10',
          terrain: 'woods',
          playable: true,
          autoDetected: true,
          detectionConfidence: 0.85,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts HexEntry with all three new fields omitted', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '10.10', terrain: 'clear' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects detectionConfidence above 1', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '10.10', terrain: 'clear', detectionConfidence: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects detectionConfidence below 0', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '10.10', terrain: 'clear', detectionConfidence: -0.1 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts detectionConfidence at boundary values 0 and 1', () => {
    const r0 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '10.10', terrain: 'clear', detectionConfidence: 0 }],
    });
    const r1 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '10.10', terrain: 'clear', detectionConfidence: 1 }],
    });
    expect(r0.success).toBe(true);
    expect(r1.success).toBe(true);
  });
});

describe('MapSchema — elevation integer validation', () => {
  it('rejects elevation: 550 (non-integer level)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 550 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts elevation: 5 (valid integer level)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 5 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects elevation: -1 (below min)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects elevation: 1.5 (non-integer)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts elevation: 0 (zero = base level)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 0 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('MapSchema — wedgeElevations integer validation', () => {
  it('rejects wedgeElevations with non-integer values', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [0.5, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'wedgeElevations', 0]);
  });

  it('accepts wedgeElevations with all integer values (including negatives)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [0, 1, -1, 2, -2, 0] }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts wedgeElevations with all zeros', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [0, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects wedgeElevations with value 22 (above max 21)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [22, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'wedgeElevations', 0]);
  });

  it('rejects wedgeElevations with value -22 (below min -21)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [0, 0, 0, -22, 0, 0] }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'wedgeElevations', 3]);
  });

  it('accepts wedgeElevations at boundary values ±21', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [21, -21, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects wedgeElevations offset equal to elevationLevels when levels < 22 (#103)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 0,
        elevationLevels: 5,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [5, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('custom');
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'wedgeElevations', 0]);
  });

  it('accepts wedgeElevations offset at elevationLevels−1 when levels < 22 (#103)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 0,
        elevationLevels: 5,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [4, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative wedge offset below −(elevationLevels−1) when levels < 22 (#103)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 0,
        elevationLevels: 5,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [-5, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('custom');
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'wedgeElevations', 0]);
  });

  it('accepts negative wedge offset at −(elevationLevels−1) when levels < 22 (#103)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 0,
        elevationLevels: 5,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
      hexes: [{ hex: '01.01', terrain: 'clear', wedgeElevations: [-4, 0, 0, 0, 0, 0] }],
    });
    expect(result.success).toBe(true);
  });
});

describe('MapSchema — elevationSystem bounds', () => {
  it('rejects baseElevation: -1 (below min 0)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: -1,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects baseElevation: 10000 (above max 9999)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 10000,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts baseElevation at boundary values 0 and 9999', () => {
    const r0 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 0,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    const r9999 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 9999,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(r0.success).toBe(true);
    expect(r9999.success).toBe(true);
  });

  it('rejects baseElevation: 500.5 (non-integer)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500.5,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects elevationLevels: 0 (below min 1)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        elevationLevels: 0,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects elevationLevels: 100 (above max 99)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        elevationLevels: 100,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts elevationLevels at boundary values 1 and 99', () => {
    const r1 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        elevationLevels: 1,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    const r99 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        elevationLevels: 99,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(r1.success).toBe(true);
    expect(r99.success).toBe(true);
  });
});

describe('MapSchema — elevationSystem with new fields', () => {
  it('accepts elevationSystem with all four required fields', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects elevationSystem missing baseElevation', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects elevationSystem missing elevationLevels', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts elevationSystem with optional _note', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: {
        baseElevation: 500,
        elevationLevels: 22,
        contourInterval: 50,
        unit: 'feet',
        verticalSlopesImpassable: true,
        _note: 'SM contour data',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('MapSchema — elevation runtime validation against elevationLevels', () => {
  const ELEV_SYS = {
    baseElevation: 500,
    elevationLevels: 22,
    contourInterval: 50,
    unit: 'feet',
    verticalSlopesImpassable: true,
  };

  it('rejects elevation: 22 when elevationLevels is 22 (max is 21)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: ELEV_SYS,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 22 }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('too_big');
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'elevation']);
  });

  it('accepts elevation: 21 when elevationLevels is 22 (boundary)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: ELEV_SYS,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 21 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts elevation: 22 when elevationLevels is 23 (max is 22)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: { ...ELEV_SYS, elevationLevels: 23 },
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 22 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects elevation: 21 when elevationLevels is 1 (max is 0)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: { ...ELEV_SYS, elevationLevels: 1 },
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 21 }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('too_big');
    expect(result.error.issues[0].path).toEqual(['hexes', 0, 'elevation']);
  });

  it('uses default max of 21 when elevationSystem is absent', () => {
    // elevation: 21 should pass (within default 22 levels)
    const r21 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 21 }],
    });
    // elevation: 22 should fail (above default max 21)
    const r22 = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 22 }],
    });
    expect(r21.success).toBe(true);
    expect(r22.success).toBe(false);
  });

  it('SM map.json values validate cleanly: elevationLevels 22, elevation 21', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      elevationSystem: ELEV_SYS,
      hexes: [{ hex: '01.01', terrain: 'clear', elevation: 21 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('MapSchema — invalid documents', () => {
  it('rejects wrong layout value', () => {
    const result = MapSchema.safeParse({ ...MINIMAL_VALID, layout: 'flat-top' });
    expect(result.success).toBe(false);
  });

  it('rejects bad terrain type', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'lava' }],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues.length).toBeGreaterThan(0);
  });

  it('rejects gridSpec missing cols', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: {
        rows: 35,
        dx: 0,
        dy: 0,
        hexWidth: 35,
        hexHeight: 35,
        imageScale: 1,
        strokeWidth: 0.5,
        orientation: 'flat',
        evenColUp: false,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative hexWidth', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      gridSpec: {
        cols: 10,
        rows: 10,
        dx: 0,
        dy: 0,
        hexWidth: -5,
        hexHeight: 35,
        imageScale: 1,
        strokeWidth: 0.5,
        orientation: 'flat',
        evenColUp: false,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex entry (missing terrain)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing scenario', () => {
    const noScenario = { _status: 'draft', layout: 'pointy-top', vpHexes: [], hexes: [] };
    const result = MapSchema.safeParse(noScenario);
    expect(result.success).toBe(false);
  });
});

describe('MapSchema — hexFeature single field (#135)', () => {
  it('accepts hexFeature: { type: "building" }', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', hexFeature: { type: 'building' } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts hex with no hexFeature (optional)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects hexFeature with unknown type', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', hexFeature: { type: 'fort' } }],
    });
    expect(result.success).toBe(false);
  });
});

describe('MapSchema — integer face-index edge keys (#135)', () => {
  it('accepts edges with face index "0"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [
        {
          hex: '01.01',
          terrain: 'clear',
          edges: { 0: [{ type: 'stream' }] },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts edges with face indices "0", "1", "2"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [
        {
          hex: '01.01',
          terrain: 'clear',
          edges: {
            0: [{ type: 'stream' }],
            1: [{ type: 'road' }],
            2: [{ type: 'elevation' }],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects edges with string direction key "N"', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', edges: { N: [{ type: 'stream' }] } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects edges with face index "3" (non-canonical)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ hex: '01.01', terrain: 'clear', edges: { 3: [{ type: 'stream' }] } }],
    });
    expect(result.success).toBe(false);
  });
});

describe('MapSchema — validateCoexistence (#135)', () => {
  const BASE_HEX = { hex: '01.01', terrain: 'clear' };

  it('rejects ford without stream on same edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 0: [{ type: 'ford' }] } }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts ford with stream on same edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 0: [{ type: 'ford' }, { type: 'stream' }] } }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects bridge without road/trail/pike on same edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 1: [{ type: 'bridge' }, { type: 'stream' }] } }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts bridge with road on same edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [
        { ...BASE_HEX, edges: { 1: [{ type: 'bridge' }, { type: 'road' }, { type: 'stream' }] } },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects two elevation-type features on same edge (slope + extremeSlope)', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 0: [{ type: 'slope' }, { type: 'extremeSlope' }] } }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts slope alone on an edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 0: [{ type: 'slope' }] } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts stream and stoneWall coexisting on same edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 2: [{ type: 'stream' }, { type: 'stoneWall' }] } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts road and trail coexisting on same edge', () => {
    const result = MapSchema.safeParse({
      ...MINIMAL_VALID,
      hexes: [{ ...BASE_HEX, edges: { 0: [{ type: 'road' }, { type: 'trail' }] } }],
    });
    expect(result.success).toBe(true);
  });
});
