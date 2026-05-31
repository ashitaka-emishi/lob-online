import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../engine/oob.js', () => ({
  loadLeaders: vi.fn(),
  loadOob: vi.fn(),
}));

import { loadLeaders } from '../engine/oob.js';

const STUB_LEADERS = {
  union: { army: { id: 'mcclellan', name: 'George B. McClellan', counterRef: null } },
  confederate: { army: { id: 'lee', name: 'Robert E. Lee', counterRef: null } },
};

async function buildApp() {
  const { default: router } = await import('./leaders.js');
  const app = express();
  app.use('/api/v1/leaders', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/leaders', () => {
  it('returns 200 with leaders payload', async () => {
    loadLeaders.mockReturnValue(STUB_LEADERS);
    const app = await buildApp();
    const res = await request(app).get('/api/v1/leaders');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(STUB_LEADERS);
  });

  it('calls loadLeaders on every request (no module-level cache)', async () => {
    loadLeaders.mockReturnValue(STUB_LEADERS);
    const app = await buildApp();
    await request(app).get('/api/v1/leaders');
    await request(app).get('/api/v1/leaders');
    expect(loadLeaders).toHaveBeenCalledTimes(2);
  });

  it('returns 503 with error message when loadLeaders throws', async () => {
    loadLeaders.mockImplementation(() => {
      throw new Error('file not found');
    });
    const app = await buildApp();
    const res = await request(app).get('/api/v1/leaders');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/Leaders/i);
  });
});
