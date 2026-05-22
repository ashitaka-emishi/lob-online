import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(() => Promise.resolve()),
  rename: vi.fn(() => Promise.resolve()),
  mkdir: vi.fn(() => Promise.resolve()),
  readdir: vi.fn(() => Promise.resolve([])),
  unlink: vi.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line import/order
import { readFile } from 'fs/promises';

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

// Schema-specific tests only — generic GET/PUT/backup behavior is covered
// in editorRouteFactory.test.js. (#346)

describe('GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.scenario).toBe('south-mountain');
  });
});

describe('PUT /data', () => {
  it('accepts valid map body', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ layout: 'pointy-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it('rejects wrong layout value with 400', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({ ...VALID_MAP, layout: 'flat-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
