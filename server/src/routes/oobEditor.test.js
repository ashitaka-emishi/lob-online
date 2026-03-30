import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  unlinkSync: vi.fn(),
}));

// eslint-disable-next-line import/order
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';

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

describe('GET /data (oobEditor)', () => {
  it('returns parsed JSON from file', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_OOB));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body._status).toBe('draft');
    expect(res.body.union.army).toBe('Army of the Potomac');
  });
});

describe('PUT /data (oobEditor)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_OOB);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ _status: 'draft' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('creates backup file before main write when current file exists', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_OOB));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_OOB);
    expect(res.status).toBe(200);
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_OOB);
    const writtenJson = writeFileSync.mock.calls[0][1];
    const written = JSON.parse(writtenJson);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_OOB);
    expect(res.status).toBe(200);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('returns 500 when backup write throws', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_OOB));
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_OOB);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_OOB));
    const existing = Array.from(
      { length: 21 },
      (_, i) => `oob-2026-03-${String(i + 1).padStart(2, '0')}.json`
    );
    readdirSync.mockReturnValue(existing);
    const app = await buildApp();
    await request(app).put('/data').send(VALID_OOB);
    expect(unlinkSync).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdirSync', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_OOB);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), {
      recursive: true,
    });
  });
});
