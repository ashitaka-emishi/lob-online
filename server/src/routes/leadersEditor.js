import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

import { LeadersSchema } from '../schemas/leaders.schema.js';
import { createEditorLimiter, createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const LEADERS_PATH = join(__dirname, '../../../data/scenarios/south-mountain/leaders.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

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
