import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

import { ModuleNotFoundError } from '../utils/moduleFolders.js';
import { errorHandler } from './errorHandler.js';

function buildApp(throwFn) {
  const app = express();
  app.get('/test', (_req, _res, next) => {
    try {
      throwFn();
    } catch (err) {
      next(err);
    }
  });
  app.use(errorHandler);
  return app;
}

describe('global error handler (#545)', () => {
  it('returns 404 JSON for ModuleNotFoundError', async () => {
    const app = buildApp(() => {
      throw new ModuleNotFoundError('UNKNOWN');
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('returns 500 JSON for generic errors', async () => {
    const app = buildApp(() => {
      throw new Error('something broke');
    });
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
