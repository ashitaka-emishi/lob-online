import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { SuccessionSchema } from '../schemas/succession.schema.js';
import { createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SUCCESSION_PATH = join(__dirname, '../../../data/scenarios/south-mountain/succession.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

const router = Router();

const successionEditorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(successionEditorLimiter);
router.use(
  createEditorRoute({
    schema: SuccessionSchema,
    filePath: SUCCESSION_PATH,
    filePrefix: 'succession',
    backupDir: BACKUP_DIR,
  })
);

export default router;
