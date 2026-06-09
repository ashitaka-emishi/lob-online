import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { MapSchema } from '../schemas/map.schema.js';
import { OOBSchema } from '../schemas/oob.schema.js';
import { ScenarioSchema } from '../schemas/scenario.schema.js';
import { LeadersSchema } from '../schemas/leaders.schema.js';
import { SuccessionSchema } from '../schemas/succession.schema.js';
import { resolveModulePath, ModuleNotFoundError } from '../utils/moduleFolders.js';
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

function slugFromReq(req) {
  return (req.params.moduleSlug ?? '').toUpperCase();
}

function scenarioSlugFromReq(req) {
  return req.params.scenarioSlug ?? 'full-battle';
}

function isValidScenarioSlug(slug) {
  return /^[a-z0-9-]+$/i.test(slug);
}

async function readJson(slug, file, res) {
  let filePath;
  try {
    filePath = resolveModulePath(slug, file);
  } catch (err) {
    if (err instanceof ModuleNotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8'));
    return res.json(data);
  } catch {
    return res.status(500).json({ error: `Failed to read ${file}` });
  }
}

async function writeJson(slug, file, filePrefix, schema, body, res, opts = {}) {
  let filePath;
  try {
    filePath = resolveModulePath(slug, file);
  } catch (err) {
    if (err instanceof ModuleNotFoundError) return res.status(404).json({ error: err.message });
    throw err;
  }

  const result = schema.safeParse(body);
  if (!result.success) return res.status(400).json({ ok: false, issues: result.error.issues });

  const validated = opts.transform ? opts.transform(result.data) : result.data;
  const backupDir = resolveModulePath(slug, 'backups');

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

// ── map ───────────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/map', (req, res) => readJson(slugFromReq(req), 'map.json', res));

router.put('/:moduleSlug/map', (req, res) =>
  writeJson(slugFromReq(req), 'map.json', 'map', MapSchema, req.body, res, {
    transform: (data) => {
      if (data.hexes && data.gridSpec) stripNonPlayableBoundaryEdges(data.hexes, data.gridSpec);
      return data;
    },
  })
);

// ── oob ───────────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/oob', (req, res) => readJson(slugFromReq(req), 'oob.json', res));

router.put('/:moduleSlug/oob', (req, res) =>
  writeJson(slugFromReq(req), 'oob.json', 'oob', OOBSchema, req.body, res)
);

// ── module metadata ───────────────────────────────────────────────────────────

router.get('/:moduleSlug/module', (req, res) => readJson(slugFromReq(req), 'module.json', res));

// ── scenario start states ─────────────────────────────────────────────────────

router.get('/:moduleSlug/scenarios/:scenarioSlug/scenario', (req, res) =>
  isValidScenarioSlug(scenarioSlugFromReq(req))
    ? readJson(slugFromReq(req), join('scenarios', scenarioSlugFromReq(req), 'scenario.json'), res)
    : res.status(404).json({ error: 'Unknown scenario slug' })
);

router.put('/:moduleSlug/scenarios/:scenarioSlug/scenario', (req, res) =>
  isValidScenarioSlug(scenarioSlugFromReq(req))
    ? writeJson(
        slugFromReq(req),
        join('scenarios', scenarioSlugFromReq(req), 'scenario.json'),
        'scenario',
        ScenarioSchema,
        req.body,
        res,
        {
          afterSave: clearScenarioCache,
        }
      )
    : res.status(404).json({ error: 'Unknown scenario slug' })
);

router.get('/:moduleSlug/scenario', (req, res) =>
  readJson(slugFromReq(req), 'scenarios/full-battle/scenario.json', res)
);

router.put('/:moduleSlug/scenario', (req, res) =>
  writeJson(
    slugFromReq(req),
    'scenarios/full-battle/scenario.json',
    'scenario',
    ScenarioSchema,
    req.body,
    res,
    {
      afterSave: clearScenarioCache,
    }
  )
);

// ── leaders ───────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/leaders', (req, res) => readJson(slugFromReq(req), 'leaders.json', res));

router.put('/:moduleSlug/leaders', (req, res) =>
  writeJson(slugFromReq(req), 'leaders.json', 'leaders', LeadersSchema, req.body, res)
);

// ── succession ────────────────────────────────────────────────────────────────

router.get('/:moduleSlug/succession', (req, res) =>
  readJson(slugFromReq(req), 'succession.json', res)
);

router.put('/:moduleSlug/succession', (req, res) =>
  writeJson(slugFromReq(req), 'succession.json', 'succession', SuccessionSchema, req.body, res)
);

export default router;
