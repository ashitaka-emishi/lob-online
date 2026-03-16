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

const VALID_CONFIG = { seedHexes: [] };

async function buildApp() {
  const { default: router } = await import('./autoDetectConfig.js');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

describe('GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.seedHexes)).toBe(true);
  });
});

describe('PUT /data', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_CONFIG);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('accepts full config with palette and seed hexes', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({
        elevationPalette: [{ elevationFeet: 250, colorName: 'low', rgb: [120, 160, 130] }],
        confidenceThreshold: 0.6,
        seedHexes: [
          {
            hexId: '10.10',
            confirmedData: { terrain: 'clear', elevation: 300, features: [] },
            cropBase64: '',
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid rgb tuple with 400', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({
        elevationPalette: [{ elevationFeet: 250, colorName: 'low', rgb: [120, 160] }],
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects confidenceThreshold out of range with 400', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ confidenceThreshold: 1.5 });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('creates backup before main write when current file exists', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_CONFIG);
    expect(res.status).toBe(200);
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_CONFIG);
    const writtenJson = writeFileSync.mock.calls[0][1];
    const written = JSON.parse(writtenJson);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_CONFIG);
    expect(res.status).toBe(200);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('returns 500 when backup write throws', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_CONFIG);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_CONFIG));
    const existing = Array.from(
      { length: 21 },
      (_, i) => `autodetect-2026-03-${String(i + 1).padStart(2, '0')}.json`
    );
    readdirSync.mockReturnValue(existing);
    const app = await buildApp();
    await request(app).put('/data').send(VALID_CONFIG);
    expect(unlinkSync).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdirSync', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_CONFIG);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('autodetect'), {
      recursive: true,
    });
  });
});
