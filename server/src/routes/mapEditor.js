import { Router } from 'express';

import { stripNonPlayableBoundaryEdges } from '../engine/edge-strip.js';
import { MapSchema } from '../schemas/map.schema.js';
import { resolveScenarioPath } from '../utils/scenarioFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via scenarioFolders so SM slug maps identically to south-mountain
const MAP_PATH = resolveScenarioPath('SM', 'map.json');
const BACKUP_DIR = resolveScenarioPath('SM', 'backups');

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: MapSchema,
    filePath: MAP_PATH,
    filePrefix: 'map',
    backupDir: BACKUP_DIR,
    // Strip non-playable boundary edges server-side, mirroring client beforeSave (#470 #492)
    transform: (data) => {
      if (data.hexes && data.gridSpec) {
        stripNonPlayableBoundaryEdges(data.hexes, data.gridSpec);
      }
      return data;
    },
  })
);

export default router;
