import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';

import { Router } from 'express';

/**
 * Creates an Express Router with GET /data and PUT /data handlers for a JSON
 * editor route. The PUT handler validates with the supplied Zod schema, rotates
 * backups, and writes the file atomically with a `_savedAt` timestamp.
 *
 * @param {object} opts
 * @param {import('zod').ZodTypeAny} opts.schema      - Zod schema for PUT body validation
 * @param {string}  opts.filePath                     - Absolute path to the JSON data file
 * @param {string}  opts.filePrefix                   - Prefix used for backup filenames (e.g. 'oob')
 * @param {string}  opts.backupDir                    - Absolute path to the backup directory
 * @param {number}  [opts.maxBackups=20]              - Maximum number of backup files to keep
 * @param {string}  [opts.readErrorMessage]           - Custom 500 message on GET failure
 */
export function createEditorRoute({
  schema,
  filePath,
  filePrefix,
  backupDir,
  maxBackups = 20,
  readErrorMessage,
}) {
  const router = Router();

  router.get('/data', async (_req, res) => {
    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      res.json(data);
    } catch {
      res
        .status(500)
        .json({ ok: false, message: readErrorMessage ?? `Failed to read ${filePrefix} data` });
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
          for (const f of files.slice(0, files.length - maxBackups)) {
            await unlink(join(backupDir, f));
          }
        }
      } catch {
        /* ignore trim errors */
      }
    }

    const savedAt = Date.now();
    const data = { ...result.data, _savedAt: savedAt };
    try {
      await writeFile(filePath, JSON.stringify(data, null, 2));
    } catch {
      return res.status(500).json({ ok: false, message: 'Write failed' });
    }
    res.json({ ok: true, _savedAt: savedAt });
  });

  return router;
}
