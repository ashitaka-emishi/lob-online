import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { LeadersSchema } from '../schemas/leaders.schema.js';
import { createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const LEADERS_PATH = join(__dirname, '../../../data/scenarios/south-mountain/leaders.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

const router = Router();

const leadersEditorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(leadersEditorLimiter);
router.use(
  createEditorRoute({
    schema: LeadersSchema,
    filePath: LEADERS_PATH,
    filePrefix: 'leaders',
    backupDir: BACKUP_DIR,
  })
);

export default router;
