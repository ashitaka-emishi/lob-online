import { describe, expect, it } from 'vitest';

import { DEFAULT_CALIBRATION, sanitizeCalibration } from './calibration.js';

describe('sanitizeCalibration (#424)', () => {
  it('returns all DEFAULT_CALIBRATION keys when given a complete valid input', () => {
    const input = {
      cols: 10,
      rows: 8,
      dx: 1,
      dy: 2,
      hexWidth: 40,
      hexHeight: 42,
      imageScale: 1.5,
      strokeWidth: 2,
      northOffset: 3,
      orientation: 'flat',
      evenColUp: false,
    };
    const result = sanitizeCalibration(input);
    expect(result).toMatchObject(input);
  });

  it('falls back to DEFAULT_CALIBRATION for NaN numerics', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, cols: NaN });
    expect(result.cols).toBe(DEFAULT_CALIBRATION.cols);
  });

  it('falls back to DEFAULT_CALIBRATION for Infinity numerics', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, hexWidth: Infinity });
    expect(result.hexWidth).toBe(DEFAULT_CALIBRATION.hexWidth);
  });

  it('falls back to DEFAULT_CALIBRATION for invalid orientation', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, orientation: 'diagonal' });
    expect(result.orientation).toBe(DEFAULT_CALIBRATION.orientation);
  });

  it('falls back to DEFAULT_CALIBRATION for non-boolean evenColUp', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, evenColUp: 'yes' });
    expect(result.evenColUp).toBe(DEFAULT_CALIBRATION.evenColUp);
  });

  it('accepts partial override — only overridden fields change', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, cols: 32 });
    expect(result.cols).toBe(32);
    expect(result.rows).toBe(DEFAULT_CALIBRATION.rows);
    expect(result.hexWidth).toBe(DEFAULT_CALIBRATION.hexWidth);
  });

  it('accepts partial override — only hexHeight overridden', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, hexHeight: 50 });
    expect(result.hexHeight).toBe(50);
    expect(result.cols).toBe(DEFAULT_CALIBRATION.cols);
  });

  it('accepts partial override — only origin (dx/dy) overridden', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, dx: 5, dy: 10 });
    expect(result.dx).toBe(5);
    expect(result.dy).toBe(10);
    expect(result.cols).toBe(DEFAULT_CALIBRATION.cols);
  });

  it('includes optional rotation field when present', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, rotation: 45 });
    expect(result.rotation).toBe(45);
  });

  it('omits optional rotation field when absent', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION });
    expect(result.rotation).toBeUndefined();
  });

  it('includes optional locked field when present', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, locked: true });
    expect(result.locked).toBe(true);
  });

  it('drops unknown keys', () => {
    const result = sanitizeCalibration({ ...DEFAULT_CALIBRATION, bogus: 'ignored' });
    expect(result.bogus).toBeUndefined();
  });

  it('fills in all DEFAULT_CALIBRATION fields when given a sparse object (production wire format)', () => {
    const result = sanitizeCalibration({
      cols: 64,
      rows: 35,
      hexWidth: 40.5,
      hexHeight: 40.7,
      imageScale: 1,
    });
    expect(result).toEqual({
      cols: 64,
      rows: 35,
      hexWidth: 40.5,
      hexHeight: 40.7,
      imageScale: 1,
      dx: DEFAULT_CALIBRATION.dx,
      dy: DEFAULT_CALIBRATION.dy,
      strokeWidth: DEFAULT_CALIBRATION.strokeWidth,
      northOffset: DEFAULT_CALIBRATION.northOffset,
      orientation: DEFAULT_CALIBRATION.orientation,
      evenColUp: DEFAULT_CALIBRATION.evenColUp,
    });
  });

  it('returns DEFAULT_CALIBRATION when given an empty object', () => {
    expect(sanitizeCalibration({})).toEqual(DEFAULT_CALIBRATION);
  });
});
