import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock fs before importing the router
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Import mocks after vi.mock hoisting (eslint-disable required: vi.mock is hoisted by vitest)
// eslint-disable-next-line import/order
import { readFileSync, writeFileSync } from 'fs';

const VALID_MAP = {
  _status: 'draft',
  scenario: 'south-mountain',
  layout: 'pointy-top',
  vpHexes: [],
  hexes: [],
};

async function buildApp() {
  const { default: router } = await import('./mapEditor.js');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

describe('GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.scenario).toBe('south-mountain');
  });
});

describe('PUT /data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ layout: 'pointy-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects wrong layout value with 400', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({ ...VALID_MAP, layout: 'flat-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
