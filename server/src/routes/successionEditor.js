import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { SuccessionSchema } from '../schemas/succession.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SUCCESSION_PATH = join(__dirname, '../../../data/scenarios/south-mountain/succession.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');
const MAX_BACKUPS = 20;

const router = Router();

const successionEditorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(successionEditorLimiter);

router.get('/data', async (_req, res) => {
  try {
    const data = JSON.parse(await readFile(SUCCESSION_PATH, 'utf8'));
    res.json(data);
  } catch {
    res.status(500).json({ ok: false, message: 'Failed to read succession data' });
  }
});

router.put('/data', async (req, res) => {
  const result = SuccessionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, issues: result.error.issues });
  }

  await mkdir(BACKUP_DIR, { recursive: true });

  let current = null;
  try {
    const raw = await readFile(SUCCESSION_PATH, 'utf8');
    if (raw) current = raw;
  } catch {
    /* file may not exist yet */
  }

  if (current !== null) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(BACKUP_DIR, `succession-${ts}.json`);
    try {
      await writeFile(backupPath, current);
    } catch {
      return res.status(500).json({ ok: false, message: 'Backup failed' });
    }

    try {
      const files = (await readdir(BACKUP_DIR))
        .filter((f) => f.startsWith('succession-') && f.endsWith('.json'))
        .sort();
      if (files.length > MAX_BACKUPS) {
        for (const f of files.slice(0, files.length - MAX_BACKUPS)) {
          await unlink(join(BACKUP_DIR, f));
        }
      }
    } catch {
      /* ignore trim errors */
    }
  }

  const savedAt = Date.now();
  const data = { ...result.data, _savedAt: savedAt };
  await writeFile(SUCCESSION_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true, _savedAt: savedAt });
});

export default router;
