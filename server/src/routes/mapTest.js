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
import { buildHexIndex, loadMap } from '../engine/map.js';
import { movementPath, movementRange } from '../engine/movement.js';
import { loadScenario } from '../engine/scenario.js';

// ─── Hex-ID format validation (#302) ──────────────────────────────────────────

// LOB — canonical hex ID format is "CC.RR" (e.g. "19.23"), matching HexId in scenario.schema.js
const HEX_ID_PATTERN = /^\d+\.\d+$/;

/**
 * Return true when `id` matches the canonical hex-ID format ("col.row").
 * Returns false for empty strings, non-numeric segments, or missing dot.
 *
 * @param {string} id
 * @returns {boolean}
 */
function isValidHexId(id) {
  return typeof id === 'string' && HEX_ID_PATTERN.test(id);
}

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
// Wrapped in try/catch (#304) so a data-load failure surfaces as a request-time
// 500 rather than an unhandled throw that crashes the server with no HTTP path.

let mapData, scenario, hexIndex, _startupError;
try {
  mapData = loadMap();
  scenario = loadScenario();
  hexIndex = buildHexIndex(mapData);
} catch (err) {
  console.error('[route] map-test: data load failed at startup:', err);
  _startupError = true; // boolean flag; full error already logged above
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// Guard: return 500 on all routes if startup data load failed (#304)
router.use((_req, res, next) => {
  if (_startupError) {
    return res.status(500).json({ error: 'Map data failed to load at startup' });
  }
  next();
});

// ── GET /data ─────────────────────────────────────────────────────────────────
// Returns map data (hexes, gridSpec, elevationSystem) for client tools.
// Dedicated endpoint for map-test tool — decoupled from map-editor (#303).
router.get('/data', (_req, res) => {
  try {
    return res.json(mapData);
  } catch (err) {
    console.error('[route] /map-test/data error:', err);
    return res.status(500).json({ error: 'Failed to load map data' });
  }
});

// ── GET /movement-path ────────────────────────────────────────────────────────
// Query: startHex, endHex, formation
// Returns: { path, costs, totalCost, impassable }
router.get('/movement-path', (req, res) => {
  const { startHex, endHex, formation } = req.query;
  if (!startHex || !endHex || !formation) {
    return res.status(400).json({ error: 'startHex, endHex, and formation are required' });
  }
  // LOB — validate hex-ID format before engine calls (#302)
  if (!isValidHexId(startHex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for startHex' });
  }
  if (!isValidHexId(endHex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for endHex' });
  }
  if (!VALID_FORMATIONS.has(formation)) {
    return res
      .status(400)
      .json({ error: `Invalid formation. Valid values: ${[...VALID_FORMATIONS].join(', ')}` });
  }
  if (!hexIndex.has(startHex)) {
    return res.status(400).json({ error: 'startHex not found in map data' });
  }
  if (!hexIndex.has(endHex)) {
    return res.status(400).json({ error: 'endHex not found in map data' });
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
  // LOB — validate hex-ID format before engine calls (#302)
  if (!isValidHexId(hex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for hex' });
  }
  if (!VALID_FORMATIONS.has(formation)) {
    return res
      .status(400)
      .json({ error: `Invalid formation. Valid values: ${[...VALID_FORMATIONS].join(', ')}` });
  }
  if (!hexIndex.has(hex)) {
    return res.status(400).json({ error: 'hex not found in map data' });
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
  // LOB — validate hex-ID format before engine calls (#302)
  if (!isValidHexId(hex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for hex' });
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
  // LOB — validate hex-ID format before engine calls (#302)
  if (!isValidHexId(fromHex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for fromHex' });
  }
  if (!isValidHexId(toHex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for toHex' });
  }
  if (!hexIndex.has(fromHex)) {
    return res.status(400).json({ error: 'fromHex not found in map data' });
  }
  if (!hexIndex.has(toHex)) {
    return res.status(400).json({ error: 'toHex not found in map data' });
  }

  try {
    const result = computeLOS(fromHex, toHex, scenario, mapData, hexIndex);
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
  // LOB — validate hex-ID format before engine calls (#302)
  if (!isValidHexId(hex)) {
    return res.status(400).json({ error: 'Invalid hex ID format for hex' });
  }
  if (!VALID_COMMANDER_LEVELS.has(commanderLevel)) {
    return res.status(400).json({
      error: `Invalid commanderLevel. Valid values: ${[...VALID_COMMANDER_LEVELS].join(', ')}`,
    });
  }
  if (!hexIndex.has(hex)) {
    return res.status(400).json({ error: 'hex not found in map data' });
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
