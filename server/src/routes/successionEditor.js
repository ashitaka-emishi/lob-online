import { Router } from 'express';

import { SuccessionSchema } from '../schemas/succession.schema.js';
import { resolveModulePath } from '../utils/moduleFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via moduleFolders so SM slug maps identically to south-mountain
const SUCCESSION_PATH = resolveModulePath('SM', 'succession.json');
const BACKUP_DIR = resolveModulePath('SM', 'backups');

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
