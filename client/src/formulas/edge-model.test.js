import { describe, it, expect } from 'vitest';
import {
  oppositeFace,
  canonicalOwner,
  getEdgeFeatures,
  validateCoexistence,
  addEdgeFeature,
  removeEdgeFeature,
} from './edge-model.js';

const GRID_SPEC = { rows: 10, cols: 10 };

describe('formulas/edge-model', () => {
  describe('oppositeFace(faceIndex)', () => {
    it('face 0 → 3', () => expect(oppositeFace(0)).toBe(3));
    it('face 1 → 4', () => expect(oppositeFace(1)).toBe(4));
    it('face 2 → 5', () => expect(oppositeFace(2)).toBe(5));
    it('face 3 → 0', () => expect(oppositeFace(3)).toBe(0));
    it('face 4 → 1', () => expect(oppositeFace(4)).toBe(1));
    it('face 5 → 2', () => expect(oppositeFace(5)).toBe(2));
    it('is its own inverse', () => {
      for (let f = 0; f < 6; f++) {
        expect(oppositeFace(oppositeFace(f))).toBe(f);
      }
    });
  });

  describe('canonicalOwner(hexId, faceIndex, gridSpec)', () => {
    it('faces 0–2: owner is the hex itself', () => {
      for (let f = 0; f <= 2; f++) {
        const { ownerId, ownerFace } = canonicalOwner('05.05', f, GRID_SPEC);
        expect(ownerId).toBe('05.05');
        expect(ownerFace).toBe(f);
      }
    });

    it('faces 3–5: owner is the neighbour hex', () => {
      for (let f = 3; f <= 5; f++) {
        const { ownerId, ownerFace } = canonicalOwner('05.05', f, GRID_SPEC);
        expect(ownerId).not.toBe('05.05');
        expect(ownerFace).toBe(f - 3);
      }
    });

    it('ownerFace of opposite face is always < 3', () => {
      for (let f = 3; f <= 5; f++) {
        const { ownerFace } = canonicalOwner('05.05', f, GRID_SPEC);
        expect(ownerFace).toBeLessThan(3);
      }
    });
  });

  describe('getEdgeFeatures(hexMap, hexId, faceIndex, gridSpec)', () => {
    it('returns [] for a hex with no edges entry', () => {
      const hexMap = new Map([['05.05', { hex: '05.05' }]]);
      expect(getEdgeFeatures(hexMap, '05.05', 0, GRID_SPEC)).toEqual([]);
    });

    it('returns features from canonical owner face for face 0', () => {
      const hexMap = new Map([['05.05', { hex: '05.05', edges: { 0: ['road'], 1: [], 2: [] } }]]);
      expect(getEdgeFeatures(hexMap, '05.05', 0, GRID_SPEC)).toEqual(['road']);
    });

    it('returns [] when canonical hex is out of bounds', () => {
      const hexMap = new Map([['01.01', { hex: '01.01' }]]);
      // face 3 on a boundary hex may have no neighbour
      const result = getEdgeFeatures(hexMap, '01.01', 3, GRID_SPEC);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('validateCoexistence(existingFeatures, newType)', () => {
    it('allows adding road to an empty edge', () => {
      const { valid } = validateCoexistence([], 'road');
      expect(valid).toBe(true);
    });

    it('allows adding stream to an empty edge', () => {
      const { valid } = validateCoexistence([], 'stream');
      expect(valid).toBe(true);
    });

    it('road + trail coexist', () => {
      expect(validateCoexistence(['road'], 'trail').valid).toBe(true);
    });

    it('road + pike coexist', () => {
      expect(validateCoexistence(['road'], 'pike').valid).toBe(true);
    });

    it('slope types are mutually exclusive per edge', () => {
      expect(validateCoexistence(['slope'], 'extremeSlope').valid).toBe(false);
      expect(validateCoexistence(['extremeSlope'], 'verticalSlope').valid).toBe(false);
      expect(validateCoexistence(['verticalSlope'], 'slope').valid).toBe(false);
    });

    it('elevation coexists with slope (both are contour features)', () => {
      // 'elevation' (contour marker) and 'slope' can coexist — they are different layer types
      const { valid } = validateCoexistence(['elevation'], 'slope');
      expect(valid).toBe(true);
    });

    it('returns { valid, reason } shape', () => {
      const result = validateCoexistence(['slope'], 'extremeSlope');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
    });

    it('reason is a non-empty string when invalid', () => {
      const { valid, reason } = validateCoexistence(['slope'], 'extremeSlope');
      expect(valid).toBe(false);
      expect(typeof reason).toBe('string');
      expect(reason.length).toBeGreaterThan(0);
    });

    it('reason is null or empty string when valid', () => {
      const { valid, reason } = validateCoexistence([], 'road');
      expect(valid).toBe(true);
      expect(reason == null || reason === '').toBe(true);
    });
  });

  describe('addEdgeFeature(hexMap, hexId, faceIndex, type, gridSpec)', () => {
    it('adds a feature to the canonical owner edge (face 0)', () => {
      const hexMap = new Map([['05.05', { hex: '05.05', edges: {} }]]);
      addEdgeFeature(hexMap, '05.05', 0, 'road', GRID_SPEC);
      expect(hexMap.get('05.05').edges[0]).toContain('road');
    });

    it('does not add a duplicate feature', () => {
      const hexMap = new Map([['05.05', { hex: '05.05', edges: { 0: ['road'] } }]]);
      addEdgeFeature(hexMap, '05.05', 0, 'road', GRID_SPEC);
      const features = hexMap.get('05.05').edges[0];
      expect(features.filter((f) => f === 'road')).toHaveLength(1);
    });

    it('respects validateCoexistence — does not add conflicting slope type', () => {
      const hexMap = new Map([['05.05', { hex: '05.05', edges: { 0: ['slope'] } }]]);
      addEdgeFeature(hexMap, '05.05', 0, 'extremeSlope', GRID_SPEC);
      expect(hexMap.get('05.05').edges[0]).not.toContain('extremeSlope');
    });
  });

  describe('removeEdgeFeature(hexMap, hexId, faceIndex, type, gridSpec)', () => {
    it('removes a feature from the canonical owner edge', () => {
      const hexMap = new Map([['05.05', { hex: '05.05', edges: { 0: ['road', 'trail'] } }]]);
      removeEdgeFeature(hexMap, '05.05', 0, 'road', GRID_SPEC);
      expect(hexMap.get('05.05').edges[0]).not.toContain('road');
      expect(hexMap.get('05.05').edges[0]).toContain('trail');
    });

    it('is a no-op when the feature is not present', () => {
      const hexMap = new Map([['05.05', { hex: '05.05', edges: { 0: ['trail'] } }]]);
      removeEdgeFeature(hexMap, '05.05', 0, 'road', GRID_SPEC);
      expect(hexMap.get('05.05').edges[0]).toEqual(['trail']);
    });

    it('is a no-op when the hex has no edges', () => {
      const hexMap = new Map([['05.05', { hex: '05.05' }]]);
      expect(() => removeEdgeFeature(hexMap, '05.05', 0, 'road', GRID_SPEC)).not.toThrow();
    });
  });
});
