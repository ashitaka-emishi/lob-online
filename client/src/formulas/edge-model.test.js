import { describe, it, expect } from 'vitest';
import {
  oppositeFace,
  canonicalOwner,
  getEdgeFeatures,
  validateCoexistence,
  addEdgeFeature,
  removeEdgeFeature,
  applyContourPaint,
  stripNonPlayableBoundaryEdges,
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

  describe('applyContourPaint(existingFeatures, newType)', () => {
    it('adds contour type to empty edge', () => {
      const result = applyContourPaint([], 'slope');
      expect(result).toEqual([{ type: 'slope' }]);
    });

    it('adds contour type to edge with no existing contour features', () => {
      const result = applyContourPaint([{ type: 'road' }], 'elevation');
      expect(result).toContainEqual({ type: 'elevation' });
      expect(result).toContainEqual({ type: 'road' });
    });

    it('replaces existing contour type (strip-then-add)', () => {
      const result = applyContourPaint([{ type: 'elevation' }], 'slope');
      expect(result).toContainEqual({ type: 'slope' });
      expect(result).not.toContainEqual({ type: 'elevation' });
    });

    it('replaces any contour type regardless of which one', () => {
      const result = applyContourPaint([{ type: 'extremeSlope' }], 'verticalSlope');
      expect(result).toContainEqual({ type: 'verticalSlope' });
      expect(result).not.toContainEqual({ type: 'extremeSlope' });
    });

    it('preserves non-contour features (road, stream) when replacing contour', () => {
      const existing = [{ type: 'road' }, { type: 'elevation' }];
      const result = applyContourPaint(existing, 'slope');
      expect(result).toContainEqual({ type: 'road' });
      expect(result).toContainEqual({ type: 'slope' });
      expect(result).not.toContainEqual({ type: 'elevation' });
    });

    it('is idempotent — returns null when type is already present', () => {
      const result = applyContourPaint([{ type: 'slope' }], 'slope');
      expect(result).toBeNull();
    });

    it('handles mixed string/object feature arrays', () => {
      const result = applyContourPaint(['road', { type: 'elevation' }], 'slope');
      expect(result).toContainEqual({ type: 'slope' });
      expect(result).not.toContainEqual({ type: 'elevation' });
      expect(result.some((f) => f === 'road' || f?.type === 'road')).toBe(true);
    });

    it('does not mutate the existingFeatures array', () => {
      // L4: immutability — caller's array must remain unchanged
      const existing = [{ type: 'elevation' }];
      applyContourPaint(existing, 'slope');
      expect(existing).toEqual([{ type: 'elevation' }]);
    });

    it('non-CONTOUR_TYPES newType still strips existing contour features', () => {
      // L3: documents behavior for out-of-spec input — the filter strips based on
      // EXISTING features being in CONTOUR_TYPES, not on newType being in CONTOUR_TYPES.
      // Callers must only pass valid CONTOUR_TYPES values (see JSDoc).
      const result = applyContourPaint([{ type: 'elevation' }], 'unknownType');
      expect(result).not.toContainEqual({ type: 'elevation' }); // elevation stripped
      expect(result).toContainEqual({ type: 'unknownType' });
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

  describe('stripNonPlayableBoundaryEdges(hexes, gridSpec)', () => {
    it('strips a face when the owning hex is non-playable', () => {
      const hexes = [{ hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }] } }];
      stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
      expect(hexes[0].edges).toBeUndefined();
    });

    it('strips a face when the adjacent hex is non-playable', () => {
      // face 0 (N) of 05.05 is adjacent to 05.06 (col.row format, N increments row)
      const hexes = [
        { hex: '05.05', edges: { 0: [{ type: 'stream' }] } },
        { hex: '05.06', playable: false },
      ];
      stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
      expect(hexes[0].edges).toBeUndefined();
    });

    it('leaves faces between two playable hexes untouched', () => {
      const hexes = [{ hex: '05.05', edges: { 0: [{ type: 'road' }] } }, { hex: '05.06' }];
      stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
      expect(hexes[0].edges[0]).toEqual([{ type: 'road' }]);
    });

    it('cleans up empty edges object after stripping', () => {
      const hexes = [{ hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }] } }];
      stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
      expect(Object.prototype.hasOwnProperty.call(hexes[0], 'edges')).toBe(false);
    });

    it('is a no-op for hexes with no edges', () => {
      const hexes = [{ hex: '05.05', playable: false }];
      expect(() => stripNonPlayableBoundaryEdges(hexes, GRID_SPEC)).not.toThrow();
    });
  });
});
