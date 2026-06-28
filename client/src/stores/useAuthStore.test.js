import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from './useAuthStore.js';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAuthStore', () => {
  it('starts with currentUser null and isLoggedIn false', () => {
    const store = useAuthStore();
    expect(store.currentUser).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(store.initialized).toBe(false);
  });

  it('fetchMe sets currentUser on 200 response', async () => {
    const user = { id: 'u1', username: 'Alice', avatar: null };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => user });
    const store = useAuthStore();
    await store.fetchMe();
    expect(store.currentUser).toEqual(user);
    expect(store.isLoggedIn).toBe(true);
    expect(store.initialized).toBe(true);
  });

  it('fetchMe sets currentUser to null on 401', async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    const store = useAuthStore();
    await store.fetchMe();
    expect(store.currentUser).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(store.initialized).toBe(true);
  });

  it('fetchMe sets currentUser to null on network error', async () => {
    fetch.mockRejectedValueOnce(new Error('network error'));
    const store = useAuthStore();
    await store.fetchMe();
    expect(store.currentUser).toBeNull();
    expect(store.initialized).toBe(true);
  });

  it('logout clears currentUser and calls POST /auth/logout', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'u1', username: 'Alice', avatar: null }),
    });
    const store = useAuthStore();
    await store.fetchMe();
    expect(store.isLoggedIn).toBe(true);

    fetch.mockResolvedValueOnce({ ok: true });
    await store.logout();
    expect(store.currentUser).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(fetch).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('logout clears currentUser even when the request fails', async () => {
    const store = useAuthStore();
    store.currentUser = { id: 'u1', username: 'Alice', avatar: null };
    fetch.mockRejectedValueOnce(new Error('network error'));
    await store.logout();
    expect(store.currentUser).toBeNull();
  });
});
