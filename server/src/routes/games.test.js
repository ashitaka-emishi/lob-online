import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// ─── Mock store and engine dependencies ───────────────────────────────────────

vi.mock('../store/gameFile.js', () => ({
  saveGame: vi.fn().mockResolvedValue(undefined),
  loadGame: vi.fn(),
}));

vi.mock('../store/gameSqlite.js', () => ({
  initDb: vi.fn(),
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

import { saveGame, loadGame } from '../store/gameFile.js';
import { createGame, getGame, listGames } from '../store/gameSqlite.js';
import { initGameState } from '../engine/init.js';
import { loadScenario } from '../engine/scenario.js';

const MINIMAL_STATE = {
  id: 'game-abc',
  scenarioId: 'south-mountain',
  turn: 1,
  phase: 'setup',
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
  createGame.mockReturnValue('game-abc');
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
});

describe('POST /api/v1/games/:id/join', () => {
  it('returns 200 with id and confederate side', async () => {
    getGame.mockReturnValue({ id: 'game-abc', status: 'open', side_a_token: 'tok-a' });
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games/game-abc/join').send({});
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('game-abc');
    expect(res.body.side).toBe('confederate');
  });

  it('returns 404 when game does not exist', async () => {
    getGame.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games/nope/join').send({});
    expect(res.status).toBe(404);
  });

  it('returns 409 when game is already full', async () => {
    getGame.mockReturnValue({ id: 'game-abc', status: 'active' });
    const app = await buildApp();
    const res = await request(app).post('/api/v1/games/game-abc/join').send({});
    expect(res.status).toBe(409);
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
  it('returns 200 with game state', async () => {
    getGame.mockReturnValue({ id: 'game-abc', status: 'open' });
    loadGame.mockResolvedValue(MINIMAL_STATE);
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games/game-abc');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('game-abc');
    expect(res.body.turn).toBe(1);
  });

  it('returns 404 for unknown game id', async () => {
    getGame.mockReturnValue(null);
    const app = await buildApp();
    const res = await request(app).get('/api/v1/games/unknown');
    expect(res.status).toBe(404);
  });
});
