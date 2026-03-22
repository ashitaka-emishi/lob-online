import { describe, it, expect } from 'vitest';
import { compassLabel, faceIndexForNorth, allFaceLabels } from './compass.js';

const LABELS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

describe('formulas/compass', () => {
  describe('compassLabel(faceIndex, northOffset)', () => {
    it('returns N for faceIndex 0 when northOffset 0 (north at top face)', () => {
      expect(compassLabel(0, 0)).toBe('N');
    });

    it('returns all six labels in sequence for northOffset 0', () => {
      const labels = Array.from({ length: 6 }, (_, i) => compassLabel(i, 0));
      expect(labels).toEqual(['N', 'NE', 'SE', 'S', 'SW', 'NW']);
    });

    it('northOffset 2: face 0 is NW', () => {
      // northOffset 2 means north is 2 steps clockwise from face 0 → face 0 is NW
      expect(compassLabel(0, 2)).toBe('NW');
    });

    it('northOffset 6: south at top, face 0 is S', () => {
      expect(compassLabel(0, 6)).toBe('S');
    });

    it('SM default: northOffset 3, face 0 is W', () => {
      // South Mountain: northOffset=3 (right vertex ≈ geographic N).
      // Geographic N falls between faces 1 and 2, so face 0 maps to 'W'.
      expect(compassLabel(0, 3)).toBe('W');
    });

    it('faceIndex 5 with northOffset 0 returns NW', () => {
      expect(compassLabel(5, 0)).toBe('NW');
    });

    it('is defined for all valid face indices 0–5 and northOffsets 0–11', () => {
      for (let f = 0; f <= 5; f++) {
        for (let n = 0; n <= 11; n++) {
          expect(LABELS_8).toContain(compassLabel(f, n));
        }
      }
    });
  });

  describe('faceIndexForNorth(northOffset)', () => {
    it('returns 0 when northOffset 0 (north at face 0)', () => {
      expect(faceIndexForNorth(0)).toBe(0);
    });

    it('returns 1 when northOffset 2', () => {
      // Math.round(2/2)%6 = 1
      expect(faceIndexForNorth(2)).toBe(1);
    });

    it('returns a value 0–5 for all northOffsets 0–11', () => {
      for (let n = 0; n <= 11; n++) {
        const f = faceIndexForNorth(n);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('allFaceLabels(northOffset)', () => {
    it('returns an array of 6 strings from the 8-direction set', () => {
      const labels = allFaceLabels(0);
      expect(labels).toHaveLength(6);
      for (const l of labels) {
        expect(LABELS_8).toContain(l);
      }
    });

    it('is equivalent to calling compassLabel for each face index', () => {
      for (let n = 0; n <= 11; n++) {
        const expected = Array.from({ length: 6 }, (_, i) => compassLabel(i, n));
        expect(allFaceLabels(n)).toEqual(expected);
      }
    });

    it('northOffset 0 returns standard flat-top sequence', () => {
      expect(allFaceLabels(0)).toEqual(['N', 'NE', 'SE', 'S', 'SW', 'NW']);
    });

    it('northOffset 3 (SM default) returns W, NW, NE, E, SE, SW', () => {
      expect(allFaceLabels(3)).toEqual(['W', 'NW', 'NE', 'E', 'SE', 'SW']);
    });
  });
});
