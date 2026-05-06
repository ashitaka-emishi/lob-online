import { randomUUID } from 'node:crypto';

import express from 'express';

import { requireSide } from '../auth/requireSide.js';
import { setPlayerSession } from '../auth/session.js';
import { initGameState } from '../engine/init.js';
import { loadScenario } from '../engine/scenario.js';
import { createGame, getGame, joinGame, listGames, loadGame, saveGame } from '../store/index.js';

const router = express.Router();

// Validate :id is a UUID — prevents path traversal into gameFile storage
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.param('id', (req, res, next, id) => {
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid game id' });
  next();
});

// Lazily load scenario once — scenario.json is immutable at runtime
let _scenario;
function getScenario() {
  if (!_scenario) _scenario = loadScenario();
  return _scenario;
}

// POST /api/v1/games — create a new game, assign creator as union
router.post('/', async (req, res) => {
  try {
    const id = randomUUID();
    const scenario = getScenario();
    const state = initGameState(scenario, id);
    await saveGame(id, state);

    const sideToken = randomUUID();
    createGame(id, sideToken);
    setPlayerSession(req, id, 'union', sideToken);

    res.status(201).json({ id, side: 'union' });
  } catch (err) {
    console.error('[route] POST /games error:', err.message);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// POST /api/v1/games/:id/join — second player joins as confederate
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const row = getGame(id);
    if (!row) return res.status(404).json({ error: 'Game not found' });
    if (row.status !== 'open') return res.status(409).json({ error: 'Game is already full' });

    const sideToken = randomUUID();
    joinGame(id, sideToken);
    setPlayerSession(req, id, 'confederate', sideToken);

    res.json({ id, side: 'confederate' });
  } catch (err) {
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
