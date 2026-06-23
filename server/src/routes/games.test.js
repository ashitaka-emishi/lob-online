import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// ─── Mock store and engine dependencies ───────────────────────────────────────

vi.mock('../auth/session.js', () => ({
  setPlayerSession: vi.fn(),
  getPlayerSession: vi.fn().mockReturnValue(null),
}));

vi.mock('../store/index.js', () => ({
  saveGame: vi.fn().mockResolvedValue(undefined),
  loadGame: vi.fn(),
  appendHistory: vi.fn().mockResolvedValue(undefined),
  createGame: vi.fn(),
  joinGame: vi.fn(),
  deleteGame: vi.fn(),
  deleteGameState: vi.fn().mockResolvedValue(undefined),
  getGame: vi.fn(),
  listGames: vi.fn(),
  GameNotFoundError: class GameNotFoundError extends Error {
    constructor(id) {
      super(`Game not found: ${id}`);
      this.name = 'GameNotFoundError';
    }
  },
  GameNotOpenError: class GameNotOpenError extends Error {
    constructor(id) {
      super(`Game ${id} is not open`);
      this.name = 'GameNotOpenError';
    }
  },
  InvalidTokenError: class InvalidTokenError extends Error {
    constructor(field, value) {
      super(`${field} must be a UUID string, got ${typeof value}`);
      this.name = 'InvalidTokenError';
    }
  },
}));

vi.mock('../engine/init.js', () => ({
  initGameState: vi.fn(),
}));

vi.mock('../engine/scenario.js', () => ({
  loadScenario: vi.fn(),
  getScenario: vi.fn(),
  clearScenarioCache: vi.fn(),
}));

vi.mock('../engine/actions/index.js', () => ({
  dispatch: vi.fn(),
  getValidActions: vi.fn(),
  ActionError: class ActionError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'ActionError';
      this.code = code;
    }
  },
}));

vi.mock('../notifications/discord.js', () => ({
  buildActionPayload: vi.fn().mockReturnValue({ content: 'test notification' }),
  notifyWebhook: vi.fn().mockResolvedValue(undefined),
  // Pass-through the real allowlist check so create-route SSRF tests remain meaningful.
  isAllowedDiscordWebhook: vi.fn((url) => {
    try {
      const { protocol, hostname } = new URL(url);
      return (
        protocol === 'https:' &&
        ['discord.com', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com'].includes(
          hostname
        )
      );
    } catch {
      return false;
    }
  }),
}));

import { setPlayerSession, getPlayerSession } from '../auth/session.js';
import {
  appendHistory,
  createGame,
  deleteGame,
  deleteGameState,
  GameNotFoundError,
  GameNotOpenError,
  InvalidTokenError,
  getGame,
  joinGame,
  listGames,
  loadGame,
  saveGame,
} from '../store/index.js';
import { initGameState } from '../engine/init.js';
import { getScenario } from '../engine/scenario.js';
import { dispatch, getValidActions, ActionError } from '../engine/actions/index.js';
import { buildActionPayload, notifyWebhook } from '../notifications/discord.js';

// Fixed UUID used as a stand-in game id in route tests
const TEST_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const MINIMAL_STATE = {
  id: TEST_UUID,
  scenarioId: 'south-mountain',
  version: 0,
  turn: 1,
  phase: null,
  initiative: null,
  sides: { union: null, confederate: null },
  units: {},
  reinforcementQueue: [],
  status: 'setup',
};

async function buildApp() {
  const { default: router } = await import('./games.js');
  const app = express();
  app.use(express.json());
  // Mock Socket.io — route handlers call req.app.locals.io.to(id).emit(event, data)
  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
  app.locals.io = { to: mockTo };
  app.locals._mockEmit = mockEmit;
  app.locals._mockTo = mockTo;
  // Minimal session stub — regenerate resets session and invokes callback (#SEC-M1)
  app.use((req, _res, next) => {
    req.session = { regenerate: (cb) => cb() };
    next();
  });
  app.use('/api/v1/games', router);
  return app;
}

// vi.resetAllMocks() resets both call history and mockImplementation, preventing
// tests that use mockImplementation(() => throw) from bleeding into later tests
beforeEach(() => {
  vi.resetAllMocks();
  getScenario.mockReturnValue({ id: 'south-mountain', turnStructure: {} });
  initGameState.mockReturnValue(MINIMAL_STATE);
  createGame.mockReturnValue(TEST_UUID);
  listGames.mockReturnValue([]);
  // Default: active game with side_a_token matching the most common test player token ('tok').
  // Tests that need a different game state (null, open, different tokens) override this.
  getGame.mockReturnValue({
    id: TEST_UUID,
    status: 'active',
    side_a_token: 'tok',
    side_b_token: 'tok-b',
  });
  loadGame.mockResolvedValue(MINIMAL_STATE);
  getValidActions.mockReturnValue([]);
  deleteGame.mockReturnValue(undefined);
  deleteGameState.mockResolvedValue(undefined);
  appendHistory.mockResolvedValue(undefined);
});

describe('POST /api/v1/games', () => {
  it('returns 201 with id and union side for creator (#549)', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games').send({});
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(res.body.side).toBe('union');
  });

  it('calls createGame before saveGame (#ARCH-H4)', async () => {
    const callOrder = [];
    createGame.mockImplementation(() => callOrder.push('createGame'));
    saveGame.mockImplementation(async () => callOrder.push('saveGame'));
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(callOrder).toEqual(['createGame', 'saveGame']);
  });

  it('calls initGameState and saveGame', async () => {
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(initGameState).toHaveBeenCalledOnce();
    expect(saveGame).toHaveBeenCalledOnce();
    expect(createGame).toHaveBeenCalledOnce();
  });

  it('sets player session with union side for creator (#549)', async () => {
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(setPlayerSession).toHaveBeenCalledOnce();
    const [, , side] = setPlayerSession.mock.calls[0];
    expect(side).toBe('union');
  });

  it('passes discordWebhook to createGame when provided', async () => {
    const app = await buildApp();
    await request(app)
      .post('/api/v1/games')
      .send({ discordWebhook: 'https://discord.com/api/webhooks/123/abc' });
    expect(createGame).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'union',
      'https://discord.com/api/webhooks/123/abc'
    );
  });

  it('returns 400 when discordWebhook is not a valid URL', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games').send({ discordWebhook: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it('returns 400 when discordWebhook uses http instead of https (SSRF guard)', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/v1/games')
      .send({ discordWebhook: 'http://discord.com/api/webhooks/123/abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/https/i);
  });

  it('returns 400 when discordWebhook is a non-Discord domain (SSRF guard)', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/v1/games')
      .send({ discordWebhook: 'https://169.254.169.254/latest/meta-data/' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/discord/i);
  });
});

describe('POST /api/v1/games/:id/join', () => {
  it('returns 200 with id and requested side when side is union (#407)', async () => {
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_UUID);
    expect(res.body.side).toBe('union');
  });

  it('sets player session with the requested side (#335 #407)', async () => {
    const app = await buildApp();
    await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(setPlayerSession).toHaveBeenCalledOnce();
    const [, , side] = setPlayerSession.mock.calls[0];
    expect(side).toBe('union');
  });

  it('returns 400 when side is missing from request body (#407)', async () => {
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/side/);
  });

  it('returns 400 when side is an invalid value (#407)', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/join`)
      .send({ side: 'neutral' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/side/);
  });

  it('returns 200 with confederate side when side is confederate (#407)', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/join`)
      .send({ side: 'confederate' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('confederate');
    expect(joinGame).toHaveBeenCalledWith(TEST_UUID, expect.any(String), expect.any(String));
  });

  it('returns 404 when joinGame throws GameNotFoundError (#PERF-H1)', async () => {
    joinGame.mockImplementation(() => {
      throw new GameNotFoundError(TEST_UUID);
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(404);
  });

  it('returns 409 when joinGame throws GameNotOpenError (#PERF-H1)', async () => {
    joinGame.mockImplementation(() => {
      throw new GameNotOpenError(TEST_UUID);
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Game is already full');
  });

  it('returns 400 when joinGame throws InvalidTokenError', async () => {
    joinGame.mockImplementation(() => {
      throw new InvalidTokenError('sideBToken', 'bad');
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(400);
  });

  it('returns 500 when joinGame throws an unexpected error', async () => {
    joinGame.mockImplementation(() => {
      throw new Error('unexpected');
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to join game');
  });

  it('returns 400 for non-UUID game id', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games/not-a-uuid/join').send({ side: 'union' });
    expect(res.status).toBe(400);
  });

  // Faction binding enforced on re-join — side-switching is forbidden
  it('returns 403 when session already holds this game but requests a different side', async () => {
    getPlayerSession.mockReturnValue({
      gameId: TEST_UUID,
      side: 'confederate',
      sideToken: 'tok-1',
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/side already bound/i);
    expect(joinGame).not.toHaveBeenCalled();
    expect(setPlayerSession).not.toHaveBeenCalled();
  });

  it('returns 200 and keeps same side when session matches and same side requested (#340)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok-2' });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('union');
    expect(joinGame).not.toHaveBeenCalled();
    // Security: re-join must reuse the existing sideToken, not mint a fresh one
    expect(setPlayerSession).toHaveBeenCalledWith(expect.anything(), TEST_UUID, 'union', 'tok-2');
  });

  it('joins successfully as union when caller has no session (#340 #407)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('union');
    expect(joinGame).toHaveBeenCalledWith(TEST_UUID, expect.any(String), expect.any(String));
  });

  it('joins successfully as union when caller session is for a different game (#340 #407)', async () => {
    const OTHER_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    getPlayerSession.mockReturnValue({
      gameId: OTHER_UUID,
      side: 'confederate',
      sideToken: 'tok-1',
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('union');
    expect(joinGame).toHaveBeenCalledWith(TEST_UUID, expect.any(String), expect.any(String));
  });
});

describe('GET /api/v1/games/me', () => {
  it('returns gameId and side when player has a session (#407)', async () => {
    getPlayerSession.mockReturnValue({
      gameId: TEST_UUID,
      side: 'confederate',
      sideToken: 'tok-1',
    });
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ gameId: TEST_UUID, side: 'confederate' });
  });

  it('returns null gameId and side when no session (#407)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ gameId: null, side: null });
  });
});

describe('GET /api/v1/games', () => {
  it('returns 200 with empty array when no games', async () => {
    listGames.mockReturnValue([]);
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns list from store', async () => {
    listGames.mockReturnValue([
      { id: 'g1', status: 'open' },
      { id: 'g2', status: 'active' },
    ]);
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// #393 / #593 — getScenario() is cached at module init; initGameState receives the cached value.
describe('POST /api/v1/games — scenario wiring', () => {
  it('passes cached scenario to initGameState (#593 — module-level cache, not per-request)', async () => {
    // beforeEach sets getScenario.mockReturnValue({ id: 'south-mountain', ... }).
    // games.js evaluates the cache once at module load, so the per-request call is gone.
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(initGameState).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'south-mountain' }),
      expect.any(String)
    );
  });
});

describe('GET /api/v1/games/:id', () => {
  it('returns 200 with game state when player session is valid (#330)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok-1' });
    getGame.mockReturnValue({
      id: TEST_UUID,
      status: 'active',
      side_a_token: 'tok-1',
      side_b_token: 'tok-b',
    });
    loadGame.mockResolvedValue(MINIMAL_STATE);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_UUID);
    expect(res.body.turn).toBe(1);
  });

  it('returns 401 when there is no player session (#330)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when session gameId does not match the route :id — does not hit the DB (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: 'other-game', side: 'union', sideToken: 'tok-1' });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(403);
    expect(getGame).not.toHaveBeenCalled();
    expect(loadGame).not.toHaveBeenCalled();
  });

  it('returns 403 when same-game session has invalid sideToken (#553)', async () => {
    getPlayerSession.mockReturnValue({
      gameId: TEST_UUID,
      side: 'union',
      sideToken: 'stale-token',
    });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(403);
    expect(loadGame).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown game id (authenticated player) (#330)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok-1' });
    getGame.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-UUID game id', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/games/:id', () => {
  it('returns 204 and calls deleteGame + deleteGameState (#407)', async () => {
    const app = await buildApp();
    const res = await request(app).delete(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(204);
    expect(deleteGame).toHaveBeenCalledWith(TEST_UUID);
    expect(deleteGameState).toHaveBeenCalledWith(TEST_UUID);
  });

  it('returns 404 when deleteGame throws GameNotFoundError (#407)', async () => {
    deleteGame.mockImplementation(() => {
      throw new GameNotFoundError(TEST_UUID);
    });
    const app = await buildApp();
    const res = await request(app).delete(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Game not found');
  });

  it('returns 500 when deleteGameState throws (#407)', async () => {
    deleteGameState.mockRejectedValue(new Error('s3 error'));
    const app = await buildApp();
    const res = await request(app).delete(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(500);
  });

  it('returns 400 for non-UUID game id', async () => {
    const app = await buildApp();
    const res = await request(app).delete('/api/v1/games/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/v1/games/:id/actions ──────────────────────────────────────────

const ACTIVE_STATE = {
  ...MINIMAL_STATE,
  version: 3,
  status: 'active',
  activePlayer: 'union',
};
const NEXT_STATE = { ...ACTIVE_STATE, version: 4 };

describe('POST /api/v1/games/:id/actions', () => {
  it('returns 401 when player has no session (#356)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(401);
  });

  it('returns 403 when session gameId does not match route :id — does not hit DB (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: 'other-game', side: 'union', sideToken: 'tok' });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(403);
    expect(getGame).not.toHaveBeenCalled();
    expect(loadGame).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns 403 when same-game session has invalid sideToken (#553)', async () => {
    getPlayerSession.mockReturnValue({
      gameId: TEST_UUID,
      side: 'union',
      sideToken: 'stale-token',
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated player for game A posts action to game B (#553)', async () => {
    const OTHER_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    getPlayerSession.mockReturnValue({ gameId: OTHER_UUID, side: 'union', sideToken: 'tok' });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns 400 when action type is missing (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ payload: null, expectedVersion: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  it('returns 409 when expectedVersion does not match state version (#332 #356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE); // version: 3
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 99 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/version/i);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches action and returns saved state on success (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(4);
    expect(dispatch).toHaveBeenCalledWith(
      ACTIVE_STATE,
      { type: 'END_PHASE', payload: null, playerSide: 'union' },
      expect.objectContaining({
        oob: expect.anything(),
        scenario: expect.anything(),
        mapData: expect.anything(),
        hexIndex: expect.anything(),
      })
    );
  });

  it('sources playerSide from session, never from request body (#387)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'confederate', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    // Caller attempts to spoof playerSide in the body — must be ignored
    await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, playerSide: 'union', expectedVersion: 3 });
    expect(dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ playerSide: 'confederate' }),
      expect.objectContaining({ oob: expect.anything() })
    );
  });

  it('emits game:state-updated after successful action (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(app.locals._mockTo).toHaveBeenCalledWith(TEST_UUID);
    expect(app.locals._mockEmit).toHaveBeenCalledWith('game:state-updated', {
      version: NEXT_STATE.version,
    });
  });

  it('does not emit game:state-updated when dispatch throws (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError('INVALID_ACTION', 'bad action');
    });
    const app = await buildApp();
    await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(app.locals._mockEmit).not.toHaveBeenCalled();
  });

  it('returns 422 for INVALID_ACTION without leaking stack trace (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError('INVALID_ACTION', "Action 'FOO' is not valid");
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not valid/);
    expect(res.body.stack).toBeUndefined();
  });

  it('returns 422 for UNKNOWN_ACTION (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError('UNKNOWN_ACTION', 'No handler for NOOP');
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(422);
    expect(res.body.stack).toBeUndefined();
  });

  it('returns 500 for INVALID_STATE without leaking stack trace (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError('INVALID_STATE', 'Schema violation');
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(500);
    expect(res.body.stack).toBeUndefined();
  });

  it('returns 500 for DRAIN_LOOP (#356)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError('DRAIN_LOOP', 'Cycle detected');
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(500);
  });

  it('sanitizes INVALID_STATE message — internal details do not reach the client (#478)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError(
        'INVALID_STATE',
        'drainAutoSteps: ordersPhase is non-null outside orders phase (phase=command, step=initiative)'
      );
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal error processing action');
    expect(res.body.error).not.toMatch(/ordersPhase|drainAutoSteps/);
  });

  it('sanitizes DRAIN_LOOP message — internal details do not reach the client (#478)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError(
        'DRAIN_LOOP',
        'Cycle detected in phase=command step=initiative after 100 iterations'
      );
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal error processing action');
  });

  it('returns 400 for INVALID_PAYLOAD — client error, not server fault (#478)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockImplementation(() => {
      throw new ActionError('INVALID_PAYLOAD', 'ISSUE_ORDER requires unitId and orderType');
    });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'ISSUE_ORDER', payload: {}, expectedVersion: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ISSUE_ORDER requires unitId and orderType');
  });

  it('returns 400 for non-UUID game id (#356)', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/v1/games/not-a-uuid/actions')
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(400);
  });

  // Task 1.2 (#482): missing io must not produce a 500 after a successful state change
  it('returns 200 and does not throw when req.app.locals.io is absent (#482)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    app.locals.io = null; // simulate Socket.io not yet attached
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(NEXT_STATE.version);
  });

  // Task 1.3 (#481): response body is saveGame result, not dispatch result
  it('response body reflects saveGame result, not raw dispatch result (#481)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue({ ...NEXT_STATE, version: 10 });
    saveGame.mockResolvedValue({ ...NEXT_STATE, version: 11 });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(11);
  });

  // Task 1.4 (#481): absent or non-numeric expectedVersion opts out of the version guard
  it('bypasses version guard and dispatches when expectedVersion is absent (#481)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE); // version: 3
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null }); // no expectedVersion
    expect(res.status).toBe(200);
    expect(dispatch).toHaveBeenCalled();
  });

  it('bypasses version guard when expectedVersion is a non-numeric string (#481)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 'latest' });
    expect(res.status).toBe(200);
    expect(dispatch).toHaveBeenCalled();
  });

  // Boundary: numeric 0 is falsy but must still engage the version guard (#481)
  it('engages version guard when expectedVersion is 0 and state version is 0 (match → 200)', async () => {
    const zeroState = { ...ACTIVE_STATE, version: 0 };
    const zeroNext = { ...NEXT_STATE, version: 1 };
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(zeroState);
    dispatch.mockReturnValue(zeroNext);
    saveGame.mockResolvedValue(zeroNext);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(200);
    expect(dispatch).toHaveBeenCalled();
  });

  it('returns 409 when expectedVersion is 0 but state version is 3 (mismatch — guard active for zero) (#481)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE); // version: 3
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(409);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/games/:id/actions (#495)', () => {
  it('returns 200 with validActions array', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(MINIMAL_STATE);
    getValidActions.mockReturnValue([{ type: 'END_PHASE', payload: null }]);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(200);
    expect(res.body.validActions).toEqual([{ type: 'END_PHASE', payload: null }]);
  });

  it('passes player side from session to getValidActions', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'confederate', sideToken: 'tok' });
    loadGame.mockResolvedValue(MINIMAL_STATE);
    getValidActions.mockReturnValue([]);
    const app = await buildApp();
    await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(getValidActions).toHaveBeenCalledWith(MINIMAL_STATE, 'confederate');
  });

  // 404 is produced by requireSide (line 31-33 of requireSide.js), not by the route body.
  // getGame returning null causes the middleware to reject before the handler runs.
  it('returns 404 when the game does not exist', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    getGame.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Game not found');
  });

  it('returns 401 when the request has no authenticated session', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(401);
  });

  it('returns 401 when authenticated player for game A queries game B actions (#503)', async () => {
    const OTHER_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    getPlayerSession.mockReturnValue({ gameId: OTHER_UUID, side: 'union', sideToken: 'tok' });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(403);
    expect(getValidActions).not.toHaveBeenCalled();
  });
});

// ─── Session guard — requireSameGame (#553) ───────────────────────────────────
// Tests that each guarded route (GET /:id, GET /:id/actions, POST /:id/actions)
// returns the correct status for same-game, different-game, and missing-session cases.

describe('Session guard — requireSameGame (#553)', () => {
  const OTHER_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // ── GET /api/v1/games/:id ────────────────────────────────────────────────────

  it('GET /:id — succeeds (200) for same-game session (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(MINIMAL_STATE);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(200);
  });

  it('GET /:id — returns 403 for different-game session (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: OTHER_UUID, side: 'union', sideToken: 'tok' });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(403);
  });

  it('GET /:id — returns 401 for missing session (#553)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(401);
  });

  // ── GET /api/v1/games/:id/actions ────────────────────────────────────────────

  it('GET /:id/actions — succeeds (200) for same-game session (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(MINIMAL_STATE);
    getValidActions.mockReturnValue([]);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(200);
  });

  it('GET /:id/actions — returns 403 for different-game session (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: OTHER_UUID, side: 'union', sideToken: 'tok' });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(403);
    expect(getValidActions).not.toHaveBeenCalled();
  });

  it('GET /:id/actions — returns 401 for missing session (#553)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/actions`);
    expect(res.status).toBe(401);
  });

  // ── POST /api/v1/games/:id/actions ───────────────────────────────────────────

  it('POST /:id/actions — succeeds (200) for same-game session when action is legal (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(200);
  });

  it('POST /:id/actions — returns 403 for different-game session (#553)', async () => {
    getPlayerSession.mockReturnValue({ gameId: OTHER_UUID, side: 'union', sideToken: 'tok' });
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(403);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('POST /:id/actions — returns 401 for missing session (#553)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 0 });
    expect(res.status).toBe(401);
  });

  it('calls notifyWebhook after saveGame when game has discord_webhook configured (#M8)', async () => {
    buildActionPayload.mockReturnValue({ content: 'test notification' });
    notifyWebhook.mockResolvedValue(undefined);
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    getGame.mockReturnValue({
      id: TEST_UUID,
      status: 'active',
      side_a_token: 'tok',
      side_b_token: 'tok-b',
      discord_webhook: 'https://discord.com/api/webhooks/123/abc',
    });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(res.status).toBe(200);
    expect(notifyWebhook).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/123/abc',
      expect.any(Object)
    );
  });

  it('does not call notifyWebhook when discord_webhook is null (#M8)', async () => {
    notifyWebhook.mockResolvedValue(undefined);
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    getGame.mockReturnValue({
      id: TEST_UUID,
      status: 'active',
      side_a_token: 'tok',
      side_b_token: 'tok-b',
      discord_webhook: null,
    });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    const app = await buildApp();
    await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    expect(notifyWebhook).not.toHaveBeenCalled();
  });

  it('action response succeeds even when notifyWebhook rejects (fire-and-forget) (#M8)', async () => {
    buildActionPayload.mockReturnValue({ content: 'test notification' });
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok' });
    getGame.mockReturnValue({
      id: TEST_UUID,
      status: 'active',
      side_a_token: 'tok',
      side_b_token: 'tok-b',
      discord_webhook: 'https://discord.com/api/webhooks/123/abc',
    });
    loadGame.mockResolvedValue(ACTIVE_STATE);
    dispatch.mockReturnValue(NEXT_STATE);
    saveGame.mockResolvedValue(NEXT_STATE);
    notifyWebhook.mockRejectedValueOnce(new Error('network timeout'));
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/v1/games/${TEST_UUID}/actions`)
      .send({ type: 'END_PHASE', payload: null, expectedVersion: 3 });
    // Fire-and-forget: webhook failure must not affect the action response
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(4);
  });
});

// ─── Rate-limiter configuration (#589) ───────────────────────────────────────

describe('Rate-limiter configuration — createLimiter vs joinLimiter (#589)', () => {
  it('createLimiter max (10) is lower than joinLimiter max (30)', async () => {
    // Capture the max values passed to rateLimit() at module init time.
    // The security invariant: POST /games is throttled tighter than POST /games/:id/join.
    const capturedOptions = [];
    vi.doMock('express-rate-limit', () => ({
      default: (opts) => {
        capturedOptions.push(opts);
        return (_req, _res, next) => next();
      },
    }));
    vi.resetModules();
    await import('./games.js');
    // Two limiters are registered: createLimiter and joinLimiter
    expect(capturedOptions).toHaveLength(2);
    const [createMax, joinMax] = capturedOptions.map((o) => o.max);
    expect(createMax).toBeLessThan(joinMax);
    // Exact values: create=10, join=30 per #589
    expect(createMax).toBe(10);
    expect(joinMax).toBe(30);
    vi.doUnmock('express-rate-limit');
    vi.resetModules();
  });
});
