import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('fs', () => ({
  readdirSync: vi.fn(() => []),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

// eslint-disable-next-line import/order
import { readdirSync, mkdirSync, existsSync } from 'fs';

async function buildApp() {
  const { default: router } = await import('./counters.js');
  const app = express();
  app.use('/', router);
  return app;
}

describe('GET /list (counters)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
  });

  it('returns an empty array when counters directory is empty', async () => {
    readdirSync.mockReturnValue([]);
    const app = await buildApp();
    const res = await request(app).get('/list');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns array of filenames', async () => {
    readdirSync.mockReturnValue(['CS1-Front_01.jpg', 'CS1-Back_01.jpg']);
    const app = await buildApp();
    const res = await request(app).get('/list');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['CS1-Front_01.jpg', 'CS1-Back_01.jpg']);
  });

  it('filters out non-image files', async () => {
    readdirSync.mockReturnValue(['CS1-Front_01.jpg', 'CS1-Back_01.png', '.DS_Store', 'readme.txt']);
    const app = await buildApp();
    const res = await request(app).get('/list');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['CS1-Front_01.jpg', 'CS1-Back_01.png']);
  });
});

describe('POST /upload (counters)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
    mkdirSync.mockReturnValue(undefined);
  });

  it('accepts a valid .jpg file upload', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/upload')
      .attach('counter', Buffer.from('fake-image-data'), {
        filename: 'CS1-Front_99.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.filename).toBe('CS1-Front_99.jpg');
  });

  it('accepts a valid .png file upload', async () => {
    const app = await buildApp();
    const res = await request(app).post('/upload').attach('counter', Buffer.from('fake-png-data'), {
      filename: 'CS1-Front_99.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects a non-image file with 400', async () => {
    const app = await buildApp();
    const res = await request(app).post('/upload').attach('counter', Buffer.from('not-an-image'), {
      filename: 'malicious.exe',
      contentType: 'application/octet-stream',
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects a file larger than 500KB with 400', async () => {
    const app = await buildApp();
    const bigBuffer = Buffer.alloc(501 * 1024, 0xff); // 501 KB
    const res = await request(app).post('/upload').attach('counter', bigBuffer, {
      filename: 'big.jpg',
      contentType: 'image/jpeg',
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects upload with no file attached with 400', async () => {
    const app = await buildApp();
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('logs a warning when uploading a file that already exists', async () => {
    existsSync.mockReturnValue(true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = await buildApp();
    await request(app).post('/upload').attach('counter', Buffer.from('fake-image-data'), {
      filename: 'existing.jpg',
      contentType: 'image/jpeg',
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('overwriting existing file'));
    warnSpy.mockRestore();
  });
});
