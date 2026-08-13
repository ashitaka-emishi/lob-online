/**
 * #m9-discord-oauth review finding — the auth navigation guard had zero test coverage.
 * Removing meta.requiresAuth from the lobby route, or reverting the guard to only fetchMe on
 * requiresAuth routes (the original bug: a fresh page load into "/" after the Discord OAuth
 * callback never populated auth state at all), previously broke nothing.
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SLUG } from '../stores/useModuleStore.js';
import router from './index.js';

const LOBBY_PATH = `/modules/${DEFAULT_SLUG}/scenarios/full-battle/lobby`;
const GAME_PATH = `/modules/${DEFAULT_SLUG}/scenarios/full-battle/games/test-game-id`;

describe('router auth guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', vi.fn());
  });

  it('calls fetchMe (GET /auth/me) on the first navigation, even to a non-guarded route', async () => {
    fetch.mockResolvedValue({ ok: false });
    await router.push('/about');
    expect(fetch).toHaveBeenCalledWith(
      '/auth/me',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('does not call fetchMe again on a second navigation once initialized', async () => {
    // Distinct query strings force Vue Router to treat both pushes as real navigations
    // (navigating to the router's already-current location is a no-op and would skip the
    // guard entirely, which would make this assertion pass for the wrong reason).
    fetch.mockResolvedValue({ ok: false });
    await router.push({ path: '/about', query: { t: '1' } });
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockClear();
    await router.push({ path: '/about', query: { t: '2' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('redirects to / when navigating to a requiresAuth route while logged out', async () => {
    fetch.mockResolvedValue({ ok: false });
    await router.push(LOBBY_PATH);
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('allows navigation to a requiresAuth route when logged in', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'u1', username: 'Alice' }) });
    await router.push(LOBBY_PATH);
    expect(router.currentRoute.value.path).toBe(LOBBY_PATH);
  });

  it('does not redirect away from a non-guarded route while logged out', async () => {
    fetch.mockResolvedValue({ ok: false });
    await router.push('/about');
    expect(router.currentRoute.value.path).toBe('/about');
  });

  // #700 — the game route had no requiresAuth guard, unlike the lobby route; a logged-out user
  // deep-linking straight to a game URL got a broken screen instead of being sent to log in
  // (the server already 401s correctly — this closes the matching client-side UX gap).
  it('redirects to / when navigating directly to a game URL while logged out', async () => {
    fetch.mockResolvedValue({ ok: false });
    await router.push(GAME_PATH);
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('allows navigation to a game URL when logged in', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'u1', username: 'Alice' }) });
    await router.push(GAME_PATH);
    expect(router.currentRoute.value.path).toBe(GAME_PATH);
  });
});
