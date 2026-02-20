import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { MapSchema } from '../schemas/map.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MAP_PATH = join(__dirname, '../../../data/scenarios/south-mountain/map.json');

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
  writeFileSync(MAP_PATH, JSON.stringify(result.data, null, 2));
  res.json({ ok: true });
});

export default router;
