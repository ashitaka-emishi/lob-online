import { hexNeighborInDir } from './hex.js';

// Mirrors client/src/formulas/edge-model.js isEdgeAtNonPlayableBoundary.
// Any change to the playability rule must be made in both places. A shared
// module across server/client is the correct long-term solution. (#492)
function isEdgeAtNonPlayableBoundary(hex, adjHex) {
  return hex?.playable === false || adjHex?.playable === false;
}

// Strip edges on canonical faces 0–2 that touch a non-playable hex boundary.
// Mirrors the client-side stripNonPlayableBoundaryEdges in edge-model.js.
// Mutates hexes in place; returns the number of face entries removed. (#492 #470)
export function stripNonPlayableBoundaryEdges(hexes, gridSpec) {
  const hexMap = new Map(hexes.map((h) => [h.hex, h]));
  let stripped = 0;
  for (const hex of hexes) {
    if (!hex.edges) continue;
    for (let fi = 0; fi <= 2; fi++) {
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
