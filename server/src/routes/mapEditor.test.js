import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock fs before importing the router
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  unlinkSync: vi.fn(),
}));

// Import mocks after vi.mock hoisting (eslint-disable required: vi.mock is hoisted by vitest)
// eslint-disable-next-line import/order
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';

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
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // readFileSync returns undefined (cleared) → no backup → writeFileSync called once (main write)
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

  it('creates backup file before main write when current file exists', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    // writeFileSync called twice: once for backup, once for main write
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_MAP);
    const writtenJson = writeFileSync.mock.calls[0][1];
    const written = JSON.parse(writtenJson);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('returns 500 when backup write throws', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_MAP));
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    // Main write must NOT have been called after backup failure
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_MAP));
    // Simulate 21 existing backup files
    const existing = Array.from(
      { length: 21 },
      (_, i) => `map-2026-03-${String(i + 1).padStart(2, '0')}.json`
    );
    readdirSync.mockReturnValue(existing);

    const app = await buildApp();
    await request(app).put('/data').send(VALID_MAP);

    // unlinkSync called once to remove the oldest backup
    expect(unlinkSync).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdirSync', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_MAP);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
  });
});
