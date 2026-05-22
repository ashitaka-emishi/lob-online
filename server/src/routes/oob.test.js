import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../engine/oob.js', () => ({
  loadOob: vi.fn(),
}));

import { loadOob } from '../engine/oob.js';
import oobRouter from './oob.js';

const STUB_OOB = {
  _status: 'final',
  _source: 'test',
  _errata_applied: [],
  union: { army: 'Army of the Potomac', corps: [] },
  confederate: { army: 'Army of Northern Virginia', corps: [] },
};

function makeApp() {
  const app = express();
  app.use('/api/v1/oob', oobRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/oob', () => {
  it('returns 200 with OOB data', async () => {
    vi.mocked(loadOob).mockReturnValue(STUB_OOB);
    const res = await request(makeApp()).get('/api/v1/oob');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(STUB_OOB);
  });

  it('returns 503 when OOB data fails to load', async () => {
    vi.mocked(loadOob).mockImplementation(() => {
      throw new Error('file not found');
    });
    const res = await request(makeApp()).get('/api/v1/oob');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: expect.stringContaining('OOB') });
  });

  it('calls loadOob on each request (no stale module-level cache)', async () => {
    vi.mocked(loadOob).mockReturnValue(STUB_OOB);
    const app = makeApp();
    await request(app).get('/api/v1/oob');
    await request(app).get('/api/v1/oob');
    expect(loadOob).toHaveBeenCalledTimes(2);
  });
});
