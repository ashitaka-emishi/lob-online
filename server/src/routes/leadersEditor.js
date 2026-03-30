import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { LeadersSchema } from '../schemas/leaders.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const LEADERS_PATH = join(__dirname, '../../../data/scenarios/south-mountain/leaders.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');
const MAX_BACKUPS = 20;

const router = Router();

const leadersEditorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(leadersEditorLimiter);

router.get('/data', (_req, res) => {
  try {
    const data = JSON.parse(readFileSync(LEADERS_PATH, 'utf8'));
    res.json(data);
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to read leaders data' });
  }
});

router.put('/data', (req, res) => {
  const result = LeadersSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, issues: result.error.issues });
  }

  mkdirSync(BACKUP_DIR, { recursive: true });

  let current = null;
  try {
    const raw = readFileSync(LEADERS_PATH, 'utf8');
    if (raw) current = raw;
  } catch {
    /* file may not exist yet */
  }

  if (current !== null) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(BACKUP_DIR, `leaders-${ts}.json`);
    try {
      writeFileSync(backupPath, current);
    } catch {
      return res.status(500).json({ ok: false, message: 'Backup failed' });
    }

    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('leaders-') && f.endsWith('.json'))
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
  writeFileSync(LEADERS_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true, _savedAt: savedAt });
});

export default router;
