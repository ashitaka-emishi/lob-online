import { Router } from 'express';

import { ScenarioSchema } from '../schemas/scenario.schema.js';
import { resolveScenarioPath } from '../utils/scenarioFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';
import { clearScenarioCache } from '../engine/scenario.js';

// #529 — paths now resolved via scenarioFolders so SM slug maps identically to south-mountain
const SCENARIO_PATH = resolveScenarioPath('SM', 'scenario.json');
const BACKUP_DIR = resolveScenarioPath('SM', 'backups');

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
