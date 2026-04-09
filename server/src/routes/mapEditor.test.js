import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(() => Promise.resolve()),
  mkdir: vi.fn(() => Promise.resolve()),
  readdir: vi.fn(() => Promise.resolve([])),
  unlink: vi.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line import/order
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';

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
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.scenario).toBe('south-mountain');
  });
});

describe('PUT /data', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readFile.mockRejectedValue({ code: 'ENOENT' });
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
    readdir.mockResolvedValue([]);
    unlink.mockResolvedValue(undefined);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ layout: 'pointy-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects wrong layout value with 400', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({ ...VALID_MAP, layout: 'flat-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('creates backup file before main write when current file exists', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(2);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_MAP);
    const writtenJson = writeFile.mock.calls[0][1];
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
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    writeFile.mockRejectedValueOnce(new Error('disk full'));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const existing = Array.from(
      { length: 21 },
      (_, i) => `map-2026-03-${String(i + 1).padStart(2, '0')}.json`
    );
    readdir.mockResolvedValue(existing);
    const app = await buildApp();
    await request(app).put('/data').send(VALID_MAP);
    expect(unlink).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdir', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_MAP);
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
  });
});
