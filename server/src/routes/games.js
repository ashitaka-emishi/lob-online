import { randomUUID } from 'node:crypto';

import express from 'express';
import rateLimit from 'express-rate-limit';

import { requireSide } from '../auth/requireSide.js';
import { getPlayerSession, setPlayerSession } from '../auth/session.js';
import { dispatch, getValidActions, ActionError } from '../engine/actions/index.js';
import { initGameState } from '../engine/init.js';
import { loadMap, buildHexIndex } from '../engine/map.js';
import { loadOob } from '../engine/oob.js';
import { getScenario } from '../engine/scenario.js';
import {
  buildActionPayload,
  isAllowedDiscordWebhook,
  notifyWebhook,
} from '../notifications/discord.js';
import {
  appendHistory,
  createGame,
  deleteGame,
  deleteGameState,
  GameNotFoundError,
  GameNotOpenError,
  getGame,
  InvalidTokenError,
  joinGame,
  listGamesByUser,
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

// #589 — split create/join limiters so aggressive game-creation is throttled tighter than joins.
// Create: 10 per 15-min (new games are expensive; low churn expected).
// Join: 30 per 15-min (players may refresh or retry; higher tolerance acceptable).
const createLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const joinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

// Module-init cache (#593 #572 #628): loadOob, loadMap, and getScenario perform synchronous file I/O
// and are called exactly once at import time. All route handlers share the cached results for the
// lifetime of the server process. Data files (oob.json, map.json, scenario.json) are read-only at
// runtime — any change requires a server restart. buildHexIndex depends on _mapData, so it is also
// computed here rather than per-request.
const _oob = loadOob();
const _mapData = loadMap();
const _scenario = getScenario();
const _hexIndex = buildHexIndex(_mapData);

const router = express.Router();

// Validate :id is a UUID — prevents path traversal in Spaces key construction
router.param('id', (req, res, next, id) => {
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid game id' });
  next();
});

// POST /api/v1/games — create a new game, assign creator as union (USA) (#549)
router.post('/', createLimiter, async (req, res) => {
  try {
    const { discordWebhook } = req.body ?? {};

    // Validate discordWebhook if provided. Restrict to Discord domains only to prevent SSRF —
    // the server will POST to this URL, so arbitrary internal addresses must be blocked.
    // isAllowedDiscordWebhook is the single source of truth for the allowlist (discord.js).
    if (discordWebhook !== undefined && discordWebhook !== null) {
      let parsed;
      try {
        parsed = new URL(discordWebhook);
      } catch {
        return res.status(400).json({ error: 'discordWebhook must be a valid URL' });
      }
      if (parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'discordWebhook must use https' });
      }
      if (!isAllowedDiscordWebhook(discordWebhook)) {
        return res.status(400).json({ error: 'discordWebhook must be a Discord webhook URL' });
      }
    }

    const id = randomUUID();
    const state = initGameState(_scenario, id);

    // SQLite row first, then Spaces. If saveGame fails, roll back the SQLite row so no
    // orphaned metadata row points at a missing Spaces object (#ARCH-H4).
    const sideToken = randomUUID();
    createGame(id, sideToken, SIDES.UNION, discordWebhook ?? null, req.user?.id ?? null);
    try {
      await saveGame(id, state);
    } catch (err) {
      try {
        deleteGame(id);
      } catch (rollbackErr) {
        console.error('[route] POST /games rollback deleteGame failed:', rollbackErr.message);
      }
      throw err;
    }

    // Rotate session id before writing identity — prevents session fixation (#SEC-M1)
    await regenerateSession(req);
    setPlayerSession(req, id, SIDES.UNION, sideToken);

    res.status(201).json({ id, side: SIDES.UNION });
  } catch (err) {
    console.error('[route] POST /games error:', err.message);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// POST /api/v1/games/:id/join — second player joins; side must be specified in body
router.post('/:id/join', joinLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { side } = req.body;

    // Validate explicit side choice
    if (side !== SIDES.UNION && side !== SIDES.CONFEDERATE) {
      return res.status(400).json({ error: 'side must be "union" or "confederate"' });
    }

    const existingSession = getPlayerSession(req);

    // Same-game re-join: enforce faction binding via DB-derived side — cannot switch factions (#563).
    // Uses the token→faction mapping in the DB rather than the session-stored side string.
    if (existingSession?.gameId === id) {
      const reJoinRow = getGame(id);
      if (!reJoinRow) return res.status(404).json({ error: 'Game not found' });
      // Validate the session token against the DB before deriving faction — mirrors requireSide.js:45.
      // A stale/rotated sideToken must fail closed even when gameId still matches (#563).
      if (
        existingSession.sideToken !== reJoinRow.side_a_token &&
        existingSession.sideToken !== reJoinRow.side_b_token
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const boundFaction =
        existingSession.sideToken === reJoinRow.side_a_token
          ? reJoinRow.side_a_faction
          : reJoinRow.side_b_faction;
      if (boundFaction !== side) {
        return res.status(403).json({ error: 'Side already bound — cannot switch factions' });
      }
      await regenerateSession(req);
      setPlayerSession(req, id, side, existingSession.sideToken);
      return res.json({ id, side });
    }

    // Reject new join if the requested faction is already held by any player (#562 #664).
    // Guard both columns — side_a is always the creator, but robust to future game modes.
    const joinRow = getGame(id);
    if (!joinRow) return res.status(404).json({ error: 'Game not found' });
    if (joinRow.side_a_faction === side || joinRow.side_b_faction === side) {
      return res.status(409).json({ error: 'Side already taken' });
    }

    const sideToken = randomUUID();

    // joinGame is atomic; typed errors map to 404/409 for remaining edge cases (#PERF-H1, #ARCH-M2)
    joinGame(id, sideToken, side, req.user?.id ?? null);

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

// DELETE /api/v1/games/:id — dev/test utility; disabled in production via MAP_EDITOR_ENABLED.
// Spaces object is deleted before the SQLite row: deleteGameState is idempotent (S3 delete-missing
// is a no-op), so if the process crashes between the two operations the row can be cleaned up on a
// retry without a permanently leaked Spaces object.
router.delete('/:id', async (req, res) => {
  // 404 (not 403) so the endpoint is indistinguishable from a non-existent route
  if (process.env.MAP_EDITOR_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { id } = req.params;
    // Verify the row exists first so we can return 404 before touching Spaces
    const row = getGame(id);
    if (!row) return res.status(404).json({ error: 'Game not found' });
    await deleteGameState(id);
    deleteGame(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof GameNotFoundError) return res.status(404).json({ error: 'Game not found' });
    console.error('[route] DELETE /games/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// GET /api/v1/games — list games belonging to the authenticated user (#668)
router.get('/', (req, res) => {
  res.json(listGamesByUser(req.user.id));
});

// GET /api/v1/games/me — current player's session identity
// Must be defined before /:id so the literal "me" is not captured by router.param
router.get('/me', (req, res) => {
  const player = getPlayerSession(req);
  res.json({ gameId: player?.gameId ?? null, side: player?.side ?? null });
});

// ActionError.code → HTTP status. INVALID_ACTION / UNKNOWN_ACTION / INVALID_PAYLOAD are client
// errors (422/400); INVALID_STATE / DRAIN_LOOP are server-side faults (500). (#356 #478)
// IMPORTANT: err.message is returned verbatim to the client for all <500 codes — every
// ActionError throw site with a <500 code must keep its message client-safe (no internal
// state, tokens, or opponent data). 500-class messages are sanitised below.
const ACTION_ERROR_STATUS = {
  INVALID_ACTION: 422,
  UNKNOWN_ACTION: 422,
  INVALID_PAYLOAD: 400,
  INVALID_MOVE: 422,
  INSUFFICIENT_MPS: 422,
  INVALID_STATE: 500,
  DRAIN_LOOP: 500,
};

// GET /api/v1/games/:id/actions — return valid actions for the authenticated player. (#495)
// Uses the same DB-derived req.side as POST so clients never supply their own side.
router.get('/:id/actions', requireSide, async (req, res) => {
  try {
    const { id } = req.params;
    // 401/404/409/403 all handled by requireSide before we reach here.
    const state = await loadGame(id);
    const validActions = getValidActions(state, req.side);
    res.json({ validActions });
  } catch (err) {
    if (err instanceof GameNotFoundError) return res.status(404).json({ error: 'Game not found' });
    console.error('[route] GET /games/:id/actions error:', err.message);
    res.status(500).json({ error: 'Failed to load valid actions' });
  }
});

// POST /api/v1/games/:id/actions — submit a game action through the pure phase reducer.
// playerSide is sourced from the authenticated session, never from the request body. (#356 #387)
router.post('/:id/actions', requireSide, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, payload = null, expectedVersion } = req.body;

    if (typeof type !== 'string' || !type) {
      return res.status(400).json({ error: 'action type must be a non-empty string' });
    }

    const playerSide = req.side; // DB-derived via requireSide; body playerSide is intentionally ignored

    const state = await loadGame(id);

    // Optimistic concurrency — reject before dispatch if client state is stale (#332).
    // Non-numeric / absent expectedVersion means the client opts out of the version guard.
    if (typeof expectedVersion === 'number' && expectedVersion !== state.version) {
      return res
        .status(409)
        .json({ error: `Version conflict: expected ${expectedVersion}, current ${state.version}` });
    }

    // Build DI context so combat handlers use real LOS/hex-distance rather than fallbacks (#572)
    const nextState = dispatch(
      state,
      { type, payload, playerSide },
      { oob: _oob, scenario: _scenario, mapData: _mapData, hexIndex: _hexIndex }
    );
    const saved = await saveGame(id, nextState);
    await appendHistory(id, saved.version, { type, payload, playerSide, version: saved.version });

    // Fire-and-forget Discord webhook if the game has one configured (#M8)
    // req.game is populated by requireSide — no second DB read needed.
    if (req.game?.discord_webhook) {
      notifyWebhook(req.game.discord_webhook, buildActionPayload(id, { type }, saved));
    }

    // Notify connected players; they fetch the authoritative state via GET /:id (#356)
    // Guard: io may be absent in test environments or before Socket.io attaches (#482)
    if (req.app.locals.io) {
      req.app.locals.io.to(id).emit('game:state-updated', { version: saved.version });
    } else {
      console.warn('[route] POST /games/:id/actions: io unavailable, skipping socket emit');
    }

    res.json(saved);
  } catch (err) {
    if (err instanceof ActionError) {
      const status = ACTION_ERROR_STATUS[err.code] ?? 500;
      console.error('[route] POST /games/:id/actions ActionError:', err.code, err.message);
      // Server-fault codes must not leak internal Zod/phase details to the client (#478).
      const clientMessage = status >= 500 ? 'Internal error processing action' : err.message;
      return res.status(status).json({ error: clientMessage });
    }
    if (err instanceof GameNotFoundError) return res.status(404).json({ error: 'Game not found' });
    console.error('[route] POST /games/:id/actions error:', err.message);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// GET /api/v1/games/:id — load game state (player must have a valid session for this game)
// requireSide already verified the row exists and the token is valid; no redundant getGame needed.
router.get('/:id', requireSide, async (req, res) => {
  try {
    const { id } = req.params;
    const state = await loadGame(id);
    res.json(state);
  } catch (err) {
    if (err instanceof GameNotFoundError) return res.status(404).json({ error: 'Game not found' });
    console.error('[route] GET /games/:id error:', err.message);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

export default router;
