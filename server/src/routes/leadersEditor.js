import { Router } from 'express';

import { LeadersSchema } from '../schemas/leaders.schema.js';
import { resolveScenarioPath } from '../utils/scenarioFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via scenarioFolders so SM slug maps identically to south-mountain
const LEADERS_PATH = resolveScenarioPath('SM', 'leaders.json');
const BACKUP_DIR = resolveScenarioPath('SM', 'backups');

const router = Router();
router.use(createEditorLimiter());
router.use(
  createEditorRoute({
    schema: LeadersSchema,
    filePath: LEADERS_PATH,
    filePrefix: 'leaders',
    backupDir: BACKUP_DIR,
  })
);

export default router;
