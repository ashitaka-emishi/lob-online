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
        evenColUp: false,
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
          hexsides: { N: 'stream' },
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
