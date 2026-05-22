import { Router } from 'express';

import { loadOob } from '../engine/oob.js';

const router = Router();

// GET /api/v1/oob — serve Order of Battle data for the active scenario.
// Not gated by MAP_EDITOR_ENABLED; required by GameView in production. (#431)
router.get('/', (_req, res) => {
  try {
    const data = loadOob();
    res.json(data);
  } catch (err) {
    console.error('[route] oob: failed to load data:', err);
    res.status(503).json({ error: 'OOB data unavailable' });
  }
});

export default router;
