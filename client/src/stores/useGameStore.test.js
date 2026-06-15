import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { DEFAULT_CALIBRATION } from '../utils/calibration.js';
import { STUB_GRID_SPEC_WIRE as STUB_GRID_SPEC } from '../test/fixtures.js';
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
// IMPORTANT: patterns are matched by substring — list more-specific patterns first to
// avoid a shorter pattern matching before a longer one (e.g. '/games/g1' before '/games'). (#446)
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

describe('useGameStore — loadGame scenario fetch (#583)', () => {
  it('populates scenario when moduleSlug is provided', async () => {
    const gs = makeGameState('g-scen');
    const scenarioData = { turns: 10, lighting: [] };
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        ['/api/v1/modules/south-mountain/scenarios/full-battle/scenario', scenarioData],
        ['/api/v1/scenarios/south-mountain/map-config', { gridSpec: null, hexes: null }],
        ['/api/v1/games/g-scen', gs],
      ])
    );
    const store = useGameStore();
    await store.loadGame('g-scen', { moduleSlug: 'south-mountain', scenarioSlug: 'full-battle' });
    // Scenario fetch is fire-and-forget; flush microtasks before asserting
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.scenario).toEqual(scenarioData);
  });

  it('leaves scenario null when moduleSlug is omitted', async () => {
    const gs = makeGameState('g-no-scen');
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        ['/api/v1/scenarios/south-mountain/map-config', { gridSpec: null, hexes: null }],
        ['/api/v1/games/g-no-scen', gs],
      ])
    );
    const store = useGameStore();
    await store.loadGame('g-no-scen');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.scenario).toBeNull();
  });
});

describe('useGameStore — loadGame double-call guard (#441)', () => {
  it('second call supersedes first: state from first call is not written after second completes (#441)', async () => {
    const gs1 = makeGameState('game-1');
    const gs2 = makeGameState('game-2');

    let resolveGs1;
    const gs1Deferred = new Promise((resolve) => {
      resolveGs1 = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url.includes('/games/game-1')) {
          return gs1Deferred.then(() => ({
            ok: true,
            status: 200,
            json: () => Promise.resolve(gs1),
          }));
        }
        if (url.includes('/games/game-2')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(gs2) });
        }
        if (url.includes('map-config')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ gridSpec: null, hexes: null }),
          });
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
      })
    );

    const store = useGameStore();

    // Start first load — will hang until resolveGs1 is called
    const load1 = store.loadGame('game-1');

    // Start second load immediately — resolves fast
    const load2 = store.loadGame('game-2');
    await load2;
    expect(store.gameState.id).toBe('game-2');

    // Now let the first load's state fetch complete
    resolveGs1();
    await load1;

    // First call's state write must have been discarded; game-2 state must survive
    expect(store.gameState.id).toBe('game-2');
    // loading must be false — the winner's finally ran; the superseded call's finally was guarded
    expect(store.loading).toBe(false);
  });
});

describe('useGameStore — submitAction', () => {
  const makeActionFetch = (status, body) =>
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });

  it('sends POST with type, payload, and expectedVersion', async () => {
    const gs = makeGameState('g1');
    gs.version = 3;
    const saved = { ...gs, version: 4 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(saved),
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g1', 'END_PHASE', null);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/games/g1/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'END_PHASE', payload: null, expectedVersion: 3 }),
    });
  });

  it('updates gameState to returned saved state on success', async () => {
    const gs = makeGameState('g2');
    gs.version = 1;
    const saved = { ...gs, version: 2, turn: 2 };
    vi.stubGlobal('fetch', makeActionFetch(200, saved));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g2', 'END_PHASE');
    expect(store.gameState).toEqual(saved);
    expect(store.error).toBeNull();
  });

  it('sets pendingAction during in-flight request and clears it on success', async () => {
    const gs = makeGameState('g3');
    gs.version = 0;
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
    store.gameState = gs;
    const p = store.submitAction('g3', 'END_PHASE', { foo: 1 });
    expect(store.pendingAction).toEqual({ type: 'END_PHASE', payload: { foo: 1 } });
    resolveFetch();
    await p;
    expect(store.pendingAction).toBeNull();
  });

  it('sets error and clears pendingAction on 422 response', async () => {
    const gs = makeGameState('g4');
    gs.version = 0;
    vi.stubGlobal('fetch', makeActionFetch(422, { error: 'Invalid action' }));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g4', 'END_PHASE');
    expect(store.error).toBe('Invalid action');
    expect(store.pendingAction).toBeNull();
  });

  it('sets error and clears pendingAction on 500 response', async () => {
    const gs = makeGameState('g5');
    gs.version = 0;
    vi.stubGlobal('fetch', makeActionFetch(500, { error: 'Internal error' }));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g5', 'END_PHASE');
    expect(store.error).toBeTruthy();
    expect(store.pendingAction).toBeNull();
  });

  it('sets error and clears pendingAction on 409 version-conflict response', async () => {
    const gs = makeGameState('g6');
    gs.version = 0;
    vi.stubGlobal('fetch', makeActionFetch(409, { error: 'Version conflict' }));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g6', 'END_PHASE');
    expect(store.error).toBeTruthy();
    expect(store.pendingAction).toBeNull();
  });

  it('uses fallback error message when error response body has no error field', async () => {
    const gs = makeGameState('g7');
    gs.version = 0;
    vi.stubGlobal('fetch', makeActionFetch(500, {}));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g7', 'END_PHASE');
    expect(store.error).toBe('Action failed: 500');
    expect(store.pendingAction).toBeNull();
  });

  it('sets error when error response json() rejects (covers .catch(() => ({})) branch)', async () => {
    const gs = makeGameState('g8');
    gs.version = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.reject(new SyntaxError('bad json')),
      })
    );
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g8', 'END_PHASE');
    expect(store.error).toBe('Action failed: 422');
    expect(store.pendingAction).toBeNull();
  });

  it('sets error when success response json() rejects (non-JSON 2xx body)', async () => {
    const gs = makeGameState('g9');
    gs.version = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('bad json')),
      })
    );
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g9', 'END_PHASE');
    expect(store.error).toBe('Server returned an invalid response');
    expect(store.pendingAction).toBeNull();
  });

  it('does not mutate gameState on 422 failure', async () => {
    const gs = makeGameState('g10');
    gs.version = 2;
    vi.stubGlobal('fetch', makeActionFetch(422, { error: 'Invalid action' }));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g10', 'END_PHASE');
    expect(store.gameState).toEqual(gs);
  });

  it('does not mutate gameState on 500 failure', async () => {
    const gs = makeGameState('g11');
    gs.version = 5;
    vi.stubGlobal('fetch', makeActionFetch(500, { error: 'Server error' }));
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g11', 'END_PHASE');
    expect(store.gameState).toEqual(gs);
  });

  it('serializes default null payload in request body when third arg omitted', async () => {
    const gs = makeGameState('g12');
    gs.version = 1;
    const saved = { ...gs, version: 2 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(saved),
    });
    vi.stubGlobal('fetch', fetchMock);
    const store = useGameStore();
    store.gameState = gs;
    await store.submitAction('g12', 'END_PHASE');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.payload).toBeNull();
  });

  it('sets pendingAction during in-flight error and clears it on rejection', async () => {
    const gs = makeGameState('g13');
    gs.version = 0;
    let rejectFetch;
    const deferred = new Promise((_, reject) => {
      rejectFetch = reject;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(deferred));
    const store = useGameStore();
    store.gameState = gs;
    const p = store.submitAction('g13', 'END_PHASE', null);
    expect(store.pendingAction).toEqual({ type: 'END_PHASE', payload: null });
    rejectFetch(new Error('network'));
    await p;
    expect(store.pendingAction).toBeNull();
  });

  it('does nothing when gameState is null', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const store = useGameStore();
    await store.submitAction('g-null', 'END_PHASE');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.pendingAction).toBeNull();
    expect(store.error).toBeNull();
  });
});

describe('useGameStore — refreshGame', () => {
  it('calls loadGame with the provided gameId', async () => {
    const gs = makeGameState('g-refresh');
    vi.stubGlobal(
      'fetch',
      makeMultiFetch([
        ['/api/v1/scenarios/south-mountain/map-config', { gridSpec: null, hexes: null }],
        ['/api/v1/games/g-refresh', gs],
      ])
    );
    const store = useGameStore();
    await store.refreshGame('g-refresh');
    expect(store.gameState).toEqual(gs);
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

describe('useGameStore — refreshValidActions (#502)', () => {
  it('populates serverValidActions on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ validActions: [{ type: 'END_PHASE', payload: null }] }),
      })
    );
    const store = useGameStore();
    await store.refreshValidActions('g1');
    expect(store.serverValidActions).toEqual([{ type: 'END_PHASE', payload: null }]);
  });

  it('sets serverValidActions to [] when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) })
    );
    const store = useGameStore();
    await store.refreshValidActions('g1');
    expect(store.serverValidActions).toEqual([]);
  });

  it('sets serverValidActions to [] on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const store = useGameStore();
    await store.refreshValidActions('g1');
    expect(store.serverValidActions).toEqual([]);
  });

  it('out-of-order responses: stale result from gen-1 arriving after gen-3 is discarded (#502)', async () => {
    // gen-1 fetch is deferred and resolves LAST (simulates a slow response overtaken by two
    // later calls). Without the _actionsGeneration guard, gen-1 would overwrite gen-3's result.
    let resolveGen1;
    const gen1Promise = new Promise((resolve) => {
      resolveGen1 = resolve;
    });

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const n = ++callCount;
        if (n === 1) {
          // Return a deferred response for gen-1 — resolves after gen-2 and gen-3
          return gen1Promise.then(() => ({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({ validActions: [{ type: 'ACTION_STALE', payload: null }] }),
          }));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ validActions: [{ type: `ACTION_${n}`, payload: null }] }),
        });
      })
    );

    const store = useGameStore();
    const p1 = store.refreshValidActions('g1'); // gen-1: slow, will arrive last
    const p2 = store.refreshValidActions('g1'); // gen-2: resolves immediately
    const p3 = store.refreshValidActions('g1'); // gen-3: resolves immediately — should win
    await Promise.all([p2, p3]); // let gen-2 and gen-3 settle first
    expect(store.serverValidActions).toEqual([{ type: 'ACTION_3', payload: null }]);

    // Now deliver the stale gen-1 response — guard must discard it
    resolveGen1();
    await p1;
    expect(store.serverValidActions).toEqual([{ type: 'ACTION_3', payload: null }]);
  });
});
