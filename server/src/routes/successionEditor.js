import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

import { SuccessionSchema } from '../schemas/succession.schema.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SUCCESSION_PATH = join(__dirname, '../../../data/scenarios/south-mountain/succession.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: SuccessionSchema,
    filePath: SUCCESSION_PATH,
    filePrefix: 'succession',
    backupDir: BACKUP_DIR,
  })
);

export default router;
