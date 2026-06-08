import { Router } from 'express';

import { OOBSchema } from '../schemas/oob.schema.js';
import { resolveScenarioPath } from '../utils/scenarioFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via scenarioFolders so SM slug maps identically to south-mountain
const OOB_PATH = resolveScenarioPath('SM', 'oob.json');
const BACKUP_DIR = resolveScenarioPath('SM', 'backups');

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: OOBSchema,
    filePath: OOB_PATH,
    filePrefix: 'oob',
    backupDir: BACKUP_DIR,
  })
);

export default router;
