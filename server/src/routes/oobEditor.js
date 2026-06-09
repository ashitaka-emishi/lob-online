import { Router } from 'express';

import { OOBSchema } from '../schemas/oob.schema.js';
import { resolveModulePath } from '../utils/moduleFolders.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

// #529 — paths now resolved via moduleFolders so SM slug maps identically to south-mountain
const OOB_PATH = resolveModulePath('SM', 'oob.json');
const BACKUP_DIR = resolveModulePath('SM', 'backups');

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
