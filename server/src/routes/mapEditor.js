import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

import { hexNeighborInDir } from '../engine/hex.js';
import { MapSchema } from '../schemas/map.schema.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MAP_PATH = join(__dirname, '../../../data/scenarios/south-mountain/map.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

// Mirror of the client-side stripNonPlayableBoundaryEdges (#470).
// Runs server-side on every PUT /data so direct API callers get the same
// boundary-edge cleanup as the map editor client.
// Only canonical faces 0 (N), 1 (NE), 2 (SE) are stored per hex; faces 3–5
// resolve to the mirror face on the adjacent hex (see map.schema.js).
//
// NOTE: this function intentionally mirrors the predicate structure of the
// client-side isEdgeAtNonPlayableBoundary (client/src/formulas/edge-model.js).
// Any change to the playability rule must be made in both places. A shared
// engine module is the correct long-term home — tracked in tech-debt. (#470)

// Mirrors client/src/formulas/edge-model.js isEdgeAtNonPlayableBoundary.
function isEdgeAtNonPlayableBoundary(hex, adjHex) {
  return hex?.playable === false || adjHex?.playable === false;
}

function serverStripNonPlayableBoundaryEdges(hexes, gridSpec) {
  const hexMap = new Map(hexes.map((h) => [h.hex, h]));
  for (const hex of hexes) {
    if (!hex.edges) continue;
    for (let fi = 0; fi <= 2; fi++) {
      if (!hex.edges[fi] || hex.edges[fi].length === 0) continue;
      const adjId = hexNeighborInDir(hex.hex, fi, gridSpec);
      const adjHex = adjId ? hexMap.get(adjId) : null;
      if (isEdgeAtNonPlayableBoundary(hex, adjHex)) {
        delete hex.edges[fi];
      }
    }
    if (hex.edges && Object.keys(hex.edges).length === 0) {
      delete hex.edges;
    }
  }
}

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: MapSchema,
    filePath: MAP_PATH,
    filePrefix: 'map',
    backupDir: BACKUP_DIR,
    // Strip non-playable boundary edges server-side, mirroring client beforeSave (#470)
    transform: (data) => {
      if (data.hexes && data.gridSpec) {
        serverStripNonPlayableBoundaryEdges(data.hexes, data.gridSpec);
      }
      return data;
    },
  })
);

export default router;
