import { hexNeighborInDir } from './hex.js';

// Canonical stored faces: 0=N, 1=NE, 2=SE (faces 3–5 resolve via the adjacent hex).
// NOTE: the client equivalent (client/src/formulas/edge-model.js) uses string direction
// names via adjacentHexId; this module uses numeric indices via hexNeighborInDir — the
// two APIs are functionally equivalent but not line-for-line mirrors. Any change to the
// playability predicate must be applied in both. A single shared module is the long-term
// fix; tracked in #492.
const CANONICAL_FACE_COUNT = 3; // faces 0, 1, 2

function isEdgeAtNonPlayableBoundary(hex, adjHex) {
  return hex?.playable === false || adjHex?.playable === false;
}

// Strip edges on canonical faces 0–2 that touch a non-playable hex boundary.
// Mutates hexes in place; returns the number of face entries removed. (#492 #470)
export function stripNonPlayableBoundaryEdges(hexes, gridSpec) {
  const hexMap = new Map(hexes.map((h) => [h.hex, h]));
  let stripped = 0;
  for (const hex of hexes) {
    if (!hex.edges) continue;
    for (let fi = 0; fi < CANONICAL_FACE_COUNT; fi++) {
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
