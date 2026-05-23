import express from 'express';

import { loadMap } from '../engine/map.js';

const router = express.Router();

// Load static scenario map data once at module init so the route is synchronous.
let _mapData = null;
let _mapStartupError = null;
try {
  _mapData = loadMap();
} catch (err) {
  _mapStartupError = err;
  console.error('[route] scenarios: map data load failed at startup:', err.message);
}

// GET /api/v1/scenarios/:scenarioId/map-config — static scenario map data (gridSpec + hexes).
// No auth required: read-only scenario data identical for all players. (#421)
// Cache-Control: scenario data is scenario-static; safe to cache for 1 h. (#430)
router.get('/:scenarioId/map-config', (_req, res) => {
  if (_mapStartupError) return res.status(503).json({ error: 'Map data unavailable' });
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ gridSpec: _mapData.gridSpec, hexes: _mapData.hexes });
});

export default router;
