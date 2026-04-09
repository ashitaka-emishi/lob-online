import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { OOBSchema } from '../schemas/oob.schema.js';
import { createEditorRoute } from './editorRouteFactory.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OOB_PATH = join(__dirname, '../../../data/scenarios/south-mountain/oob.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');

const router = Router();

const oobEditorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(oobEditorLimiter);
router.use(
  createEditorRoute({
    schema: OOBSchema,
    filePath: OOB_PATH,
    filePrefix: 'oob',
    backupDir: BACKUP_DIR,
  })
);

export default router;
