import { describe, it, expect, vi } from 'vitest';

// Mock discord.js before importing auth.js to prevent passport.use() side-effects.
// #700 review, second pass — passport.authenticate.mock.calls is a module-global log, not tied
// to a specific route; asserting against it directly (as an earlier version of this file did)
// stayed green even when the two routes' authenticate() arguments were swapped in auth.js,
// since BOTH calls were still present in the log somewhere. Tagging the returned middleware with
// the args it was built from, then reading that tag off the ACTUAL registered handler for each
// route, ties the assertion to the real per-route wiring instead of the global call history.
vi.mock('../auth/discord.js', () => ({
  default: {
    authenticate: vi.fn((...args) => {
      const middleware = (_req, _res, next) => next();
      middleware._authArgs = args;
      return middleware;
    }),
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

// #700 — the args passport.authenticate() was actually called with, for the GET handler
// registered at this path (not the global mock call log — see the vi.mock comment above).
function authArgsFor(path) {
  return getHandler('get', path)._authArgs;
}

// #700 — the Discord strategy dispatch itself (as opposed to the surrounding routing/session
// infrastructure, already covered by games.auth-integration.test.js's dev-auth flow) had no
// direct route-level test.
describe('GET /auth/discord', () => {
  it("dispatches passport.authenticate('discord') with no options (no failureRedirect)", () => {
    expect(authArgsFor('/discord')).toEqual(['discord']);
  });
});

describe('GET /auth/discord/callback', () => {
  it("dispatches passport.authenticate('discord', { failureRedirect: '/?error=auth' })", () => {
    expect(authArgsFor('/discord/callback')).toEqual([
      'discord',
      { failureRedirect: '/?error=auth' },
    ]);
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
