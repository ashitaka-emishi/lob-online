import { Router } from 'express';

import { ScenarioSchema } from '../schemas/scenario.schema.js';
import { resolveModulePath } from '../utils/moduleFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';
import { clearScenarioCache } from '../engine/scenario.js';

// #529 — legacy flat editor endpoint edits SM's default scenario start state.
const SCENARIO_PATH = resolveModulePath('SM', 'scenarios/full-battle/scenario.json');
const BACKUP_DIR = resolveModulePath('SM', 'backups');

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: ScenarioSchema,
    filePath: SCENARIO_PATH,
    filePrefix: 'scenario',
    backupDir: BACKUP_DIR,
    afterSave: clearScenarioCache,
  })
);

export default router;
