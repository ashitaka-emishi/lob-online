import { describe, it, expect } from 'vitest';

import { deriveEdgesAndSlope } from './elevationDerive.js';

describe('deriveEdgesAndSlope — slope index', () => {
  it('sets slope to index of the lowest wedge value', () => {
    const hex = { wedgeElevations: [0, 1, 2, -1, 0, 0] };
    const { slope } = deriveEdgesAndSlope(hex);
    expect(slope).toBe(3); // index 3 has value -1 (lowest)
  });

  it('sets slope to 0 when first wedge is lowest', () => {
    const hex = { wedgeElevations: [-2, 1, 1, 1, 1, 1] };
    const { slope } = deriveEdgesAndSlope(hex);
    expect(slope).toBe(0);
  });

  it('does not change slope when all wedge values are equal', () => {
    const hex = { wedgeElevations: [2, 2, 2, 2, 2, 2], slope: 3 };
    const { slope } = deriveEdgesAndSlope(hex);
    expect(slope).toBe(3); // unchanged
  });

  it('does not change slope (null) when all wedge values are equal and slope was null', () => {
    const hex = { wedgeElevations: [0, 0, 0, 0, 0, 0], slope: null };
    const { slope } = deriveEdgesAndSlope(hex);
    expect(slope).toBe(null);
  });
});

describe('deriveEdgesAndSlope — edge types from delta', () => {
  it('delta 0: removes slope/extremeSlope/verticalSlope from that edge', () => {
    const hex = {
      wedgeElevations: [0, 0, 0, 0, 0, 0],
      edges: { N: [{ type: 'slope' }] },
    };
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.N).toBeUndefined();
  });

  it('delta 1: sets slope on that edge', () => {
    const hex = { wedgeElevations: [1, 0, 0, 0, 0, 0] }; // index 0 = N
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.N).toEqual([{ type: 'slope' }]);
  });

  it('delta 2: sets extremeSlope on that edge', () => {
    const hex = { wedgeElevations: [0, 2, 0, 0, 0, 0] }; // index 1 = NE
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.NE).toEqual([{ type: 'extremeSlope' }]);
  });

  it('delta 3: sets verticalSlope on that edge', () => {
    const hex = { wedgeElevations: [0, 0, 3, 0, 0, 0] }; // index 2 = SE
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.SE).toEqual([{ type: 'verticalSlope' }]);
  });

  it('delta >= 3: sets verticalSlope (delta 5 case)', () => {
    const hex = { wedgeElevations: [0, 0, 0, 5, 0, 0] }; // index 3 = S
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.S).toEqual([{ type: 'verticalSlope' }]);
  });

  it('negative delta: uses abs value for edge type (delta -2 → extremeSlope)', () => {
    const hex = { wedgeElevations: [0, 0, 0, 0, -2, 0] }; // index 4 = SW
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.SW).toEqual([{ type: 'extremeSlope' }]);
  });

  it('does not overwrite non-elevation edge features', () => {
    const hex = {
      wedgeElevations: [0, 0, 0, 0, 0, 0],
      edges: { NW: [{ type: 'road' }, { type: 'slope' }] },
    };
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.NW).toEqual([{ type: 'road' }]); // road kept, slope removed
  });

  it('preserves non-elevation features while adding slope', () => {
    const hex = {
      wedgeElevations: [0, 0, 0, 0, 0, 1], // index 5 = NW, delta 1 → slope
      edges: { NW: [{ type: 'stream' }] },
    };
    const { edges } = deriveEdgesAndSlope(hex);
    expect(edges.NW).toContainEqual({ type: 'stream' });
    expect(edges.NW).toContainEqual({ type: 'slope' });
  });

  it('does not modify input hex object', () => {
    const hex = {
      wedgeElevations: [1, 0, 0, 0, 0, 0],
      edges: { N: [{ type: 'road' }] },
    };
    deriveEdgesAndSlope(hex);
    expect(hex.edges.N).toEqual([{ type: 'road' }]); // unchanged
  });
});

describe('deriveEdgesAndSlope — neighbor propagation helper', () => {
  // Test the logic that would be applied when propagating to a neighbor:
  // for hex A with wedgeElevations[i] = v, neighbor's wedge (i+3)%6 = v and same edge type rule
  it('opposite index formula: (i+3)%6 maps each side to its opposite', () => {
    // N(0) ↔ S(3), NE(1) ↔ SW(4), SE(2) ↔ NW(5)
    expect((0 + 3) % 6).toBe(3);
    expect((1 + 3) % 6).toBe(4);
    expect((2 + 3) % 6).toBe(5);
    expect((3 + 3) % 6).toBe(0);
    expect((4 + 3) % 6).toBe(1);
    expect((5 + 3) % 6).toBe(2);
  });

  it('neighbor gets same wedge value and matching edge type for delta 2', () => {
    // Simulating: hex A has wedgeElevations[1]=2 (NE edge → extremeSlope)
    // Neighbor should get wedgeElevations[(1+3)%6]=wedgeElevations[4]=2 (SW edge → extremeSlope)
    const neighborWedges = [0, 0, 0, 0, 2, 0]; // wedge 4 set to 2
    const neighborHex = { wedgeElevations: neighborWedges };
    const { edges } = deriveEdgesAndSlope(neighborHex);
    expect(edges.SW).toEqual([{ type: 'extremeSlope' }]);
  });

  it('neighbor edge type matches source hex edge type for verticalSlope', () => {
    const neighborWedges = [0, 0, 0, 3, 0, 0]; // wedge 3 = S, delta 3 → verticalSlope
    const { edges } = deriveEdgesAndSlope({ wedgeElevations: neighborWedges });
    expect(edges.S).toEqual([{ type: 'verticalSlope' }]);
  });
});
