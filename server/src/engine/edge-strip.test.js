import { describe, it, expect } from 'vitest';
import { stripNonPlayableBoundaryEdges } from './edge-strip.js';

// Minimal gridSpec for the south-mountain map (flat-top, EVEN_Q, 5-col offset).
// All hex adjacency tests use column 5 (odd) as the primary hex.
const GRID_SPEC = {
  cols: 64,
  rows: 35,
  dx: 0,
  dy: 0,
  hexWidth: 40,
  hexHeight: 40,
  imageScale: 1,
  strokeWidth: 1,
  orientation: 'flat',
  evenColUp: true,
};

describe('stripNonPlayableBoundaryEdges (engine/edge-strip.js) (#492)', () => {
  it('returns 0 when there are no edges to strip', () => {
    const hexes = [{ hex: '05.05', terrain: 'clear' }];
    expect(stripNonPlayableBoundaryEdges(hexes, GRID_SPEC)).toBe(0);
  });

  it('returns 0 for edges between two playable hexes', () => {
    const hexes = [{ hex: '05.05', edges: { 0: [{ type: 'road' }] } }, { hex: '05.06' }];
    expect(stripNonPlayableBoundaryEdges(hexes, GRID_SPEC)).toBe(0);
    expect(hexes[0].edges[0]).toEqual([{ type: 'road' }]);
  });

  // ── Face 0 (N) ─────────────────────────────────────────────────────────────

  it('strips face 0 (N) when hex itself is non-playable and returns count 1', () => {
    const hexes = [{ hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }] } }];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  it('strips face 0 (N) when adjacent hex is non-playable', () => {
    const hexes = [
      { hex: '05.05', edges: { 0: [{ type: 'stream' }] } },
      { hex: '05.06', playable: false },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  // ── Face 1 (NE) ────────────────────────────────────────────────────────────

  it('strips face 1 (NE) when adjacent hex is non-playable (odd column)', () => {
    // NE neighbor of 05.05 is 06.05
    const hexes = [
      { hex: '05.05', edges: { 1: [{ type: 'road' }] } },
      { hex: '06.05', playable: false },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  it('strips face 1 (NE) when adjacent hex is non-playable (even column)', () => {
    // NE neighbor of 06.05 is 07.06 in EVEN_Q
    const hexes = [
      { hex: '06.05', edges: { 1: [{ type: 'road' }] } },
      { hex: '07.06', playable: false },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  // ── Face 2 (SE) ────────────────────────────────────────────────────────────

  it('strips face 2 (SE) when adjacent hex is non-playable (odd column)', () => {
    // SE neighbor of 05.05 is 06.04
    const hexes = [
      { hex: '05.05', edges: { 2: [{ type: 'stream' }] } },
      { hex: '06.04', playable: false },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  it('strips face 2 (SE) when adjacent hex is non-playable (even column)', () => {
    // SE neighbor of 06.05 is 07.05 in EVEN_Q
    const hexes = [
      { hex: '06.05', edges: { 2: [{ type: 'road' }] } },
      { hex: '07.05', playable: false },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  // ── Multiple faces / return count ──────────────────────────────────────────

  it('strips multiple faces and returns total count', () => {
    const hexes = [
      { hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }], 1: [{ type: 'stream' }] } },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(2);
    expect(hexes[0].edges).toBeUndefined();
  });

  it('preserves interior face when only one boundary face is stripped', () => {
    // face 0 → 05.06 is non-playable; face 1 → 06.05 is playable
    const hexes = [
      { hex: '05.05', edges: { 0: [{ type: 'road' }], 1: [{ type: 'stream' }] } },
      { hex: '05.06', playable: false },
      { hex: '06.05' },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges[0]).toBeUndefined();
    expect(hexes[0].edges[1]).toEqual([{ type: 'stream' }]);
  });

  // ── Empty-edges starting variants ──────────────────────────────────────────

  it('is a no-op for edges:{} and returns 0', () => {
    const hexes = [{ hex: '05.05', playable: false, edges: {} }];
    expect(stripNonPlayableBoundaryEdges(hexes, GRID_SPEC)).toBe(0);
  });

  it('skips face with empty array (edges:{0:[]}) and returns 0', () => {
    const hexes = [
      { hex: '05.05', edges: { 0: [] } },
      { hex: '05.06', playable: false },
    ];
    expect(stripNonPlayableBoundaryEdges(hexes, GRID_SPEC)).toBe(0);
    expect(hexes[0].edges[0]).toEqual([]);
  });

  it('cleans up empty edges object after stripping all faces', () => {
    const hexes = [{ hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }] } }];
    stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(Object.prototype.hasOwnProperty.call(hexes[0], 'edges')).toBe(false);
  });
});
