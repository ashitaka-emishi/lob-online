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

import passport from '../auth/discord.js';
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

// #700 — the Discord strategy dispatch itself (as opposed to the surrounding routing/session
// infrastructure, already covered by games.auth-integration.test.js's dev-auth flow) had no
// direct route-level test. router.get(path, passport.authenticate(...)) calls
// passport.authenticate() once, at module-eval time (when auth.js is imported above), to build
// the middleware — the mocked passport.authenticate.mock.calls already reflect both routes'
// registration by the time these tests run.
describe('GET /auth/discord', () => {
  it("dispatches passport.authenticate('discord') with no options (no failureRedirect)", () => {
    expect(passport.authenticate).toHaveBeenCalledWith('discord');
  });
});

describe('GET /auth/discord/callback', () => {
  it("dispatches passport.authenticate('discord', { failureRedirect: '/?error=auth' })", () => {
    expect(passport.authenticate).toHaveBeenCalledWith('discord', {
      failureRedirect: '/?error=auth',
    });
  });

  it('redirects to / after passport.authenticate succeeds and calls next()', () => {
    const layer = authRouter.stack.find(
      (l) => l.route?.path === '/discord/callback' && l.route?.methods?.get
    );
    // Second middleware in the stack — the route's own success handler, run after
    // passport.authenticate's mocked middleware (stack[0]) calls next().
    const successHandler = layer.route.stack[1].handle;
    const res = { redirect: vi.fn() };
    successHandler({}, res);
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});

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
