import { describe, it, expect } from 'vitest';
import { elevationTintPalette, tintForLevel, autoDetectContourType } from './elevation.js';

describe('formulas/elevation', () => {
  describe('elevationTintPalette(elevationLevels)', () => {
    it('returns an array with the requested number of colors', () => {
      expect(elevationTintPalette(22)).toHaveLength(22);
      expect(elevationTintPalette(1)).toHaveLength(1);
      expect(elevationTintPalette(5)).toHaveLength(5);
    });

    it('level 0 is a blue-ish hsl color (hue near 185)', () => {
      const palette = elevationTintPalette(22);
      // hsl(185,50%,65%) at level 0
      expect(palette[0]).toMatch(/^hsl\(/);
      expect(palette[0]).toContain('185');
    });

    it('max level is a brown hsl color (hue near 25)', () => {
      const palette = elevationTintPalette(22);
      expect(palette[21]).toMatch(/^hsl\(/);
      expect(palette[21]).toContain('25');
    });

    it('all colors are valid hsl() strings', () => {
      const palette = elevationTintPalette(10);
      for (const color of palette) {
        expect(color).toMatch(/^hsl\(\d+,\d+%,\d+%\)$/);
      }
    });

    it('all colors are distinct for elevationLevels > 1', () => {
      const palette = elevationTintPalette(22);
      const unique = new Set(palette);
      expect(unique.size).toBe(22);
    });

    it('single level returns array with one color', () => {
      const palette = elevationTintPalette(1);
      expect(palette).toHaveLength(1);
      expect(palette[0]).toMatch(/^hsl\(/);
    });
  });

  describe('tintForLevel(level, palette)', () => {
    const palette = elevationTintPalette(5);

    it('returns the correct color for level 0', () => {
      expect(tintForLevel(0, palette)).toBe(palette[0]);
    });

    it('returns the correct color for the last level', () => {
      expect(tintForLevel(4, palette)).toBe(palette[4]);
    });

    it('returns null for a negative level', () => {
      expect(tintForLevel(-1, palette)).toBeNull();
    });

    it('returns null for a level equal to palette length', () => {
      expect(tintForLevel(5, palette)).toBeNull();
    });

    it('returns null for a level beyond palette length', () => {
      expect(tintForLevel(99, palette)).toBeNull();
    });
  });

  describe('autoDetectContourType(levelA, levelB)', () => {
    it('returns null when levels are equal (diff 0)', () => {
      expect(autoDetectContourType(3, 3)).toBeNull();
      expect(autoDetectContourType(0, 0)).toBeNull();
    });

    it('returns "elevation" for diff of 1', () => {
      expect(autoDetectContourType(2, 3)).toBe('elevation');
      expect(autoDetectContourType(5, 4)).toBe('elevation');
    });

    it('returns "extremeSlope" for diff of 2', () => {
      expect(autoDetectContourType(0, 2)).toBe('extremeSlope');
      expect(autoDetectContourType(5, 3)).toBe('extremeSlope');
    });

    it('returns "verticalSlope" for diff of 3', () => {
      expect(autoDetectContourType(0, 3)).toBe('verticalSlope');
    });

    it('returns "verticalSlope" for diff > 3', () => {
      expect(autoDetectContourType(0, 5)).toBe('verticalSlope');
      expect(autoDetectContourType(10, 0)).toBe('verticalSlope');
    });

    it('is symmetric — order of arguments does not affect result', () => {
      expect(autoDetectContourType(1, 3)).toBe(autoDetectContourType(3, 1));
      expect(autoDetectContourType(0, 2)).toBe(autoDetectContourType(2, 0));
    });
  });
});
