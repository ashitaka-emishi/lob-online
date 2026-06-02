import { describe, it, expect, vi, afterEach } from 'vitest';

import { getGame } from '../store/index.js';
import { requireSide } from './requireSide.js';

vi.mock('../store/index.js', () => ({
  getGame: vi.fn(),
}));

const ACTIVE_ROW = {
  id: 'game-abc',
  status: 'active',
  side_a_token: 'tok-a',
  side_b_token: 'tok-b',
};

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

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireSide', () => {
  it('calls next() when the session matches the game and sideToken is valid (side A)', () => {
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(200);
  });

  it('calls next() for side B sideToken as well', () => {
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'confederate', sideToken: 'tok-b' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 when there is no session — does not hit the DB', () => {
    const req = { params: { id: 'game-abc' }, session: {} };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(getGame).not.toHaveBeenCalled();
  });

  it('returns 401 when session gameId does not match the route :id — does not hit the DB', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'other-game', side: 'union', sideToken: 'tok-a' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(getGame).not.toHaveBeenCalled();
  });

  it('returns 401 when session is missing sideToken — does not hit the DB', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(getGame).not.toHaveBeenCalled();
  });

  // ── DB validation (#477) ─────────────────────────────────────────────────────

  it('returns 404 when the game row no longer exists in the DB (#477)', () => {
    getGame.mockReturnValue(null);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(404);
  });

  it('returns 409 when the game is not active (#477)', () => {
    getGame.mockReturnValue({ ...ACTIVE_ROW, status: 'open' });
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(409);
  });

  it('returns 403 when session sideToken does not match DB record (#477)', () => {
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'stale-token' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });
});
