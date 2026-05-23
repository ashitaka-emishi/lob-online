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

// Known digitized scenarios — 404 on anything else to prevent cache confusion
// when multi-scenario support lands. TODO(multi-scenario): dispatch on scenarioId here.
const SUPPORTED_SCENARIOS = new Set(['south-mountain']);

// GET /api/v1/scenarios/:scenarioId/map-config — static scenario map data (gridSpec + hexes).
// No auth required: read-only scenario data identical for all players. (#421)
// Cache-Control: scenario data is scenario-static; safe to cache for 1 h. (#430)
router.get('/:scenarioId/map-config', (req, res) => {
  if (!SUPPORTED_SCENARIOS.has(req.params.scenarioId)) {
    return res.status(404).json({ error: 'Unknown scenario' });
  }
  if (_mapStartupError) return res.status(503).json({ error: 'Map data unavailable' });
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ gridSpec: _mapData.gridSpec, hexes: _mapData.hexes });
});

export default router;
