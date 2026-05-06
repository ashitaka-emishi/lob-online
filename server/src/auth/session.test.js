import { describe, it, expect } from 'vitest';

import { setPlayerSession, getPlayerSession } from './session.js';

function mockReq(sessionData = {}) {
  return { session: { ...sessionData } };
}

describe('setPlayerSession', () => {
  it('writes gameId, side, and sideToken onto req.session', () => {
    const req = mockReq();
    setPlayerSession(req, 'game-abc', 'union', 'tok-123');
    expect(req.session.gameId).toBe('game-abc');
    expect(req.session.side).toBe('union');
    expect(req.session.sideToken).toBe('tok-123');
  });

  it('overwrites existing session data', () => {
    const req = mockReq({ gameId: 'old', side: 'confederate', sideToken: 'old-tok' });
    setPlayerSession(req, 'new-game', 'union', 'new-tok');
    expect(req.session.gameId).toBe('new-game');
    expect(req.session.side).toBe('union');
    expect(req.session.sideToken).toBe('new-tok');
  });
});

describe('getPlayerSession', () => {
  it('returns { gameId, side, token } when all fields are set', () => {
    const req = mockReq({ gameId: 'game-xyz', side: 'confederate', sideToken: 'tok-456' });
    const result = getPlayerSession(req);
    expect(result).toEqual({ gameId: 'game-xyz', side: 'confederate', token: 'tok-456' });
  });

  it('returns null when session has no gameId', () => {
    const req = mockReq({ side: 'union', sideToken: 'tok' });
    expect(getPlayerSession(req)).toBeNull();
  });

  it('returns null when session is empty', () => {
    const req = mockReq();
    expect(getPlayerSession(req)).toBeNull();
  });

  it('returns null when session has gameId but no sideToken', () => {
    const req = mockReq({ gameId: 'game-abc', side: 'union' });
    expect(getPlayerSession(req)).toBeNull();
  });
});
