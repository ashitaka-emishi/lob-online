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

// Minimal valid OOB matching OOBSchema
const VALID_OOB = {
  _status: 'draft',
  _source: 'test',
  _errata_applied: [],
  union: {
    army: 'Army of the Potomac',
    supplyTrain: { id: 'supply', name: 'Supply Train' },
    corps: [
      {
        id: 'test-corps',
        name: 'Test Corps',
        divisions: [
          {
            id: 'test-div',
            name: 'Test Division',
            wreckThreshold: 2,
            brigades: [
              {
                id: 'test-brig',
                wreckThreshold: 3,
                regiments: [
                  {
                    id: 'test-unit',
                    name: '22nd NY',
                    type: 'infantry',
                    morale: 'B',
                    weapon: 'R',
                    strengthPoints: 4,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    cavalryDivision: {
      id: 'test-cav',
      name: 'Test Cavalry',
      brigades: [
        {
          id: 'fcav',
          wreckThreshold: 1,
          regiments: [],
        },
      ],
    },
  },
  confederate: {
    army: 'Army of Northern Virginia',
    wing: 'Right Wing',
    supplyWagon: { id: 'wagon', name: 'Supply Wagon' },
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    divisions: [],
  },
};

async function buildApp() {
  const { default: router } = await import('./oobEditor.js');
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/', router);
  return app;
}

// Schema-specific tests only — generic GET/PUT/backup behavior is covered
// in editorRouteFactory.test.js. (#346)

describe('GET /data (oobEditor)', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_OOB));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body._status).toBe('draft');
    expect(res.body.union.army).toBe('Army of the Potomac');
  });
});

describe('PUT /data (oobEditor)', () => {
  it('accepts valid body', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_OOB);
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
