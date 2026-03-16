import { describe, it, expect } from 'vitest';

import {
  AutoDetectConfigSchema,
  ElevationBandSchema,
  SeedHexSchema,
} from './map-autodetect-config.schema.js';

describe('ElevationBandSchema', () => {
  it('accepts a valid elevation band', () => {
    const result = ElevationBandSchema.safeParse({
      elevationFeet: 400,
      colorName: 'valley green',
      rgb: [100, 140, 90],
    });
    expect(result.success).toBe(true);
  });

  it('rejects rgb with wrong length', () => {
    const result = ElevationBandSchema.safeParse({
      elevationFeet: 400,
      colorName: 'valley green',
      rgb: [100, 140],
    });
    expect(result.success).toBe(false);
  });

  it('rejects rgb with non-number values', () => {
    const result = ElevationBandSchema.safeParse({
      elevationFeet: 400,
      colorName: 'valley green',
      rgb: ['red', 140, 90],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing colorName', () => {
    const result = ElevationBandSchema.safeParse({
      elevationFeet: 400,
      rgb: [100, 140, 90],
    });
    expect(result.success).toBe(false);
  });
});

describe('SeedHexSchema', () => {
  const VALID_SEED = {
    hexId: '12.08',
    confirmedData: {
      terrain: 'woods',
      elevation: 550,
      features: [],
    },
    cropBase64: '',
  };

  it('accepts a valid seed hex', () => {
    const result = SeedHexSchema.safeParse(VALID_SEED);
    expect(result.success).toBe(true);
  });

  it('accepts a seed hex with features', () => {
    const result = SeedHexSchema.safeParse({
      ...VALID_SEED,
      confirmedData: { ...VALID_SEED.confirmedData, features: ['building'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing confirmedData.terrain', () => {
    const result = SeedHexSchema.safeParse({
      ...VALID_SEED,
      confirmedData: { elevation: 550, features: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing confirmedData.elevation', () => {
    const result = SeedHexSchema.safeParse({
      ...VALID_SEED,
      confirmedData: { terrain: 'woods', features: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing hexId', () => {
    const { hexId: _hexId, ...noId } = VALID_SEED;
    const result = SeedHexSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });
});

describe('AutoDetectConfigSchema', () => {
  it('accepts empty config', () => {
    const result = AutoDetectConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts config with only seedHexes array', () => {
    const result = AutoDetectConfigSchema.safeParse({ seedHexes: [] });
    expect(result.success).toBe(true);
  });

  it('accepts full valid config', () => {
    const result = AutoDetectConfigSchema.safeParse({
      elevationPalette: [
        { elevationFeet: 250, colorName: 'lowland', rgb: [120, 160, 130] },
        { elevationFeet: 500, colorName: 'midslope', rgb: [160, 140, 100] },
      ],
      confidenceThreshold: 0.6,
      seedHexes: [
        {
          hexId: '10.10',
          confirmedData: { terrain: 'clear', elevation: 300, features: [] },
          cropBase64: '',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects confidenceThreshold above 1', () => {
    const result = AutoDetectConfigSchema.safeParse({ confidenceThreshold: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects confidenceThreshold below 0', () => {
    const result = AutoDetectConfigSchema.safeParse({ confidenceThreshold: -0.1 });
    expect(result.success).toBe(false);
  });

  it('accepts confidenceThreshold at boundary values 0 and 1', () => {
    expect(AutoDetectConfigSchema.safeParse({ confidenceThreshold: 0 }).success).toBe(true);
    expect(AutoDetectConfigSchema.safeParse({ confidenceThreshold: 1 }).success).toBe(true);
  });

  it('rejects invalid rgb tuple inside elevationPalette', () => {
    const result = AutoDetectConfigSchema.safeParse({
      elevationPalette: [{ elevationFeet: 250, colorName: 'low', rgb: [120, 160] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects seed hex missing confirmedData fields', () => {
    const result = AutoDetectConfigSchema.safeParse({
      seedHexes: [
        { hexId: '10.10', confirmedData: { elevation: 300, features: [] }, cropBase64: '' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
