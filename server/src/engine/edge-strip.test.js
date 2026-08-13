import { describe, it, expect } from 'vitest';

import { stripNonPlayableBoundaryEdges } from './edge-strip.js';
import { stripNonPlayableBoundaryEdges as clientStrip } from '../../../client/src/formulas/edge-model.js';

// Minimal synthetic gridSpec (flat-top, EVEN_Q, 5-col offset) — not the real SM map
// (SM is 63x35, see data/modules/south-mountain/map.json, #691). Deliberately not coupled
// to production data; these tests only exercise adjacency around column 5 (odd).
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

  // ── Boundary-owned faces 3-5 (#689) ──────────────────────────────────────────
  // 01.01 is a genuine grid-corner hex in this GRID_SPEC (cols:64, rows:35) — faces 3, 4,
  // and 5 have no neighbour, so per map.schema.js's validateBoundaryMirrorFaces they are
  // stored directly on this hex, not mirrored onto a neighbour.

  it('strips boundary-owned face 3 (S) when the hex itself is non-playable', () => {
    const hexes = [{ hex: '01.01', playable: false, edges: { 3: [{ type: 'stream' }] } }];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(1);
    expect(hexes[0].edges).toBeUndefined();
  });

  it('preserves boundary-owned faces 3-5 when the hex is playable', () => {
    const hexes = [
      {
        hex: '01.01',
        edges: { 3: [{ type: 'stream' }], 4: [{ type: 'road' }], 5: [{ type: 'elevation' }] },
      },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(0);
    expect(hexes[0].edges[3]).toEqual([{ type: 'stream' }]);
    expect(hexes[0].edges[4]).toEqual([{ type: 'road' }]);
    expect(hexes[0].edges[5]).toEqual([{ type: 'elevation' }]);
  });

  it('strips a mix of canonical and boundary-owned faces in one pass', () => {
    const hexes = [
      {
        hex: '01.01',
        playable: false,
        edges: { 0: [{ type: 'road' }], 3: [{ type: 'stream' }] },
      },
    ];
    const count = stripNonPlayableBoundaryEdges(hexes, GRID_SPEC);
    expect(count).toBe(2);
    expect(hexes[0].edges).toBeUndefined();
  });
});

// ── Cross-implementation parity (#504) ────────────────────────────────────────
// Server (engine/edge-strip.js) uses hexNeighborInDir with numeric face indices.
// Client (formulas/edge-model.js) uses adjacentHexId with direction strings.
// Both must produce identical hex-array mutations for all canonical faces (0–2).
//
// Return-value contract: the server returns a numeric stripped count; the client
// returns undefined. These are intentionally different — parity is mutation-only.

describe('stripNonPlayableBoundaryEdges — server/client parity (#504)', () => {
  function makeFixture() {
    return [
      {
        hex: '05.05',
        edges: {
          0: [{ type: 'road' }],
          1: [{ type: 'stream' }],
          2: [{ type: 'road' }],
        },
      },
      { hex: '05.06', playable: false }, // N neighbor → face 0 stripped
      { hex: '06.05' }, // NE neighbor (playable) → face 1 preserved
      { hex: '06.04' }, // SE neighbor (playable) → face 2 preserved
    ];
  }

  it('server and client produce identical mutations on a mixed fixture (odd column)', () => {
    const serverHexes = makeFixture();
    const clientHexes = makeFixture();

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    const clientReturn = clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    // Return-value contracts differ by design: server=count, client=undefined
    expect(serverCount).toBe(1);
    expect(clientReturn).toBeUndefined();
  });

  it('both strip all faces when hex is non-playable', () => {
    const serverHexes = [
      { hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }], 1: [{ type: 'stream' }] } },
    ];
    const clientHexes = [
      { hex: '05.05', playable: false, edges: { 0: [{ type: 'road' }], 1: [{ type: 'stream' }] } },
    ];

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    expect(serverHexes[0].edges).toBeUndefined();
    expect(serverCount).toBe(2);
  });

  it('both preserve edges between two playable hexes', () => {
    const serverHexes = [{ hex: '05.05', edges: { 0: [{ type: 'road' }] } }, { hex: '05.06' }];
    const clientHexes = [{ hex: '05.05', edges: { 0: [{ type: 'road' }] } }, { hex: '05.06' }];

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    expect(serverHexes[0].edges[0]).toEqual([{ type: 'road' }]);
    expect(serverCount).toBe(0);
  });

  it('both strip boundary-owned face 3 identically when the hex itself is non-playable (#689)', () => {
    const serverHexes = [{ hex: '01.01', playable: false, edges: { 3: [{ type: 'stream' }] } }];
    const clientHexes = [{ hex: '01.01', playable: false, edges: { 3: [{ type: 'stream' }] } }];

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    expect(serverHexes[0].edges).toBeUndefined();
    expect(serverCount).toBe(1);
  });

  // Even-column tests: EVEN_Q offset shifts NE/SE neighbors differently for even columns.
  // This is the exact divergence class the two neighbor functions could disagree on.
  // NE neighbor of 06.05 (even col) is 07.06; SE neighbor is 07.05.

  it('server and client produce identical mutations on even-column face-1 (NE) strip', () => {
    // NE of 06.05 in EVEN_Q is 07.06
    const serverHexes = [
      { hex: '06.05', edges: { 1: [{ type: 'road' }] } },
      { hex: '07.06', playable: false },
    ];
    const clientHexes = [
      { hex: '06.05', edges: { 1: [{ type: 'road' }] } },
      { hex: '07.06', playable: false },
    ];

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    expect(serverHexes[0].edges).toBeUndefined();
    expect(serverCount).toBe(1);
  });

  it('server and client produce identical mutations on even-column face-2 (SE) strip', () => {
    // SE of 06.05 in EVEN_Q is 07.05
    const serverHexes = [
      { hex: '06.05', edges: { 2: [{ type: 'stream' }] } },
      { hex: '07.05', playable: false },
    ];
    const clientHexes = [
      { hex: '06.05', edges: { 2: [{ type: 'stream' }] } },
      { hex: '07.05', playable: false },
    ];

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    expect(serverHexes[0].edges).toBeUndefined();
    expect(serverCount).toBe(1);
  });

  it('server and client both preserve even-column edges when neighbors are playable', () => {
    const serverHexes = [
      { hex: '06.05', edges: { 1: [{ type: 'road' }], 2: [{ type: 'stream' }] } },
      { hex: '07.06' }, // NE — playable
      { hex: '07.05' }, // SE — playable
    ];
    const clientHexes = [
      { hex: '06.05', edges: { 1: [{ type: 'road' }], 2: [{ type: 'stream' }] } },
      { hex: '07.06' },
      { hex: '07.05' },
    ];

    const serverCount = stripNonPlayableBoundaryEdges(serverHexes, GRID_SPEC);
    clientStrip(clientHexes, GRID_SPEC);

    expect(serverHexes).toEqual(clientHexes);
    expect(serverHexes[0].edges[1]).toEqual([{ type: 'road' }]);
    expect(serverHexes[0].edges[2]).toEqual([{ type: 'stream' }]);
    expect(serverCount).toBe(0);
  });
});
