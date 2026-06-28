import { describe, it, expect, vi } from 'vitest';

// Import the handler by exercising it directly rather than through express routing
// to avoid the passport.use() side-effect in discord.js during test module load.
import devAuthRouter from './devAuth.js';

function mockReq(body = {}) {
  return {
    body,
    login: vi.fn((user, cb) => cb(null)),
  };
}

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

// Pull the POST /login handler out of the router stack for unit testing
function getLoginHandler() {
  const layer = devAuthRouter.stack.find((l) => l.route?.path === '/login');
  return layer?.route?.stack?.[0]?.handle;
}

describe('POST /auth/dev/login', () => {
  it('calls req.login with a synthetic user and returns { ok, user }', () => {
    const handler = getLoginHandler();
    const req = mockReq({ code: '1234' });
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(req.login).toHaveBeenCalledWith(
      { id: 'dev-1234', username: 'DevUser 1234', avatar: null },
      expect.any(Function)
    );
    expect(res._body).toEqual({
      ok: true,
      user: { id: 'dev-1234', username: 'DevUser 1234', avatar: null },
    });
  });

  it('trims whitespace from the code', () => {
    const handler = getLoginHandler();
    const req = mockReq({ code: '  5678  ' });
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(req.login).toHaveBeenCalledWith(
      { id: 'dev-5678', username: 'DevUser 5678', avatar: null },
      expect.any(Function)
    );
  });

  it('returns 400 when code is missing', () => {
    const handler = getLoginHandler();
    const req = mockReq({});
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'code is required' });
    expect(req.login).not.toHaveBeenCalled();
  });

  it('returns 400 when code is an empty string', () => {
    const handler = getLoginHandler();
    const req = mockReq({ code: '   ' });
    const res = mockRes();
    handler(req, res, vi.fn());
    expect(res._status).toBe(400);
    expect(req.login).not.toHaveBeenCalled();
  });

  it('forwards req.login errors to next()', () => {
    const handler = getLoginHandler();
    const loginErr = new Error('session error');
    const req = { body: { code: '9999' }, login: vi.fn((_, cb) => cb(loginErr)) };
    const res = mockRes();
    const next = vi.fn();
    handler(req, res, next);
    expect(next).toHaveBeenCalledWith(loginErr);
  });
});
