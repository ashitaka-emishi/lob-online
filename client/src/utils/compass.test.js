import { describe, it, expect } from 'vitest';
import { compassLabel } from './compass.js';

const LABELS_6 = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const LABELS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

describe('compassLabel — northOffset=0 (default orientation)', () => {
  it('face 0 → N', () => expect(compassLabel(0, 0)).toBe('N'));
  it('face 1 → NE', () => expect(compassLabel(1, 0)).toBe('NE'));
  it('face 2 → SE', () => expect(compassLabel(2, 0)).toBe('SE'));
  it('face 3 → S', () => expect(compassLabel(3, 0)).toBe('S'));
  it('face 4 → SW', () => expect(compassLabel(4, 0)).toBe('SW'));
  it('face 5 → NW', () => expect(compassLabel(5, 0)).toBe('NW'));
});

describe('compassLabel — northOffset=3 (South Mountain default)', () => {
  // northOffset=3: geographic N points to the right vertex (between geometric NE and SE faces).
  // Face labels step through: W, NW, NE, E, SE, SW — includes 'W' and 'E'.
  it('face 0 → W', () => expect(compassLabel(0, 3)).toBe('W'));
  it('face 1 → NW', () => expect(compassLabel(1, 3)).toBe('NW'));
  it('face 2 → NE', () => expect(compassLabel(2, 3)).toBe('NE'));
  it('face 3 → E', () => expect(compassLabel(3, 3)).toBe('E'));
  it('face 4 → SE', () => expect(compassLabel(4, 3)).toBe('SE'));
  it('face 5 → SW', () => expect(compassLabel(5, 3)).toBe('SW'));
});

describe('compassLabel — northOffset=4 (two-face rotation)', () => {
  it('face 0 → SW', () => expect(compassLabel(0, 4)).toBe('SW'));
  it('face 1 → NW', () => expect(compassLabel(1, 4)).toBe('NW'));
  it('face 2 → N', () => expect(compassLabel(2, 4)).toBe('N'));
  it('face 3 → NE', () => expect(compassLabel(3, 4)).toBe('NE'));
  it('face 4 → SE', () => expect(compassLabel(4, 4)).toBe('SE'));
  it('face 5 → S', () => expect(compassLabel(5, 4)).toBe('S'));
});

describe('compassLabel — northOffset=11 (upper boundary)', () => {
  it('returns a valid LABEL string', () => {
    for (let face = 0; face < 6; face++) {
      expect(LABELS_8).toContain(compassLabel(face, 11));
    }
  });
});

describe('compassLabel — full northOffset sweep (no repeats per row)', () => {
  it('each northOffset produces 6 distinct labels across faces 0–5', () => {
    for (let northOffset = 0; northOffset <= 11; northOffset++) {
      const labels = Array.from({ length: 6 }, (_, face) => compassLabel(face, northOffset));
      expect(new Set(labels).size).toBe(6);
    }
  });

  it('even northOffsets produce only the 6 standard labels', () => {
    for (let northOffset = 0; northOffset <= 11; northOffset += 2) {
      const labels = Array.from({ length: 6 }, (_, face) => compassLabel(face, northOffset));
      for (const label of labels) {
        expect(LABELS_6).toContain(label);
      }
    }
  });

  it('odd northOffsets produce labels from the 8-direction set (may include E/W)', () => {
    for (let northOffset = 1; northOffset <= 11; northOffset += 2) {
      const labels = Array.from({ length: 6 }, (_, face) => compassLabel(face, northOffset));
      for (const label of labels) {
        expect(LABELS_8).toContain(label);
      }
    }
  });
});
