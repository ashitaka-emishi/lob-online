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
  getGame: vi.fn(),
  listGames: vi.fn(),
}));

vi.mock('../engine/init.js', () => ({
  initGameState: vi.fn(),
}));

vi.mock('../engine/scenario.js', () => ({
  loadScenario: vi.fn(),
}));

import { setPlayerSession, getPlayerSession } from '../auth/session.js';
import { createGame, getGame, listGames, loadGame, saveGame } from '../store/index.js';
import { initGameState } from '../engine/init.js';
import { loadScenario } from '../engine/scenario.js';

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
  // Minimal session stub — gives each request its own session object
  app.use((req, _res, next) => {
    req.session = {};
    next();
  });
  app.use('/api/v1/games', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  loadScenario.mockReturnValue({ id: 'south-mountain', turnStructure: {} });
  initGameState.mockReturnValue(MINIMAL_STATE);
  createGame.mockReturnValue(TEST_UUID);
  listGames.mockReturnValue([]);
  getGame.mockReturnValue(null);
  loadGame.mockResolvedValue(MINIMAL_STATE);
});

describe('POST /api/v1/games', () => {
  it('returns 201 with id and union side', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games').send({});
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(res.body.side).toBe('union');
  });

  it('calls initGameState and saveGame', async () => {
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(initGameState).toHaveBeenCalledOnce();
    expect(saveGame).toHaveBeenCalledOnce();
    expect(createGame).toHaveBeenCalledOnce();
  });

  it('sets player session via setPlayerSession with union side (#335)', async () => {
    const app = await buildApp();
    await request(app).post('/api/v1/games').send({});
    expect(setPlayerSession).toHaveBeenCalledOnce();
    const [, , side] = setPlayerSession.mock.calls[0];
    expect(side).toBe('union');
  });
});

describe('POST /api/v1/games/:id/join', () => {
  it('returns 200 with id and confederate side', async () => {
    getGame.mockReturnValue({ id: TEST_UUID, status: 'open', side_a_token: 'tok-a' });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({});
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_UUID);
    expect(res.body.side).toBe('confederate');
  });

  it('sets player session via setPlayerSession with confederate side (#335)', async () => {
    getGame.mockReturnValue({ id: TEST_UUID, status: 'open', side_a_token: 'tok-a' });
    const app = await buildApp();
    await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({});
    expect(setPlayerSession).toHaveBeenCalledOnce();
    const [, , side] = setPlayerSession.mock.calls[0];
    expect(side).toBe('confederate');
  });

  it('returns 404 when game does not exist', async () => {
    getGame.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({});
    expect(res.status).toBe(404);
  });

  it('returns 409 when game is already full', async () => {
    getGame.mockReturnValue({ id: TEST_UUID, status: 'active' });
    const app = await buildApp();
    const res = await request(app).post(`/api/v1/games/${TEST_UUID}/join`).send({});
    expect(res.status).toBe(409);
  });

  it('returns 400 for non-UUID game id', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games/not-a-uuid/join').send({});
    expect(res.status).toBe(400);
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
