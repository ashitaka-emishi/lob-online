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
  beforeEach(() => {
    vi.resetAllMocks();
    readdir.mockResolvedValue([]);
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
    unlink.mockResolvedValue(undefined);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SUCCESSION);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ _status: 'draft' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('creates backup file before main write when current file exists', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SUCCESSION));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SUCCESSION);
    expect(res.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(2);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SUCCESSION);
    const writtenJson = writeFile.mock.calls[0][1];
    const written = JSON.parse(writtenJson);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SUCCESSION);
    expect(res.status).toBe(200);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('returns 500 when backup write throws', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SUCCESSION));
    writeFile.mockRejectedValueOnce(new Error('disk full'));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SUCCESSION);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SUCCESSION));
    const existing = Array.from(
      { length: 21 },
      (_, i) => `succession-2026-04-${String(i + 1).padStart(2, '0')}.json`
    );
    readdir.mockResolvedValue(existing);
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SUCCESSION);
    expect(unlink).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdir', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SUCCESSION);
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('backups'), {
      recursive: true,
    });
  });
});
