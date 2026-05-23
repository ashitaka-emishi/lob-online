import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { DEFAULT_CALIBRATION } from '../utils/calibration.js';
import { STUB_GRID_SPEC } from '../test/fixtures.js';
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

// URL-pattern-based fetch mock for tests that need different responses per endpoint.
function makeMultiFetch(responses) {
  return vi.fn().mockImplementation((url) => {
    for (const [pattern, data] of responses) {
      if (url.includes(pattern)) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
      }
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
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

  it('mapConfigError is null by default', () => {
    const store = useGameStore();
    expect(store.mapConfigError).toBeNull();
  });
});

describe('useGameStore — loadGame', () => {
  it('calls GET /api/v1/games/:id and then /api/v1/scenarios/:scenarioId/map-config', async () => {
    const gs = makeGameState('g1');
    const fetchMock = makeMultiFetch([
      ['/api/v1/scenarios/south-mountain/map-config', { gridSpec: null, hexes: null }],
      ['/api/v1/games/g1', gs],
    ]);
    vi.stubGlobal('fetch', fetchMock);
    const store = useGameStore();
    await store.loadGame('g1');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/games/g1');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/scenarios/south-mountain/map-config');
  });

  it('populates gameState on success', async () => {
    const gs = makeGameState('g2');
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        ['/api/v1/scenarios/south-mountain/map-config', { gridSpec: null, hexes: null }],
        ['/api/v1/games/g2', gs],
      ])
    );
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

  it('leaves gridSpec and hexes null when game-state fetch fails even if map-config succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url.includes('map-config')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                gridSpec: { cols: 4, rows: 3, hexWidth: 20, hexHeight: 20, imageScale: 1 },
                hexes: [],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      })
    );
    const store = useGameStore();
    await store.loadGame('g-fail');
    expect(store.gameState).toBeNull();
    expect(store.gridSpec).toBeNull();
    expect(store.hexes).toBeNull();
    expect(store.error).toBeTruthy();
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

describe('useGameStore — gridSpec and hexes from /map-config (#406)', () => {
  const STUB_HEXES = [{ id: '01.01', terrain: 'clear', elevation: 0, edges: {} }];

  it('gridSpec and hexes are null before any load', () => {
    const store = useGameStore();
    expect(store.gridSpec).toBeNull();
    expect(store.hexes).toBeNull();
  });

  it('populates gridSpec and hexes when /map-config responds successfully', async () => {
    const gs = makeGameState('g1');
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        [
          '/api/v1/scenarios/south-mountain/map-config',
          { gridSpec: STUB_GRID_SPEC, hexes: STUB_HEXES },
        ],
        ['/api/v1/games/g1', gs],
      ])
    );
    const store = useGameStore();
    await store.loadGame('g1');
    // sanitizeCalibration fills in all DEFAULT_CALIBRATION defaults on top of STUB_GRID_SPEC
    expect(store.gridSpec).toEqual({ ...DEFAULT_CALIBRATION, ...STUB_GRID_SPEC });
    expect(store.hexes).toEqual(STUB_HEXES);
    expect(store.gameState).toEqual(gs);
  });

  it('leaves gridSpec and hexes null when /map-config fetch rejects (non-fatal)', async () => {
    const gs = makeGameState('g2');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url.includes('map-config')) return Promise.reject(new Error('network'));
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(gs) });
      })
    );
    const store = useGameStore();
    await store.loadGame('g2');
    expect(store.gridSpec).toBeNull();
    expect(store.hexes).toBeNull();
    expect(store.gameState).toEqual(gs);
    expect(store.error).toBeNull();
    expect(store.mapConfigError).toBeTruthy();
    expect(store.loading).toBe(false);
  });

  it('clears mapConfigError on successful map-config fetch', async () => {
    const gs = makeGameState('g3');
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        ['/api/v1/scenarios/south-mountain/map-config', { gridSpec: STUB_GRID_SPEC, hexes: [] }],
        ['/api/v1/games/g3', gs],
      ])
    );
    const store = useGameStore();
    await store.loadGame('g3');
    expect(store.mapConfigError).toBeNull();
  });

  it('sanitizes gridSpec at the store boundary — bad numeric falls back to default (#425)', async () => {
    const gs = makeGameState('g4');
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        [
          '/api/v1/scenarios/south-mountain/map-config',
          {
            gridSpec: { cols: NaN, rows: 35, hexWidth: 40, hexHeight: 40, imageScale: 1 },
            hexes: [],
          },
        ],
        ['/api/v1/games/g4', gs],
      ])
    );
    const store = useGameStore();
    await store.loadGame('g4');
    // cols: NaN should be sanitized to the default (64)
    expect(store.gridSpec.cols).toBe(64);
    expect(store.gridSpec.rows).toBe(35);
  });

  it('treats malformed JSON in map-config 200 response as non-fatal mapConfigError', async () => {
    const gs = makeGameState('g5');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url.includes('map-config')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.reject(new SyntaxError('bad json')),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(gs) });
      })
    );
    const store = useGameStore();
    await store.loadGame('g5');
    expect(store.gameState).toEqual(gs);
    expect(store.error).toBeNull();
    expect(store.mapConfigError).toBeTruthy();
    expect(store.gridSpec).toBeNull();
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
