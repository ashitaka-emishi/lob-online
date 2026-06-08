import { Router } from 'express';

import { SuccessionSchema } from '../schemas/succession.schema.js';
import { resolveScenarioPath } from '../utils/scenarioFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via scenarioFolders so SM slug maps identically to south-mountain
const SUCCESSION_PATH = resolveScenarioPath('SM', 'succession.json');
const BACKUP_DIR = resolveScenarioPath('SM', 'backups');

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
