import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { MapSchema } from '../schemas/map.schema.js';
import { OOBSchema } from '../schemas/oob.schema.js';
import { ScenarioSchema } from '../schemas/scenario.schema.js';
import { LeadersSchema } from '../schemas/leaders.schema.js';
import { SuccessionSchema } from '../schemas/succession.schema.js';
import { MODULE_FOLDERS, DATA_ROOT } from '../utils/moduleFolders.js';
import { stripNonPlayableBoundaryEdges } from '../engine/edge-strip.js';
import { clearScenarioCache } from '../engine/scenario.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

const MAX_BACKUPS = 20;

// ── shared helpers ────────────────────────────────────────────────────────────

// Resolve the user-supplied moduleSlug to a trusted folder name from the
// allowlist. Returns null for unknown slugs — callers must check.
// This explicitly breaks the taint chain: only MODULE_FOLDERS values
// (compile-time constants) ever reach path construction.
function folderFromReq(req) {
  const slug = (req.params.moduleSlug ?? '').toUpperCase();
  return MODULE_FOLDERS[slug] ?? null;
}

// Build an absolute path using only the trusted folder value (not user input).
function moduleRootPath(folder) {
  return join(DATA_ROOT, folder);
}

function scenarioSlugFromReq(req) {
  return req.params.scenarioSlug ?? 'full-battle';
}

function isValidScenarioSlug(slug) {
  return /^[a-z0-9-]+$/i.test(slug);
}

async function readJson(folder, file, res) {
  const filePath = join(moduleRootPath(folder), file);
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8'));
    return res.json(data);
  } catch {
    return res.status(500).json({ error: `Failed to read ${file}` });
  }
}

async function writeJson(folder, file, filePrefix, schema, body, res, opts = {}) {
  const filePath = join(moduleRootPath(folder), file);

  const result = schema.safeParse(body);
  if (!result.success) return res.status(400).json({ ok: false, issues: result.error.issues });

  const validated = opts.transform ? opts.transform(result.data) : result.data;
  const backupDir = join(moduleRootPath(folder), 'backups');

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
      if (files.length > MAX_BACKUPS) {
        const toDelete = files.slice(0, files.length - MAX_BACKUPS);
        await Promise.all(toDelete.map((f) => unlink(join(backupDir, f))));
      }
    } catch {
      /* ignore trim errors */
    }
  }

  const savedAt = Date.now();
  const data = { ...validated, _savedAt: savedAt };
  const tmpPath = filePath + '.tmp';
  try {
    await writeFile(tmpPath, JSON.stringify(data, null, 2));
    await rename(tmpPath, filePath);
  } catch {
    try {
      await unlink(tmpPath);
    } catch {
      /* ignore */
    }
    return res.status(500).json({ ok: false, message: 'Write failed' });
  }

  try {
    opts.afterSave?.();
  } catch (err) {
    console.error('[moduleData] afterSave hook threw:', err.message);
  }

  return res.json({ ok: true, _savedAt: savedAt });
}

function notFound(res) {
  return res.status(404).json({ error: 'Unknown module slug' });
}

// ── map ───────────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/map', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? readJson(folder, 'map.json', res) : notFound(res);
});

router.put('/:moduleSlug/map', (req, res) => {
  const folder = folderFromReq(req);
  return folder
    ? writeJson(folder, 'map.json', 'map', MapSchema, req.body, res, {
        transform: (data) => {
          if (data.hexes && data.gridSpec) stripNonPlayableBoundaryEdges(data.hexes, data.gridSpec);
          return data;
        },
      })
    : notFound(res);
});

// ── oob ───────────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/oob', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? readJson(folder, 'oob.json', res) : notFound(res);
});

router.put('/:moduleSlug/oob', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? writeJson(folder, 'oob.json', 'oob', OOBSchema, req.body, res) : notFound(res);
});

// ── module metadata ───────────────────────────────────────────────────────────

router.get('/:moduleSlug/module', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? readJson(folder, 'module.json', res) : notFound(res);
});

// ── scenario start states ─────────────────────────────────────────────────────

router.get('/:moduleSlug/scenarios/:scenarioSlug/scenario', (req, res) => {
  const folder = folderFromReq(req);
  if (!folder) return notFound(res);
  const scenarioSlug = scenarioSlugFromReq(req);
  if (!isValidScenarioSlug(scenarioSlug))
    return res.status(404).json({ error: 'Unknown scenario slug' });
  return readJson(folder, join('scenarios', scenarioSlug, 'scenario.json'), res);
});

router.put('/:moduleSlug/scenarios/:scenarioSlug/scenario', (req, res) => {
  const folder = folderFromReq(req);
  if (!folder) return notFound(res);
  const scenarioSlug = scenarioSlugFromReq(req);
  if (!isValidScenarioSlug(scenarioSlug))
    return res.status(404).json({ error: 'Unknown scenario slug' });
  return writeJson(
    folder,
    join('scenarios', scenarioSlug, 'scenario.json'),
    'scenario',
    ScenarioSchema,
    req.body,
    res,
    {
      afterSave: clearScenarioCache,
    }
  );
});

router.get('/:moduleSlug/scenario', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? readJson(folder, 'scenarios/full-battle/scenario.json', res) : notFound(res);
});

router.put('/:moduleSlug/scenario', (req, res) => {
  const folder = folderFromReq(req);
  return folder
    ? writeJson(
        folder,
        'scenarios/full-battle/scenario.json',
        'scenario',
        ScenarioSchema,
        req.body,
        res,
        {
          afterSave: clearScenarioCache,
        }
      )
    : notFound(res);
});

// ── leaders ───────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/leaders', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? readJson(folder, 'leaders.json', res) : notFound(res);
});

router.put('/:moduleSlug/leaders', (req, res) => {
  const folder = folderFromReq(req);
  return folder
    ? writeJson(folder, 'leaders.json', 'leaders', LeadersSchema, req.body, res)
    : notFound(res);
});

// ── succession ────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/succession', (req, res) => {
  const folder = folderFromReq(req);
  return folder ? readJson(folder, 'succession.json', res) : notFound(res);
});

router.put('/:moduleSlug/succession', (req, res) => {
  const folder = folderFromReq(req);
  return folder
    ? writeJson(folder, 'succession.json', 'succession', SuccessionSchema, req.body, res)
    : notFound(res);
});

export default router;
