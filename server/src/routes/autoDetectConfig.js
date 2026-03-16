import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { AutoDetectConfigSchema } from '../schemas/map-autodetect-config.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONFIG_PATH = join(
  __dirname,
  '../../../data/scenarios/south-mountain/map-autodetect-config.json'
);
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups/autodetect');
const MAX_BACKUPS = 20;

const router = Router();

const autoDetectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(autoDetectLimiter);

router.get('/data', (_req, res) => {
  const data = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  res.json(data);
});

router.put('/data', (req, res) => {
  const result = AutoDetectConfigSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, issues: result.error.issues });
  }

  mkdirSync(BACKUP_DIR, { recursive: true });

  let current = null;
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    if (raw) current = raw;
  } catch {
    /* file may not exist yet */
  }

  if (current !== null) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(BACKUP_DIR, `autodetect-${ts}.json`);
    try {
      writeFileSync(backupPath, current);
    } catch (err) {
      return res.status(500).json({ ok: false, message: `Backup failed: ${err.message}` });
    }

    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('autodetect-') && f.endsWith('.json'))
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
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true, _savedAt: savedAt });
});

export default router;
