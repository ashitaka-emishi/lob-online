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

// Minimal valid leaders payload matching LeadersSchema
const VALID_LEADERS = {
  _status: 'draft',
  _source: 'test',
  union: {
    army: [
      {
        id: 'mcclellan',
        name: 'George B. McClellan',
        commandLevel: 'army',
        commandsId: null,
        commandValue: null,
        moraleValue: null,
      },
    ],
    corps: [],
    cavalry: [],
    divisions: [],
    brigades: [],
  },
  confederate: {
    wing: [],
    divisions: [],
    brigades: [],
  },
};

async function buildApp() {
  const { default: router } = await import('./leadersEditor.js');
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/', router);
  return app;
}

// Schema-specific tests only — generic GET/PUT/backup behavior is covered
// in editorRouteFactory.test.js. (#346)

describe('GET /data (leadersEditor)', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_LEADERS));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body._status).toBe('draft');
    expect(res.body.union.army[0].id).toBe('mcclellan');
  });
});

describe('PUT /data (leadersEditor)', () => {
  it('accepts valid body', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_LEADERS);
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
