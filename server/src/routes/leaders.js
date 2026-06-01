import { Router } from 'express';

import { loadLeaders } from '../engine/oob.js';

const router = Router();

// GET /api/v1/leaders — serve leader data for the active scenario.
// Not gated by MAP_EDITOR_ENABLED; required by GameView for counter enrichment.
router.get('/', (_req, res) => {
  try {
    const data = loadLeaders();
    res.json(data);
  } catch (err) {
    console.error('[route] leaders: failed to load data:', err);
    res.status(503).json({ error: 'Leaders data unavailable' });
  }
});

export default router;
