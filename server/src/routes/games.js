import { randomUUID } from 'node:crypto';

import express from 'express';

import { requireSide } from '../auth/requireSide.js';
import { getPlayerSession, setPlayerSession } from '../auth/session.js';
import { initGameState } from '../engine/init.js';
import { loadMap } from '../engine/map.js';
import { getScenario } from '../engine/scenario.js';
import {
  createGame,
  deleteGame,
  deleteGameFile,
  GameNotFoundError,
  GameNotOpenError,
  getGame,
  InvalidTokenError,
  joinGame,
  listGames,
  loadGame,
  saveGame,
} from '../store/index.js';
import { SIDES } from '../util/sides.js';
import { UUID_RE } from '../util/uuid.js';

// Promisify session.regenerate — prevents session fixation by rotating the session ID
// before writing new identity. (#411)
function regenerateSession(req) {
  return new Promise((resolve, reject) =>
    req.session.regenerate((e) => (e ? reject(e) : resolve()))
  );
}

const router = express.Router();

// Map data is static for the scenario — load once at module init so /map-config is synchronous.
let _mapData = null;
let _mapStartupError = null;
try {
  _mapData = loadMap();
} catch (err) {
  _mapStartupError = err;
  console.error('[route] games: map data load failed at startup:', err.message);
}

// Validate :id is a UUID — prevents path traversal into gameFile storage
router.param('id', (req, res, next, id) => {
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid game id' });
  next();
});

// POST /api/v1/games — create a new game, assign creator as confederate (CSA)
router.post('/', async (req, res) => {
  try {
    const id = randomUUID();
    const scenario = getScenario();
    const state = initGameState(scenario, id);

    // SQLite row first: a failed INSERT leaves no filesystem side-effect (#ARCH-H4)
    const sideToken = randomUUID();
    createGame(id, sideToken);
    await saveGame(id, state);

    // Rotate session id before writing identity — prevents session fixation (#SEC-M1)
    await regenerateSession(req);
    setPlayerSession(req, id, SIDES.CONFEDERATE, sideToken);

    res.status(201).json({ id, side: SIDES.CONFEDERATE });
  } catch (err) {
    console.error('[route] POST /games error:', err.message);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// POST /api/v1/games/:id/join — second player joins; side must be specified in body
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { side } = req.body;

    // Validate explicit side choice
    if (side !== SIDES.UNION && side !== SIDES.CONFEDERATE) {
      return res.status(400).json({ error: 'side must be "union" or "confederate"' });
    }

    const existingSession = getPlayerSession(req);

    // ARCH-H2: same-game re-join updates side and re-enters without calling joinGame again.
    // Scaffolded behavior: allows side-switching for dev/testing; full enforcement deferred.
    // Game-switching (different gameId) overwrites the session normally. Policy in #349.
    if (existingSession?.gameId === id) {
      await regenerateSession(req);
      setPlayerSession(req, id, side, existingSession.sideToken);
      return res.json({ id, side });
    }

    const sideToken = randomUUID();

    // joinGame is atomic — no pre-check needed; typed errors map to 404/409 (#PERF-H1, #ARCH-M2)
    joinGame(id, sideToken);

    // Rotate session id before writing identity — prevents session fixation (#SEC-M1)
    await regenerateSession(req);
    setPlayerSession(req, id, side, sideToken);

    res.json({ id, side });
  } catch (err) {
    if (err instanceof GameNotFoundError) return res.status(404).json({ error: 'Game not found' });
    if (err instanceof GameNotOpenError)
      return res.status(409).json({ error: 'Game is already full' });
    if (err instanceof InvalidTokenError) return res.status(400).json({ error: err.message });
    console.error('[route] POST /games/:id/join error:', err.message);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// DELETE /api/v1/games/:id — remove a game from the lobby
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    deleteGame(id);
    await deleteGameFile(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof GameNotFoundError) return res.status(404).json({ error: 'Game not found' });
    console.error('[route] DELETE /games/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// GET /api/v1/games — list all games
router.get('/', (_req, res) => {
  res.json(listGames());
});

// GET /api/v1/games/me — current player's session identity
// Must be defined before /:id so the literal "me" is not captured by router.param
router.get('/me', (req, res) => {
  const player = getPlayerSession(req);
  res.json({ gameId: player?.gameId ?? null, side: player?.side ?? null });
});

// GET /api/v1/games/:id/map-config — static scenario map data (gridSpec + hexes)
// No requireSide: this is read-only scenario data identical for all players.
router.get('/:id/map-config', (_req, res) => {
  if (_mapStartupError) return res.status(503).json({ error: 'Map data unavailable' });
  res.json({ gridSpec: _mapData.gridSpec, hexes: _mapData.hexes });
});

// GET /api/v1/games/:id — load game state (player must have a valid session for this game)
router.get('/:id', requireSide, async (req, res) => {
  try {
    const { id } = req.params;
    const row = getGame(id);
    if (!row) return res.status(404).json({ error: 'Game not found' });

    const state = await loadGame(id);
    res.json(state);
  } catch (err) {
    console.error('[route] GET /games/:id error:', err.message);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

export default router;
