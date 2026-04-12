/**
 * Map Test Tool routes — read-only endpoints for validating engine rules
 * against the digitized South Mountain map.
 *
 * Mounted at /api/tools/map-test when MAP_EDITOR_ENABLED=true.
 * All routes are GET, all pure-computation, no game state.
 */

import { Router } from 'express';

import { commandRange, COMMAND_RADII } from '../engine/command-range.js';
import { computeLOS } from '../engine/los.js';
import { buildHexIndex, loadMap, movementPath, movementRange } from '../engine/movement.js';
import { loadScenario } from '../engine/scenario.js';

// ─── Allowlists for enum parameters ───────────────────────────────────────────

const VALID_FORMATIONS = new Set([
  'line',
  'column',
  'mounted',
  'limbered',
  'horseArtillery',
  'wagon',
  'leader',
]);

const VALID_COMMANDER_LEVELS = new Set(Object.keys(COMMAND_RADII));

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
  if (!VALID_FORMATIONS.has(formation)) {
    return res
      .status(400)
      .json({ error: `Invalid formation. Valid values: ${[...VALID_FORMATIONS].join(', ')}` });
  }

  try {
    const result = movementPath(startHex, endHex, formation, scenario, mapData, hexIndex);
    return res.json(result);
  } catch (err) {
    console.error('[route] /movement-path error:', err);
    return res.status(500).json({ error: 'Failed to compute movement path' });
  }
});

// ── GET /movement-range ───────────────────────────────────────────────────────
// Query: hex, formation
// Returns: { reachable: [{ hex, cost }] }
router.get('/movement-range', (req, res) => {
  const { hex, formation } = req.query;
  if (!hex || !formation) {
    return res.status(400).json({ error: 'hex and formation are required' });
  }
  if (!VALID_FORMATIONS.has(formation)) {
    return res
      .status(400)
      .json({ error: `Invalid formation. Valid values: ${[...VALID_FORMATIONS].join(', ')}` });
  }

  try {
    const reachable = movementRange(hex, formation, scenario, mapData, hexIndex);
    return res.json({ reachable });
  } catch (err) {
    console.error('[route] /movement-range error:', err);
    return res.status(500).json({ error: 'Failed to compute movement range' });
  }
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
    return res.status(404).json({ error: 'Hex not found in map data' });
  }

  try {
    const { terrain, elevation, wedgeElevations, hexsides } = hexEntry;
    return res.json({ terrain, elevation, wedgeElevations, hexsides });
  } catch (err) {
    console.error('[route] /hex-info error:', err);
    return res.status(500).json({ error: 'Failed to retrieve hex info' });
  }
});

// ── GET /los ──────────────────────────────────────────────────────────────────
// Query: fromHex, toHex
// Returns: { canSee, blockedBy: { hex, reason } | null, trace: [hexId] }
router.get('/los', (req, res) => {
  const { fromHex, toHex } = req.query;
  if (!fromHex || !toHex) {
    return res.status(400).json({ error: 'fromHex and toHex are required' });
  }

  try {
    const result = computeLOS(fromHex, toHex, mapData, scenario);
    return res.json(result);
  } catch (err) {
    console.error('[route] /los error:', err);
    return res.status(500).json({ error: 'Failed to compute LOS' });
  }
});

// ── GET /command-range ────────────────────────────────────────────────────────
// Query: hex, commanderLevel
// Returns: { withinRadius: [hexId], beyondRadius: [hexId], beyondRadiusFar: [hexId] }
router.get('/command-range', (req, res) => {
  const { hex, commanderLevel } = req.query;
  if (!hex || !commanderLevel) {
    return res.status(400).json({ error: 'hex and commanderLevel are required' });
  }
  if (!VALID_COMMANDER_LEVELS.has(commanderLevel)) {
    return res.status(400).json({
      error: `Invalid commanderLevel. Valid values: ${[...VALID_COMMANDER_LEVELS].join(', ')}`,
    });
  }

  try {
    const result = commandRange(hex, commanderLevel, mapData, scenario, hexIndex);
    return res.json(result);
  } catch (err) {
    console.error('[route] /command-range error:', err);
    return res.status(500).json({ error: 'Failed to compute command range' });
  }
});

export default router;
