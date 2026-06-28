import { describe, it, expect, vi } from 'vitest';

// Mock discord.js before importing auth.js to prevent passport.use() side-effects
vi.mock('../auth/discord.js', () => ({
  default: {
    authenticate: vi.fn(() => (_req, _res, next) => next()),
    session: vi.fn(() => (_req, _res, next) => next()),
    initialize: vi.fn(() => (_req, _res, next) => next()),
  },
  configurePassport: vi.fn(),
}));

import authRouter from './auth.js';

function mockRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => {
    res._status = code;
    return res;
  };
  res.json = (body) => {
    res._body = body;
    return res;
  };
  return res;
}

function getHandler(method, path) {
  const layer = authRouter.stack.find((l) => l.route?.path === path && l.route?.methods?.[method]);
  return layer?.route?.stack?.[0]?.handle;
}

describe('GET /auth/me', () => {
  it('returns 401 when req.user is absent', () => {
    const handler = getHandler('get', '/me');
    const req = {};
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Unauthorized' });
  });

  it('returns the user object when req.user is set', () => {
    const handler = getHandler('get', '/me');
    const user = { id: 'dev-1234', username: 'DevUser 1234', avatar: null };
    const req = { user };
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(res._status).toBe(200);
    expect(res._body).toEqual(user);
  });
});

describe('POST /auth/logout', () => {
  it('calls req.logout and returns { ok: true }', () => {
    const handler = getHandler('post', '/logout');
    const req = { logout: vi.fn((cb) => cb(null)) };
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(req.logout).toHaveBeenCalled();
    expect(res._body).toEqual({ ok: true });
  });

  it('forwards logout errors to next()', () => {
    const handler = getHandler('post', '/logout');
    const logoutErr = new Error('session destroy error');
    const req = { logout: vi.fn((cb) => cb(logoutErr)) };
    const res = mockRes();
    const next = vi.fn();
    handler(req, res, next);
    expect(next).toHaveBeenCalledWith(logoutErr);
  });
});
