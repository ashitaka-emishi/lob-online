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
        initiativeRating: null,
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

describe('GET /data (leadersEditor)', () => {
  it('returns parsed JSON from file', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_LEADERS));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body._status).toBe('draft');
    expect(res.body.union.army[0].id).toBe('mcclellan');
  });
});

describe('PUT /data (leadersEditor)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_LEADERS);
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
    readFileSync.mockReturnValue(JSON.stringify(VALID_LEADERS));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_LEADERS);
    expect(res.status).toBe(200);
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_LEADERS);
    const writtenJson = writeFileSync.mock.calls[0][1];
    const written = JSON.parse(writtenJson);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_LEADERS);
    expect(res.status).toBe(200);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('returns 500 when backup write throws', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_LEADERS));
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_LEADERS);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_LEADERS));
    const existing = Array.from(
      { length: 21 },
      (_, i) => `leaders-2026-03-${String(i + 1).padStart(2, '0')}.json`
    );
    readdirSync.mockReturnValue(existing);
    const app = await buildApp();
    await request(app).put('/data').send(VALID_LEADERS);
    expect(unlinkSync).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdirSync', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_LEADERS);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), {
      recursive: true,
    });
  });
});
