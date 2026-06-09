import { Router } from 'express';

import { stripNonPlayableBoundaryEdges } from '../engine/edge-strip.js';
import { MapSchema } from '../schemas/map.schema.js';
import { resolveModulePath } from '../utils/moduleFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via moduleFolders so SM slug maps identically to south-mountain
const MAP_PATH = resolveModulePath('SM', 'map.json');
const BACKUP_DIR = resolveModulePath('SM', 'backups');

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
