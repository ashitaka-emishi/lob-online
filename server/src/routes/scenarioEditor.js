import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

import { ScenarioSchema } from '../schemas/scenario.schema.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCENARIO_PATH = join(__dirname, '../../../data/scenarios/south-mountain/scenario.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: ScenarioSchema,
    filePath: SCENARIO_PATH,
    filePrefix: 'scenario',
    backupDir: BACKUP_DIR,
  })
);

export default router;
