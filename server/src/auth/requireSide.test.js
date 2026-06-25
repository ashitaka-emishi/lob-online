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
  side_a_faction: 'union',
  side_b_faction: 'confederate',
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

  // ── req.side derivation (#562) ────────────────────────────────────────────────

  it('sets req.side to side_a_faction when sideToken matches side_a_token (#562)', () => {
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
    };
    const next = vi.fn();
    requireSide(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.side).toBe('union');
  });

  it('sets req.side to side_b_faction when sideToken matches side_b_token (#562)', () => {
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'confederate', sideToken: 'tok-b' },
    };
    const next = vi.fn();
    requireSide(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.side).toBe('confederate');
  });

  it('does not set req.side on 401 (no session)', () => {
    const req = { params: { id: 'game-abc' }, session: {} };
    requireSide(req, mockRes(), vi.fn());
    expect(req.side).toBeUndefined();
  });

  it('does not set req.side on 403 (wrong game)', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'other-game', side: 'union', sideToken: 'tok-a' },
    };
    requireSide(req, mockRes(), vi.fn());
    expect(req.side).toBeUndefined();
  });

  it('does not set req.side on 403 (stale token)', () => {
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'stale' },
    };
    requireSide(req, mockRes(), vi.fn());
    expect(req.side).toBeUndefined();
  });

  it('does not set req.side on 409 (game not active)', () => {
    getGame.mockReturnValue({ ...ACTIVE_ROW, status: 'open' });
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
    };
    requireSide(req, mockRes(), vi.fn());
    expect(req.side).toBeUndefined();
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

  it('returns 403 when session gameId does not match the route :id — does not hit the DB (#553)', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'other-game', side: 'union', sideToken: 'tok-a' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
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

  it('returns 409 when the game is not active but token is valid (#477)', () => {
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

  // Token check comes before status check — a stale token yields 403, not 409
  it('returns 403 (not 409) when sideToken is stale and game is not active', () => {
    getGame.mockReturnValue({ ...ACTIVE_ROW, status: 'open' });
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
