import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useGameStore } from './useGameStore.js';

// Minimal GameState fixture matching GameStateSchema shape
const makeGameState = (id = 'game-1') => ({
  id,
  scenarioId: 'south-mountain',
  schemaVersion: '1',
  version: 0,
  turn: 1,
  phase: null,
  activePlayer: null,
  step: null,
  completedSteps: [],
  initiative: null,
  sides: { union: 'player-u', confederate: 'player-c' },
  units: {
    'unit-a': {
      id: 'unit-a',
      hex: '05.03',
      facing: 0,
      moraleState: 'normal',
      wrecked: false,
      orders: null,
      ammo: 'full',
      isOnBoard: true,
      entryTurn: null,
      isDetached: false,
    },
    'unit-b': {
      id: 'unit-b',
      hex: '07.04',
      facing: 2,
      moraleState: 'shaken',
      wrecked: false,
      orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
      ammo: 'low',
      isOnBoard: true,
      entryTurn: null,
      isDetached: false,
    },
  },
  reinforcementQueue: [],
  status: 'setup',
  leaderState: {},
  pendingResolution: null,
  activityPhase: null,
  ordersPhase: null,
});

function makeFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useGameStore — initial state', () => {
  it('gameState is null before any load', () => {
    const store = useGameStore();
    expect(store.gameState).toBeNull();
  });

  it('selectedUnitId is null by default', () => {
    const store = useGameStore();
    expect(store.selectedUnitId).toBeNull();
  });

  it('loading is false by default', () => {
    const store = useGameStore();
    expect(store.loading).toBe(false);
  });

  it('error is null by default', () => {
    const store = useGameStore();
    expect(store.error).toBeNull();
  });
});

describe('useGameStore — loadGame', () => {
  it('calls GET /api/v1/games/:id', async () => {
    const fetchMock = makeFetch(makeGameState('g1'));
    vi.stubGlobal('fetch', fetchMock);
    const store = useGameStore();
    await store.loadGame('g1');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/games/g1');
  });

  it('populates gameState on success', async () => {
    const gs = makeGameState('g2');
    vi.stubGlobal('fetch', makeFetch(gs));
    const store = useGameStore();
    await store.loadGame('g2');
    expect(store.gameState).toEqual(gs);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('sets error and leaves gameState null on fetch failure', async () => {
    vi.stubGlobal('fetch', makeFetch({}, false));
    const store = useGameStore();
    await store.loadGame('bad-id');
    expect(store.gameState).toBeNull();
    expect(store.error).toBeTruthy();
    expect(store.loading).toBe(false);
  });

  it('sets loading true during the fetch and false after', async () => {
    const gs = makeGameState();
    let resolveFetch;
    const deferred = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValue(
          deferred.then(() => ({ ok: true, status: 200, json: () => Promise.resolve(gs) }))
        )
    );
    const store = useGameStore();
    const loadPromise = store.loadGame('g');
    expect(store.loading).toBe(true);
    resolveFetch();
    await loadPromise;
    expect(store.loading).toBe(false);
  });
});

describe('useGameStore — selectUnit / deselectUnit', () => {
  it('selectUnit sets selectedUnitId', () => {
    const store = useGameStore();
    store.selectUnit('unit-a');
    expect(store.selectedUnitId).toBe('unit-a');
  });

  it('deselectUnit clears selectedUnitId', () => {
    const store = useGameStore();
    store.selectUnit('unit-a');
    store.deselectUnit();
    expect(store.selectedUnitId).toBeNull();
  });

  it('selectUnit replaces a prior selection', () => {
    const store = useGameStore();
    store.selectUnit('unit-a');
    store.selectUnit('unit-b');
    expect(store.selectedUnitId).toBe('unit-b');
  });
});

describe('useGameStore — selectedUnit computed', () => {
  it('returns null when nothing is selected', async () => {
    const gs = makeGameState();
    vi.stubGlobal('fetch', makeFetch(gs));
    const store = useGameStore();
    await store.loadGame('g');
    expect(store.selectedUnit).toBeNull();
  });

  it('returns the matching UnitState when a unit is selected', async () => {
    const gs = makeGameState();
    vi.stubGlobal('fetch', makeFetch(gs));
    const store = useGameStore();
    await store.loadGame('g');
    store.selectUnit('unit-a');
    expect(store.selectedUnit).toEqual(gs.units['unit-a']);
  });

  it('returns null when selectedUnitId does not match any unit', async () => {
    const gs = makeGameState();
    vi.stubGlobal('fetch', makeFetch(gs));
    const store = useGameStore();
    await store.loadGame('g');
    store.selectUnit('ghost-unit');
    expect(store.selectedUnit).toBeNull();
  });
});
