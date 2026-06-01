import { describe, expect, it, vi } from 'vitest';

import { registerGameSocket } from './gameSocket.js';

// Build a minimal socket mock with the shape the handlers need
function makeSocket({ session = {} } = {}) {
  const handlers = {};
  return {
    request: { session },
    on: vi.fn((event, fn) => {
      handlers[event] = fn;
    }),
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    // Invoke a registered event handler by name
    _trigger: (event, data) => handlers[event]?.(data),
  };
}

const TEST_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('registerGameSocket — game:join', () => {
  it('joins the game room when session gameId matches (#356)', () => {
    const socket = makeSocket({ session: { gameId: TEST_ID, side: 'union' } });
    registerGameSocket(socket);
    socket._trigger('game:join', { gameId: TEST_ID });
    expect(socket.join).toHaveBeenCalledWith(TEST_ID);
  });

  it('emits game:joined confirmation after joining (#356)', () => {
    const socket = makeSocket({ session: { gameId: TEST_ID, side: 'union' } });
    registerGameSocket(socket);
    socket._trigger('game:join', { gameId: TEST_ID });
    expect(socket.emit).toHaveBeenCalledWith('game:joined', { gameId: TEST_ID });
  });

  it('rejects join when session has no gameId (#356)', () => {
    const socket = makeSocket({ session: {} });
    registerGameSocket(socket);
    socket._trigger('game:join', { gameId: TEST_ID });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('game:error', { error: 'Unauthorized' });
  });

  it('rejects join when session gameId does not match requested gameId (#356)', () => {
    const socket = makeSocket({ session: { gameId: 'other-game', side: 'union' } });
    registerGameSocket(socket);
    socket._trigger('game:join', { gameId: TEST_ID });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('game:error', { error: 'Unauthorized' });
  });

  it('rejects join when data payload is missing (#356)', () => {
    const socket = makeSocket({ session: { gameId: TEST_ID, side: 'union' } });
    registerGameSocket(socket);
    socket._trigger('game:join', undefined);
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('game:error', { error: 'Unauthorized' });
  });
});

describe('registerGameSocket — game:leave', () => {
  it('leaves the game room (#356)', () => {
    const socket = makeSocket({ session: { gameId: TEST_ID, side: 'union' } });
    registerGameSocket(socket);
    socket._trigger('game:leave', { gameId: TEST_ID });
    expect(socket.leave).toHaveBeenCalledWith(TEST_ID);
  });

  it('is a no-op when gameId is omitted (#356)', () => {
    const socket = makeSocket({ session: { gameId: TEST_ID, side: 'union' } });
    registerGameSocket(socket);
    socket._trigger('game:leave', {});
    expect(socket.leave).not.toHaveBeenCalled();
  });
});
