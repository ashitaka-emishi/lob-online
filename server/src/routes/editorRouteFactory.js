import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Shared rate-limiter configuration for all editor routes.
 * Keep all five callers aligned; change this one function to update all.
 */
export function createEditorLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Creates an Express Router with GET /data and PUT /data handlers for a JSON
 * editor route. The PUT handler validates with the supplied Zod schema, rotates
 * backups, and writes the file with a `_savedAt` timestamp.
 *
 * **Prefix uniqueness:** `filePrefix` must be unique across all callers that
 * share the same `backupDir`. The backup-rotation filter matches files by
 * `${filePrefix}-*.json`, so overlapping prefixes (e.g. `"map"` and `"map-overlay"`)
 * will cause incorrect trimming.
 *
 * @param {object} opts
 * @param {import('zod').ZodTypeAny} opts.schema      - Zod schema for PUT body validation
 * @param {string}  opts.filePath                     - Absolute path to the JSON data file
 * @param {string}  opts.filePrefix                   - Unique prefix for backup filenames (e.g. 'oob')
 * @param {string}  opts.backupDir                    - Absolute path to the backup directory
 * @param {number}  [opts.maxBackups=20]              - Maximum number of backup files to keep
 */
export function createEditorRoute({ schema, filePath, filePrefix, backupDir, maxBackups = 20 }) {
  const router = Router();

  router.get('/data', async (_req, res) => {
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      res.json(data);
    } catch {
      res.status(500).json({ ok: false, message: `Failed to read ${filePrefix} data` });
    }
  });

  router.put('/data', async (req, res) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ ok: false, issues: result.error.issues });
    }

    await mkdir(backupDir, { recursive: true });

    let current = null;
    try {
      const raw = await readFile(filePath, 'utf8');
      if (raw) current = raw;
    } catch {
      /* file may not exist yet */
    }

    if (current !== null) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = join(backupDir, `${filePrefix}-${ts}.json`);
      try {
        await writeFile(backupPath, current);
      } catch {
        return res.status(500).json({ ok: false, message: 'Backup failed' });
      }

      try {
        const files = (await readdir(backupDir))
          .filter((f) => f.startsWith(`${filePrefix}-`) && f.endsWith('.json'))
          .sort();
        if (files.length > maxBackups) {
          const toDelete = files.slice(0, files.length - maxBackups);
          await Promise.all(toDelete.map((f) => unlink(join(backupDir, f))));
        }
      } catch {
        /* ignore trim errors */
      }
    }

    const savedAt = Date.now();
    const data = { ...result.data, _savedAt: savedAt };
    const tmpPath = filePath + '.tmp';
    try {
      await writeFile(tmpPath, JSON.stringify(data, null, 2));
      await rename(tmpPath, filePath);
    } catch {
      try {
        await unlink(tmpPath);
      } catch {
        /* .tmp may not exist if writeFile failed before creating it */
      }
      return res.status(500).json({ ok: false, message: 'Write failed' });
    }
    res.json({ ok: true, _savedAt: savedAt });
  });

  return router;
}
