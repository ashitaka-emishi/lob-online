/**
 * Integration test for scenarios router — exercises the real loadMap path.
 * No vi.mock: loadMap reads the actual map.json from disk. (#447)
 */
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import router from './scenarios.js';

const app = express();
app.use(express.json());
app.use('/api/v1/scenarios', router);

describe('GET /api/v1/scenarios/:scenarioId/map-config — integration (#447)', () => {
  it('returns 200 with a non-empty gridSpec and hexes array from real map data', async () => {
    const res = await request(app).get('/api/v1/scenarios/south-mountain/map-config');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.body.gridSpec).toBeDefined();
    expect(typeof res.body.gridSpec.cols).toBe('number');
    expect(typeof res.body.gridSpec.rows).toBe('number');
    expect(res.body.gridSpec.cols).toBeGreaterThan(0);
    expect(res.body.gridSpec.rows).toBeGreaterThan(0);
    expect(Array.isArray(res.body.hexes)).toBe(true);
    expect(res.body.hexes.length).toBeGreaterThan(0);
    expect(res.body.hexes[0]).toHaveProperty('hex');
    expect(res.body.hexes[0]).toHaveProperty('terrain');
  });
});
