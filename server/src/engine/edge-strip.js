import { hexNeighborInDir } from './hex.js';

// Stored faces: 0=N, 1=NE, 2=SE are canonical (mirror faces 3-5 resolve via the adjacent
// hex for interior hexes). Faces 3-5 are also checked here because map-boundary hexes store
// them directly on themselves (map.schema.js validateBoundaryMirrorFaces, #689) — for those,
// hexNeighborInDir returns null, so adjHex is null and only this hex's own playability applies.
// NOTE: the client equivalent (client/src/formulas/edge-model.js) uses string direction
// names via adjacentHexId; this module uses numeric indices via hexNeighborInDir — the
// two APIs are functionally equivalent but not line-for-line mirrors. Any change to the
// playability predicate must be applied in both. A single shared module is the long-term
// fix; tracked in #492.
const FACE_COUNT = 6; // faces 0-5

function isEdgeAtNonPlayableBoundary(hex, adjHex) {
  return hex?.playable === false || adjHex?.playable === false;
}

// Strip edges on faces 0-5 that touch a non-playable hex boundary (faces 0-2 via the
// adjacent hex; boundary-owned faces 3-5 via this hex's own playability).
// Mutates hexes in place; returns the number of face entries removed. (#492 #470 #689)
export function stripNonPlayableBoundaryEdges(hexes, gridSpec) {
  const hexMap = new Map(hexes.map((h) => [h.hex, h]));
  let stripped = 0;
  for (const hex of hexes) {
    if (!hex.edges) continue;
    for (let fi = 0; fi < FACE_COUNT; fi++) {
      if (!hex.edges[fi] || hex.edges[fi].length === 0) continue;
      const adjId = hexNeighborInDir(hex.hex, fi, gridSpec);
      const adjHex = adjId ? hexMap.get(adjId) : null;
      if (isEdgeAtNonPlayableBoundary(hex, adjHex)) {
        delete hex.edges[fi];
        stripped++;
      }
    }
    if (hex.edges && Object.keys(hex.edges).length === 0) {
      delete hex.edges;
    }
  }
  return stripped;
}
