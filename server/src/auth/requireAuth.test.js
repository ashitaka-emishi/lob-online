import { describe, expect, it, vi } from 'vitest';

import { requireAuth } from './requireAuth.js';

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

// #m9-discord-oauth review finding — this gate had 0% test coverage; server.js mounts it
// ahead of the entire games router (app.use('/api/v1/games', requireAuth, gamesRouter)) with
// nothing verifying it actually rejects. Deleting the mount line previously broke no tests.
describe('requireAuth', () => {
  it('returns 401 when req.user is absent', () => {
    const req = {};
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when req.user is null', () => {
    const req = { user: null };
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  // passport's deserializeUser can produce req.user === false (see discord.js) when a
  // session references a user id that no longer resolves — must be rejected, not truthy-checked
  it('returns 401 when req.user is false (deserializeUser could not resolve the session id)', () => {
    const req = { user: false };
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it('calls next() when req.user is a truthy object', () => {
    const req = { user: { id: 'user-1', username: 'Test' } };
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(200);
  });
});
