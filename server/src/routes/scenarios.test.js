import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

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

async function buildApp() {
  const { default: router } = await import('./scenarios.js');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/scenarios', router);
  return app;
}

describe('GET /api/v1/scenarios/:scenarioId/map-config', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns 200 with gridSpec and hexes (#421)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/scenarios/south-mountain/map-config');
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

  it('requires no authentication — returns 200 without a player session (#421)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/scenarios/south-mountain/map-config');
    expect(res.status).toBe(200);
  });

  it('sets Cache-Control: public, max-age=3600 (#430)', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/scenarios/south-mountain/map-config');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });

  it('returns 404 for an unknown scenarioId', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/v1/scenarios/unknown-battle/map-config');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Unknown scenario' });
  });
});

// 503 startup-error branch requires module re-evaluation — isolated in its own
// describe block so beforeEach/afterEach scoped resets don't affect other tests. (#442)
describe('GET /api/v1/scenarios/:scenarioId/map-config — startup error', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('returns 503 when map data failed to load at startup (#421)', async () => {
    const { loadMap } = await import('../engine/map.js');
    loadMap.mockImplementationOnce(() => {
      throw new Error('map load failed');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { default: router } = await import('./scenarios.js');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/scenarios', router);
    const res = await request(app).get('/api/v1/scenarios/south-mountain/map-config');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Map data unavailable' });
    expect(res.headers['cache-control']).toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('map data'), expect.any(String));
  });
});
