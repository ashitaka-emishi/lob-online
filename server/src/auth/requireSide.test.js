import { describe, it, expect, vi } from 'vitest';

import { requireSide } from './requireSide.js';

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

describe('requireSide', () => {
  it('calls next() when the session matches the requested game id', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-1' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(200);
  });

  it('returns 401 when there is no session', () => {
    const req = { params: { id: 'game-abc' }, session: {} };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it('returns 401 when session gameId does not match the route :id', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'other-game', side: 'union', sideToken: 'tok-1' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it('returns 401 when session is missing sideToken', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });
});
