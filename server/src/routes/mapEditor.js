import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

import { stripNonPlayableBoundaryEdges } from '../engine/edge-strip.js';
import { MapSchema } from '../schemas/map.schema.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MAP_PATH = join(__dirname, '../../../data/scenarios/south-mountain/map.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

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
