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
  createGame: vi.fn(),
  joinGame: vi.fn(),
  deleteGame: vi.fn(),
  deleteGameFile: vi.fn().mockResolvedValue(undefined),
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

const STUB_GRID_SPEC = {
  cols: 64,
  rows: 35,
  dx: 39.75,
  dy: 36,
  hexWidth: 40.5,
  hexHeight: 40.7,
  imageScale: 1,
  strokeWidth: 2,
  orientation: 'flat',
  evenColUp: true,
  northOffset: 3,
};
const STUB_HEXES = [{ id: '01.01', terrain: 'clear', elevation: 0, edges: {} }];

vi.mock('../engine/map.js', () => ({
  loadMap: vi.fn(() => ({ gridSpec: STUB_GRID_SPEC, hexes: STUB_HEXES })),
  buildHexIndex: vi.fn(() => new Map()),
}));

import { setPlayerSession, getPlayerSession } from '../auth/session.js';
import {
  createGame,
  deleteGame,
  deleteGameFile,
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
  getGame.mockReturnValue(null);
  loadGame.mockResolvedValue(MINIMAL_STATE);
  deleteGame.mockReturnValue(undefined);
  deleteGameFile.mockResolvedValue(undefined);
});

describe('POST /api/v1/games', () => {
  it('returns 201 with id and confederate side (#407)', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games').send({});
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(res.body.side).toBe('confederate');
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

  it('sets player session with confederate side for creator (#335 #407)', async () => {
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(setPlayerSession).toHaveBeenCalledOnce();
    const [, , side] = setPlayerSession.mock.calls[0];
    expect(side).toBe('confederate');
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
    expect(joinGame).toHaveBeenCalledWith(TEST_UUID, expect.any(String));
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

  // ARCH-H2: same-game re-join updates side (scaffolded) — joinGame not called again (#340)
  it('returns 200 and updates side when session already holds this game (#340)', async () => {
    getPlayerSession.mockReturnValue({
      gameId: TEST_UUID,
      side: 'confederate',
      sideToken: 'tok-1',
    });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('union');
    expect(joinGame).not.toHaveBeenCalled();
    expect(setPlayerSession).toHaveBeenCalledWith(expect.anything(), TEST_UUID, 'union', 'tok-1');
  });

  it('returns 200 and keeps same side when session matches and same side requested (#340)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', sideToken: 'tok-2' });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('union');
    expect(joinGame).not.toHaveBeenCalled();
  });

  it('joins successfully as union when caller has no session (#340 #407)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({ side: 'union' });
    expect(res.status).toBe(200);
    expect(res.body.side).toBe('union');
    expect(joinGame).toHaveBeenCalledWith(TEST_UUID, expect.any(String));
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
    expect(joinGame).toHaveBeenCalledWith(TEST_UUID, expect.any(String));
  });
});

describe('GET /api/v1/games/me', () => {
  it('returns gameId and side when player has a session (#407)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'confederate', token: 'tok-1' });
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

// #393 — getScenario() is called by POST /games; cache behaviour tested in scenario.test.js
describe('POST /api/v1/games — scenario wiring', () => {
  it('calls getScenario and passes result to initGameState', async () => {
    const app = await buildApp();
    getScenario.mockReturnValue({ id: 'v1', turnStructure: {} });
    await request(app).post('/api/v1/games').send({});
    expect(getScenario).toHaveBeenCalled();
    expect(initGameState).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'v1' }),
      expect.any(String)
    );
  });
});

describe('GET /api/v1/games/:id', () => {
  it('returns 200 with game state when player session is valid (#330)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', token: 'tok-1' });
    getGame.mockReturnValue({ id: TEST_UUID, status: 'open' });
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

  it('returns 401 when session gameId does not match the route :id (#330)', async () => {
    getPlayerSession.mockReturnValue({ gameId: 'other-game', side: 'union', token: 'tok-1' });
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown game id (authenticated player) (#330)', async () => {
    getPlayerSession.mockReturnValue({ gameId: TEST_UUID, side: 'union', token: 'tok-1' });
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
  it('returns 204 and calls deleteGame + deleteGameFile (#407)', async () => {
    const app = await buildApp();
    const res = await request(app).delete(`/api/v1/games/${TEST_UUID}`);
    expect(res.status).toBe(204);
    expect(deleteGame).toHaveBeenCalledWith(TEST_UUID);
    expect(deleteGameFile).toHaveBeenCalledWith(TEST_UUID);
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

  it('returns 500 when deleteGameFile throws (#407)', async () => {
    deleteGameFile.mockRejectedValue(new Error('disk error'));
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

describe('GET /api/v1/games/:id/map-config', () => {
  it('returns 200 with gridSpec and hexes from map data (#406)', async () => {
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/map-config`);
    expect(res.status).toBe(200);
    expect(res.body.gridSpec).toMatchObject({
      cols: STUB_GRID_SPEC.cols,
      rows: STUB_GRID_SPEC.rows,
      hexWidth: STUB_GRID_SPEC.hexWidth,
      hexHeight: STUB_GRID_SPEC.hexHeight,
    });
    expect(Array.isArray(res.body.hexes)).toBe(true);
    expect(res.body.hexes.length).toBeGreaterThan(0);
  });

  it('requires no authentication — returns 200 without a player session (#406)', async () => {
    getPlayerSession.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get(`/api/v1/games/${TEST_UUID}/map-config`);
    expect(res.status).toBe(200);
  });

  it('returns 400 for a non-UUID game id', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games/not-a-uuid/map-config');
    expect(res.status).toBe(400);
  });
});
