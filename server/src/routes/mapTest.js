/**
 * Map Test Tool routes — read-only endpoints for validating engine rules
 * against the digitized South Mountain map.
 *
 * Mounted at /api/tools/map-test when MAP_EDITOR_ENABLED=true.
 * All routes are GET, all pure-computation, no game state.
 */

import { Router } from 'express';

import { commandRange } from '../engine/command-range.js';
import { computeLOS } from '../engine/los.js';
import { buildHexIndex, loadMap, movementPath, movementRange } from '../engine/movement.js';
import { loadScenario } from '../engine/scenario.js';

// ─── Data loaded once at startup ──────────────────────────────────────────────

const mapData = loadMap();
const scenario = loadScenario();
const hexIndex = buildHexIndex(mapData);

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// ── GET /movement-path ────────────────────────────────────────────────────────
// Query: startHex, endHex, formation
// Returns: { path, costs, totalCost, impassable }
router.get('/movement-path', (req, res) => {
  const { startHex, endHex, formation } = req.query;
  if (!startHex || !endHex || !formation) {
    return res.status(400).json({ error: 'startHex, endHex, and formation are required' });
  }

  const result = movementPath(startHex, endHex, formation, scenario, mapData, hexIndex);
  return res.json(result);
});

// ── GET /movement-range ───────────────────────────────────────────────────────
// Query: hex, formation
// Returns: { reachable: [{ hex, cost }] }
router.get('/movement-range', (req, res) => {
  const { hex, formation } = req.query;
  if (!hex || !formation) {
    return res.status(400).json({ error: 'hex and formation are required' });
  }

  const reachable = movementRange(hex, formation, scenario, mapData, hexIndex);
  return res.json({ reachable });
});

// ── GET /hex-info ─────────────────────────────────────────────────────────────
// Query: hex
// Returns: { terrain, elevation, wedgeElevations, hexsides } from map data
router.get('/hex-info', (req, res) => {
  const { hex } = req.query;
  if (!hex) {
    return res.status(400).json({ error: 'hex is required' });
  }

  const hexEntry = hexIndex.get(hex);
  if (!hexEntry) {
    return res.status(404).json({ error: `Hex "${hex}" not found in map data` });
  }

  const { terrain, elevation, wedgeElevations, hexsides } = hexEntry;
  return res.json({ terrain, elevation, wedgeElevations, hexsides });
});

// ── GET /los ──────────────────────────────────────────────────────────────────
// Query: fromHex, toHex
// Returns: { canSee, blockedBy: { hex, reason } | null, trace: [hexId] }
router.get('/los', (req, res) => {
  const { fromHex, toHex } = req.query;
  if (!fromHex || !toHex) {
    return res.status(400).json({ error: 'fromHex and toHex are required' });
  }

  const result = computeLOS(fromHex, toHex, mapData, scenario);
  return res.json(result);
});

// ── GET /command-range ────────────────────────────────────────────────────────
// Query: hex, commanderLevel
// Returns: { withinRadius: [hexId], beyondRadius: [hexId], beyondRadiusFar: [hexId] }
router.get('/command-range', (req, res) => {
  const { hex, commanderLevel } = req.query;
  if (!hex || !commanderLevel) {
    return res.status(400).json({ error: 'hex and commanderLevel are required' });
  }

  const result = commandRange(hex, commanderLevel, mapData, scenario);
  return res.json(result);
});

export default router;
