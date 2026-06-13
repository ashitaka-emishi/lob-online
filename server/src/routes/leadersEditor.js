import { Router } from 'express';

import { LeadersSchema } from '../schemas/leaders.schema.js';
import { resolveModulePath } from '../utils/moduleFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via moduleFolders so SM slug maps identically to south-mountain
const LEADERS_PATH = resolveModulePath('SM', 'leaders.json');
const BACKUP_DIR = resolveModulePath('SM', 'backups');

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
