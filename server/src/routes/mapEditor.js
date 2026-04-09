import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

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
  })
);

export default router;
