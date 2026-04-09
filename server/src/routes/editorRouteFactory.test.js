import { join } from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(() => Promise.resolve()),
  mkdir: vi.fn(() => Promise.resolve()),
  readdir: vi.fn(() => Promise.resolve([])),
  unlink: vi.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line import/order
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { createEditorRoute } from './editorRouteFactory.js';

const TEST_SCHEMA = z.object({ name: z.string() });
const VALID_BODY = { name: 'Test' };
const FILE_PATH = '/data/test.json';
const BACKUP_DIR = '/data/backups';
const FILE_PREFIX = 'test';

function buildApp(overrides = {}) {
  const router = createEditorRoute({
    schema: TEST_SCHEMA,
    filePath: FILE_PATH,
    filePrefix: FILE_PREFIX,
    backupDir: BACKUP_DIR,
    ...overrides,
  });
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

describe('createEditorRoute — GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify({ name: 'Hello' }));
    const res = await request(buildApp()).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Hello');
  });

  it('returns 500 when readFile throws', async () => {
    readFile.mockRejectedValue(new Error('ENOENT'));
    const res = await request(buildApp()).get('/data');
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
  });

  it('uses custom readErrorMessage when provided', async () => {
    readFile.mockRejectedValue(new Error('fail'));
    const res = await request(buildApp({ readErrorMessage: 'custom error' })).get('/data');
    expect(res.body.message).toBe('custom error');
  });
});

describe('createEditorRoute — PUT /data', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readFile.mockRejectedValue({ code: 'ENOENT' });
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
    readdir.mockResolvedValue([]);
    unlink.mockResolvedValue(undefined);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const res = await request(buildApp()).put('/data').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const res = await request(buildApp()).put('/data').send({ wrong: 'field' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('creates backup before main write when current file exists', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_BODY));
    const res = await request(buildApp()).put('/data').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(writeFile).toHaveBeenCalledTimes(2);
    const backupCall = writeFile.mock.calls[0];
    expect(backupCall[0]).toContain('test-');
  });

  it('returns 500 when backup writeFile throws', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_BODY));
    writeFile.mockRejectedValueOnce(new Error('disk full'));
    const res = await request(buildApp()).put('/data').send(VALID_BODY);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it('returns 500 when final writeFile throws', async () => {
    writeFile.mockRejectedValueOnce(new Error('permission denied'));
    const res = await request(buildApp()).put('/data').send(VALID_BODY);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Write failed');
  });

  it('stamps _savedAt on written data', async () => {
    const before = Date.now();
    await request(buildApp()).put('/data').send(VALID_BODY);
    const written = JSON.parse(writeFile.mock.calls[0][1]);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const res = await request(buildApp()).put('/data').send(VALID_BODY);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('trims backups when count exceeds maxBackups', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_BODY));
    const existing = Array.from({ length: 6 }, (_, i) => `test-2026-0${i + 1}.json`);
    readdir.mockResolvedValue(existing);
    await request(buildApp({ maxBackups: 5 }))
      .put('/data')
      .send(VALID_BODY);
    expect(unlink).toHaveBeenCalledOnce();
    expect(unlink).toHaveBeenCalledWith(join(BACKUP_DIR, 'test-2026-01.json'));
  });

  it('calls mkdir on backupDir with recursive: true', async () => {
    await request(buildApp()).put('/data').send(VALID_BODY);
    expect(mkdir).toHaveBeenCalledWith(BACKUP_DIR, { recursive: true });
  });
});
