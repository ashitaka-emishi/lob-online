import { randomUUID } from 'node:crypto';

import express from 'express';

import { requireSide } from '../auth/requireSide.js';
import { getPlayerSession, setPlayerSession } from '../auth/session.js';
import { initGameState } from '../engine/init.js';
import { getScenario } from '../engine/scenario.js';
import {
  createGame,
  GameNotFoundError,
  GameNotOpenError,
  getGame,
  InvalidTokenError,
  joinGame,
  listGames,
  loadGame,
  saveGame,
} from '../store/index.js';
import { UUID_RE } from '../util/uuid.js';

const router = express.Router();

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
    await new Promise((res, rej) => req.session.regenerate((e) => (e ? rej(e) : res())));
    setPlayerSession(req, id, 'confederate', sideToken);

    res.status(201).json({ id, side: 'confederate' });
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
    if (side !== 'union' && side !== 'confederate') {
      return res.status(400).json({ error: 'side must be "union" or "confederate"' });
    }

    // ARCH-H2: reject if the caller is already in this game (#340)
    // Game-switching is intentionally allowed: a player already in game A may join game B,
    // overwriting their session. Only same-game re-join is blocked. Policy documented in #349.
    const existingSession = getPlayerSession(req);
    if (existingSession?.gameId === id) {
      return res.status(409).json({ error: 'Already in this game' });
    }

    const sideToken = randomUUID();

    // joinGame is atomic — no pre-check needed; typed errors map to 404/409 (#PERF-H1, #ARCH-M2)
    joinGame(id, sideToken);

    // Rotate session id before writing identity — prevents session fixation (#SEC-M1)
    await new Promise((res, rej) => req.session.regenerate((e) => (e ? rej(e) : res())));
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

// GET /api/v1/games — list all games
router.get('/', (_req, res) => {
  res.json(listGames());
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
