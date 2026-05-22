import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useLobbyStore } from './lobby.js';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockPush.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLobbyStore — fetchGames', () => {
  it('populates games list on success', async () => {
    const games = [
      { id: 'g1', status: 'open' },
      { id: 'g2', status: 'active' },
    ];
    vi.stubGlobal('fetch', mockFetch(games));
    const store = useLobbyStore();
    await store.fetchGames();
    expect(store.games).toEqual(games);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false));
    const store = useLobbyStore();
    await store.fetchGames();
    expect(store.games).toEqual([]);
    expect(store.error).toBeTruthy();
  });
});

describe('useLobbyStore — createGame', () => {
  it('sets myGameId and mySide on success', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'game-new', side: 'confederate' }));
    const store = useLobbyStore();
    await store.createGame();
    expect(store.myGameId).toBe('game-new');
    expect(store.mySide).toBe('confederate');
  });

  it('navigates to /games/:id after success (#407)', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'game-new', side: 'confederate' }));
    const store = useLobbyStore();
    await store.createGame();
    expect(mockPush).toHaveBeenCalledWith('/games/game-new');
  });

  it('calls POST /api/v1/games', async () => {
    const fetchMock = mockFetch({ id: 'g1', side: 'confederate' });
    vi.stubGlobal('fetch', fetchMock);
    const store = useLobbyStore();
    await store.createGame();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/games',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sets error on failure and does not navigate', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false));
    const store = useLobbyStore();
    await store.createGame();
    expect(store.myGameId).toBeNull();
    expect(store.error).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('useLobbyStore — deleteGame', () => {
  it('calls DELETE /api/v1/games/:id and refreshes the list (#407)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve(null) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ id: 'g2', status: 'open' }]),
      });
    vi.stubGlobal('fetch', fetchMock);
    const store = useLobbyStore();
    await store.deleteGame('g1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/games/g1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
    expect(store.games).toEqual([{ id: 'g2', status: 'open' }]);
  });

  it('sets error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Game not found' }),
      })
    );
    const store = useLobbyStore();
    await store.deleteGame('missing');
    expect(store.error).toBe('Game not found');
  });
});

describe('useLobbyStore — joinGame', () => {
  it('sets myGameId and mySide on success', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'game-join', side: 'union' }));
    const store = useLobbyStore();
    await store.joinGame('game-join', 'union');
    expect(store.myGameId).toBe('game-join');
    expect(store.mySide).toBe('union');
  });

  it('navigates to /games/:id after success (#407)', async () => {
    vi.stubGlobal('fetch', mockFetch({ id: 'game-join', side: 'union' }));
    const store = useLobbyStore();
    await store.joinGame('game-join', 'union');
    expect(mockPush).toHaveBeenCalledWith('/games/game-join');
  });

  it('sends side in request body (#407)', async () => {
    const fetchMock = mockFetch({ id: 'gx', side: 'union' });
    vi.stubGlobal('fetch', fetchMock);
    const store = useLobbyStore();
    await store.joinGame('gx', 'union');
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ side: 'union' });
  });

  it('calls POST /api/v1/games/:id/join', async () => {
    const fetchMock = mockFetch({ id: 'gx', side: 'union' });
    vi.stubGlobal('fetch', fetchMock);
    const store = useLobbyStore();
    await store.joinGame('gx', 'union');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/games/gx/join',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sets error on 409 (game full) and does not navigate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Game is already full' }),
      })
    );
    const store = useLobbyStore();
    await store.joinGame('full-game', 'union');
    expect(store.myGameId).toBeNull();
    expect(store.error).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
