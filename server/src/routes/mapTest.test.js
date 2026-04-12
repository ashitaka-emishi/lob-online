/**
 * Tests for server/src/routes/mapTest.js
 *
 * All engine modules are mocked — their correctness is tested in their own
 * unit tests. These tests verify the route layer: correct HTTP shapes,
 * required-param validation, and engine call delegation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// ─── Mock engine modules ───────────────────────────────────────────────────────

vi.mock('../engine/movement.js', () => ({
  loadMap: vi.fn(),
  buildHexIndex: vi.fn(() => new Map()),
  movementPath: vi.fn(),
  movementRange: vi.fn(),
}));

vi.mock('../engine/los.js', () => ({
  computeLOS: vi.fn(),
}));

vi.mock('../engine/command-range.js', () => ({
  commandRange: vi.fn(),
  COMMAND_RADII: { brigade: 3, division: 6, corps: 8, army: 12 },
}));

vi.mock('../engine/scenario.js', () => ({
  loadScenario: vi.fn(),
}));

import { buildHexIndex, loadMap, movementPath, movementRange } from '../engine/movement.js';
import { computeLOS } from '../engine/los.js';
import { commandRange } from '../engine/command-range.js';
import { loadScenario } from '../engine/scenario.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_HEX = {
  hex: '10.10',
  terrain: 'clear',
  elevation: 0,
  wedgeElevations: [],
  hexsides: [],
};

const MOCK_HEX_11 = {
  hex: '10.11',
  terrain: 'clear',
  elevation: 0,
  wedgeElevations: [],
  hexsides: [],
};
const MOCK_HEX_12 = {
  hex: '10.12',
  terrain: 'clear',
  elevation: 0,
  wedgeElevations: [],
  hexsides: [],
};

const MOCK_MAP = {
  gridSpec: { cols: 64, rows: 35 },
  hexes: [MOCK_HEX, MOCK_HEX_11, MOCK_HEX_12],
  vpHexes: [],
  elevationSystem: { baseElevation: 500, contourInterval: 50 },
};

const MOCK_SCENARIO = { movementCosts: { movementAllowances: { leader: 12 } } };

async function buildApp() {
  const { default: router } = await import('./mapTest.js');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  loadMap.mockReturnValue(MOCK_MAP);
  loadScenario.mockReturnValue(MOCK_SCENARIO);
  buildHexIndex.mockReturnValue(
    new Map([
      ['10.10', MOCK_HEX],
      ['10.11', MOCK_HEX_11],
      ['10.12', MOCK_HEX_12],
    ])
  );
});

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

// ─── GET /movement-path ────────────────────────────────────────────────────────

describe('GET /movement-path', () => {
  it('returns path result for valid params', async () => {
    movementPath.mockReturnValue({
      path: ['10.10', '10.11'],
      costs: [
        { hex: '10.10', terrainCost: 0, hexsideCost: 0, total: 0 },
        { hex: '10.11', terrainCost: 1, hexsideCost: 0, total: 1 },
      ],
      totalCost: 1,
      impassable: false,
    });

    const app = await buildApp();
    const res = await request(app).get('/movement-path').query({
      startHex: '10.10',
      endHex: '10.11',
      formation: 'line',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      path: ['10.10', '10.11'],
      totalCost: 1,
      impassable: false,
    });
    expect(res.body.costs).toHaveLength(2);
  });

  it('returns impassable:true when path is blocked', async () => {
    movementPath.mockReturnValue({ path: null, costs: [], totalCost: Infinity, impassable: true });

    const app = await buildApp();
    const res = await request(app).get('/movement-path').query({
      startHex: '10.10',
      endHex: '10.11',
      formation: 'line',
    });

    expect(res.status).toBe(200);
    expect(res.body.impassable).toBe(true);
  });

  it('returns 400 when startHex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/movement-path').query({
      endHex: '10.11',
      formation: 'line',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when endHex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/movement-path').query({
      startHex: '10.10',
      formation: 'line',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when formation is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/movement-path').query({
      startHex: '10.10',
      endHex: '10.11',
    });
    expect(res.status).toBe(400);
  });
});

// ─── GET /movement-range ───────────────────────────────────────────────────────

describe('GET /movement-range', () => {
  it('returns reachable hex list for valid params', async () => {
    movementRange.mockReturnValue([
      { hex: '10.10', cost: 0 },
      { hex: '10.11', cost: 1 },
    ]);

    const app = await buildApp();
    const res = await request(app).get('/movement-range').query({
      hex: '10.10',
      formation: 'line',
    });

    expect(res.status).toBe(200);
    expect(res.body.reachable).toHaveLength(2);
    expect(res.body.reachable[0]).toMatchObject({ hex: '10.10', cost: 0 });
  });

  it('returns 400 when hex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/movement-range').query({ formation: 'line' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when formation is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/movement-range').query({ hex: '10.10' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /hex-info ─────────────────────────────────────────────────────────────

describe('GET /hex-info', () => {
  it('returns hex data for a known hex', async () => {
    const app = await buildApp();
    const res = await request(app).get('/hex-info').query({ hex: '10.10' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ terrain: 'clear', elevation: 0 });
  });

  it('returns 404 for an unknown hex', async () => {
    const app = await buildApp();
    const res = await request(app).get('/hex-info').query({ hex: '99.99' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when hex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/hex-info');
    expect(res.status).toBe(400);
  });
});

// ─── GET /los ─────────────────────────────────────────────────────────────────

describe('GET /los', () => {
  it('returns LOS result for valid params', async () => {
    computeLOS.mockReturnValue({
      canSee: true,
      blockedBy: null,
      trace: ['10.10', '10.11'],
    });

    const app = await buildApp();
    const res = await request(app).get('/los').query({ fromHex: '10.10', toHex: '10.11' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canSee: true, blockedBy: null });
    expect(res.body.trace).toHaveLength(2);
  });

  it('returns blocked result with blockedBy hex', async () => {
    computeLOS.mockReturnValue({
      canSee: false,
      blockedBy: { hex: '10.11', reason: 'woods' },
      trace: ['10.10', '10.11', '10.12'],
    });

    const app = await buildApp();
    const res = await request(app).get('/los').query({ fromHex: '10.10', toHex: '10.12' });

    expect(res.status).toBe(200);
    expect(res.body.canSee).toBe(false);
    expect(res.body.blockedBy).toMatchObject({ hex: '10.11', reason: 'woods' });
  });

  it('returns 400 when fromHex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/los').query({ toHex: '10.11' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when toHex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/los').query({ fromHex: '10.10' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /command-range ────────────────────────────────────────────────────────

describe('GET /command-range', () => {
  it('returns three zone arrays for valid params', async () => {
    commandRange.mockReturnValue({
      withinRadius: ['10.10', '10.11'],
      beyondRadius: ['10.12'],
      beyondRadiusFar: [],
    });

    const app = await buildApp();
    const res = await request(app).get('/command-range').query({
      hex: '10.10',
      commanderLevel: 'brigade',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      withinRadius: ['10.10', '10.11'],
      beyondRadius: ['10.12'],
      beyondRadiusFar: [],
    });
  });

  it('returns 400 when hex is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/command-range').query({ commanderLevel: 'brigade' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when commanderLevel is missing', async () => {
    const app = await buildApp();
    const res = await request(app).get('/command-range').query({ hex: '10.10' });
    expect(res.status).toBe(400);
  });
});
