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

  it('does not set req.side on 403 (no game-side session)', () => {
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

  // #698 — was 401 until this review. requireAuth (server.js) runs before this middleware on
  // every route and already guarantees the caller is authenticated, so this branch means "no
  // game-side session for this game," not "we don't know who you are" — 403 matches the
  // identical semantics of the wrong-game-session check right below.
  it('returns 403 when there is no game-side session — does not hit the DB', () => {
    const req = { params: { id: 'game-abc' }, session: {} };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
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

  it('returns 403 when session is missing sideToken — does not hit the DB', () => {
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
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

  // ── Identity ownership check (#m9-discord-oauth review) ────────────────────────

  it('calls next() when req.user.id matches the DB-recorded owner of the matched side', () => {
    getGame.mockReturnValue({ ...ACTIVE_ROW, side_a_user_id: 'user-1' });
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
      user: { id: 'user-1' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 403 when req.user.id does not match the DB-recorded owner (token valid, wrong identity)', () => {
    getGame.mockReturnValue({ ...ACTIVE_ROW, side_a_user_id: 'user-1' });
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
      user: { id: 'someone-else' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  it('calls next() when the matched side has no recorded owner (legacy/pre-migration row)', () => {
    // side_a_user_id absent entirely — must not be treated as "owner is undefined, reject"
    getGame.mockReturnValue(ACTIVE_ROW);
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'union', sideToken: 'tok-a' },
      user: { id: 'anyone' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('checks ownership against the correct column for side B', () => {
    getGame.mockReturnValue({ ...ACTIVE_ROW, side_b_user_id: 'user-2' });
    const req = {
      params: { id: 'game-abc' },
      session: { gameId: 'game-abc', side: 'confederate', sideToken: 'tok-b' },
      user: { id: 'someone-else' },
    };
    const res = mockRes();
    const next = vi.fn();
    requireSide(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });
});
