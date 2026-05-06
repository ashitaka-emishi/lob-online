import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('../stores/lobby.js', () => ({
  useLobbyStore: vi.fn(),
}));

import { useLobbyStore } from '../stores/lobby.js';
import LobbyView from './LobbyView.vue';

const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    { path: '/lobby', component: { template: '<div/>' } },
    { path: '/games/:id', component: { template: '<div/>' } },
  ],
});

function makeStore(overrides = {}) {
  return {
    games: [],
    myGameId: null,
    mySide: null,
    loading: false,
    error: null,
    fetchGames: vi.fn(),
    createGame: vi.fn(),
    joinGame: vi.fn(),
    ...overrides,
  };
}

function mountLobby(storeOverrides = {}) {
  setActivePinia(createPinia());
  useLobbyStore.mockReturnValue(makeStore(storeOverrides));
  return mount(LobbyView, {
    global: { plugins: [stubRouter] },
  });
}

describe('LobbyView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the lobby heading', () => {
    const wrapper = mountLobby();
    expect(wrapper.text()).toContain('Game Lobby');
  });

  it('calls fetchGames on mount', () => {
    const fetchGames = vi.fn();
    mountLobby({ fetchGames });
    expect(fetchGames).toHaveBeenCalledOnce();
  });

  it('renders a game row for each game in the store', () => {
    const wrapper = mountLobby({
      games: [
        { id: 'g1', status: 'open' },
        { id: 'g2', status: 'active' },
      ],
    });
    const rows = wrapper.findAll('[data-testid="game-row"]');
    expect(rows).toHaveLength(2);
  });

  it('shows "No games" message when list is empty', () => {
    const wrapper = mountLobby({ games: [] });
    expect(wrapper.text()).toContain('No games');
  });

  it('"New Game" button calls createGame', async () => {
    const createGame = vi.fn();
    const wrapper = mountLobby({ createGame });
    await wrapper.find('[data-testid="new-game-btn"]').trigger('click');
    expect(createGame).toHaveBeenCalledOnce();
  });

  it('"Join" button calls joinGame with the game id', async () => {
    const joinGame = vi.fn();
    const wrapper = mountLobby({
      games: [{ id: 'g1', status: 'open' }],
      joinGame,
    });
    await wrapper.find('[data-testid="join-btn"]').trigger('click');
    expect(joinGame).toHaveBeenCalledWith('g1');
  });

  it('"Join" button is disabled for active (full) games', () => {
    const wrapper = mountLobby({
      games: [{ id: 'g2', status: 'active' }],
    });
    const joinBtn = wrapper.find('[data-testid="join-btn"]');
    expect(joinBtn.attributes('disabled')).toBeDefined();
  });

  it('shows assigned side after create/join', () => {
    const wrapper = mountLobby({ myGameId: 'g1', mySide: 'union' });
    expect(wrapper.text()).toContain('union');
  });

  it('shows error message when store has error', () => {
    const wrapper = mountLobby({ error: 'Failed to create game: 500' });
    expect(wrapper.text()).toContain('Failed to create game');
  });
});
