import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { OOBSchema } from '../schemas/oob.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OOB_PATH = join(__dirname, '../../../data/scenarios/south-mountain/oob.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');
const MAX_BACKUPS = 20;

const router = Router();

const oobEditorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(oobEditorLimiter);

router.get('/data', (_req, res) => {
  const data = JSON.parse(readFileSync(OOB_PATH, 'utf8'));
  res.json(data);
});

router.put('/data', (req, res) => {
  const result = OOBSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, issues: result.error.issues });
  }

  mkdirSync(BACKUP_DIR, { recursive: true });

  let current = null;
  try {
    const raw = readFileSync(OOB_PATH, 'utf8');
    if (raw) current = raw;
  } catch {
    /* file may not exist yet */
  }

  if (current !== null) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(BACKUP_DIR, `oob-${ts}.json`);
    try {
      writeFileSync(backupPath, current);
    } catch (err) {
      return res.status(500).json({ ok: false, message: `Backup failed: ${err.message}` });
    }

    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('oob-') && f.endsWith('.json'))
        .sort();
      if (files.length > MAX_BACKUPS) {
        for (const f of files.slice(0, files.length - MAX_BACKUPS)) {
          unlinkSync(join(BACKUP_DIR, f));
        }
      }
    } catch {
      /* ignore trim errors */
    }
  }

  const savedAt = Date.now();
  const data = { ...result.data, _savedAt: savedAt };
  writeFileSync(OOB_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true, _savedAt: savedAt });
});

export default router;
