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

// Minimal valid succession payload matching SuccessionSchema
const VALID_SUCCESSION = {
  _status: 'draft',
  _source: 'test',
  union: [
    {
      id: 'burnside-9corps',
      name: 'Ambrose E. Burnside (9 Corps)',
      baseLeaderId: 'burnside',
      commandLevel: 'corps',
      commandsId: '9c',
      commandValue: null,
      moraleValue: null,
    },
  ],
  confederate: [
    {
      id: 'walker-promoted',
      name: 'Col Joseph Walker (Promoted)',
      baseLeaderId: 'walker',
      commandLevel: 'brigade',
      commandsId: null,
      commandValue: 0,
      moraleValue: 1,
    },
  ],
};

async function buildApp() {
  const { default: router } = await import('./successionEditor.js');
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/', router);
  return app;
}

// Schema-specific tests only — generic GET/PUT/backup behavior is covered
// in editorRouteFactory.test.js. (#346)

describe('GET /data (successionEditor)', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SUCCESSION));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body._status).toBe('draft');
    expect(res.body.union[0].id).toBe('burnside-9corps');
    expect(res.body.confederate[0].id).toBe('walker-promoted');
  });
});

describe('PUT /data (successionEditor)', () => {
  it('accepts valid body', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SUCCESSION);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ _status: 'draft' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });
});
