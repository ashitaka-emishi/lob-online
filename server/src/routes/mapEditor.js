import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { Router } from 'express';

import { MapSchema } from '../schemas/map.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MAP_PATH = join(__dirname, '../../../data/scenarios/south-mountain/map.json');
const BACKUP_DIR = join(__dirname, '../../../data/scenarios/south-mountain/backups');
const MAX_BACKUPS = 20;

const router = Router();

router.get('/data', (_req, res) => {
  const data = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
  res.json(data);
});

router.put('/data', (req, res) => {
  const result = MapSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, issues: result.error.issues });
  }

  mkdirSync(BACKUP_DIR, { recursive: true });

  // Read current file for backup
  let current = null;
  try {
    const raw = readFileSync(MAP_PATH, 'utf8');
    if (raw) current = raw;
  } catch {
    /* file may not exist yet */
  }

  if (current !== null) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(BACKUP_DIR, `map-${ts}.json`);
    try {
      writeFileSync(backupPath, current);
    } catch (err) {
      return res.status(500).json({ ok: false, message: `Backup failed: ${err.message}` });
    }

    // Trim to MAX_BACKUPS
    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('map-') && f.endsWith('.json'))
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
  writeFileSync(MAP_PATH, JSON.stringify(data, null, 2));
  res.json({ ok: true, _savedAt: savedAt });
});

export default router;
