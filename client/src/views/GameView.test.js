import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('../stores/useGameStore.js', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('../composables/useOobData.js', () => ({
  useOobData: vi.fn(),
}));

// Socket mock factory — returned by the vi.mock below
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { useGameStore } from '../stores/useGameStore.js';
import { useOobData } from '../composables/useOobData.js';
import GameView from './GameView.vue';
import { STUB_GRID_SPEC_MINI_WIRE } from '../test/fixtures.js';

// Minimal OOB response (used for fetch-level assertions in displayUnits tests)
const STUB_OOB_DATA = {
  union: {},
  confederate: {},
};

// Minimal unit state shape
function makeUnit(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function makeGameStore(overrides = {}) {
  return {
    gameState: null,
    gridSpec: null,
    hexes: null,
    scenario: null, // (#583) scenario data co-located in the store, populated by loadGame
    selectedUnitId: null,
    selectedUnit: null,
    loading: false,
    error: null,
    mapConfigError: null,
    pendingAction: null,
    serverValidActions: [],
    loadGame: vi.fn(),
    submitAction: vi.fn(),
    refreshGame: vi.fn(),
    refreshValidActions: vi.fn().mockResolvedValue(undefined),
    selectUnit: vi.fn(),
    deselectUnit: vi.fn(),
    ...overrides,
  };
}

import { ref, computed } from 'vue';

function makeOobStore(oobDataValue = STUB_OOB_DATA, oobErrorValue = null) {
  const oobData = ref(oobDataValue);
  const oobError = ref(oobErrorValue);
  const fetchOob = vi.fn().mockResolvedValue(undefined);
  const oobUnitMap = computed(() => {
    const map = new Map();
    if (!oobData.value) return map;
    function collect(obj, side) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.id)
        map.set(obj.id, {
          name: obj.name ?? obj.id,
          side,
          strengthPoints: obj.strengthPoints ?? null,
          counterFile: obj.counterRef?.front ?? null,
        });
      for (const val of Object.values(obj)) {
        if (val && typeof val === 'object') collect(val, side);
      }
    }
    for (const side of ['union', 'confederate']) {
      if (oobData.value[side]) collect(oobData.value[side], side);
    }
    return map;
  });
  return { oobData, oobError, fetchOob, oobUnitMap };
}

// IMPORTANT: patterns are matched by substring — list more-specific patterns first to
// avoid a shorter pattern matching before a longer one (e.g. '/games/g1' before '/games'). (#446)
function makeFetchSequence(responses) {
  // Returns a fetch mock that answers requests in order based on URL matching.
  // If the data slot contains an Error, the fetch itself rejects (simulates network failure).
  return vi.fn().mockImplementation((url) => {
    for (const [pattern, dataOrError] of responses) {
      if (url.includes(pattern)) {
        if (dataOrError instanceof Error) {
          return Promise.reject(dataOrError);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(dataOrError),
        });
      }
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' } },
      { path: '/lobby', component: { template: '<div/>' } },
      { path: '/games/:id', component: { template: '<div/>' } },
      // Module-prefixed route — needed to test scenario fetch URL construction (H4)
      {
        path: '/modules/:moduleSlug/scenarios/:scenarioSlug/games/:id',
        component: { template: '<div/>' },
      },
    ],
  });
}

// Push to the game route before mounting so route.params.id is resolved synchronously
// when onMounted fires.
async function mountGameView(
  storeOverrides = {},
  fetchResponses = null,
  oobDataValue = STUB_OOB_DATA,
  oobErrorValue = null,
  routePath = '/games/game-1'
) {
  setActivePinia(createPinia());
  useGameStore.mockReturnValue(makeGameStore(storeOverrides));
  useOobData.mockReturnValue(makeOobStore(oobDataValue, oobErrorValue));

  const fetchMock = makeFetchSequence(fetchResponses ?? []);
  vi.stubGlobal('fetch', fetchMock);

  const router = makeRouter();
  await router.push(routePath);

  return mount(GameView, {
    global: {
      plugins: [router],
      stubs: {
        // Stub heavy child components — we test GameView wiring, not their internals
        HexMapOverlay: {
          name: 'HexMapOverlay',
          template: '<div class="stub-overlay" @click="$emit(\'hex-click\', \'05.03\')"></div>',
          emits: ['hex-click', 'unit-click'],
          props: [
            'calibration',
            'hexes',
            'units',
            'imageWidth',
            'imageHeight',
            'overlayConfig',
            'interactionEnabled',
          ],
        },
        UnitStatsPanel: {
          name: 'UnitStatsPanel',
          template: '<div class="stub-stats-panel"></div>',
          props: ['unit'],
        },
        ActionPanel: {
          name: 'ActionPanel',
          template: '<div class="stub-action-panel"></div>',
          props: [
            'phase',
            'step',
            'turn',
            'activePlayer',
            'validActions',
            'pending',
            'pendingActionType',
            'localPlayerSide',
          ],
          emits: ['submit-action'],
        },
        TurnControl: {
          name: 'TurnControl',
          template: '<div class="stub-turn-control"></div>',
          props: ['turn', 'phase', 'activeSide', 'scenario'],
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GameView — mount and structure', () => {
  it('renders the game-view container', async () => {
    const wrapper = await mountGameView();
    expect(wrapper.find('.game-view').exists()).toBe(true);
  });

  it('renders a HexMapOverlay component', async () => {
    const wrapper = await mountGameView();
    expect(wrapper.findComponent({ name: 'HexMapOverlay' }).exists()).toBe(true);
  });

  it('renders a UnitStatsPanel component', async () => {
    const wrapper = await mountGameView();
    expect(wrapper.findComponent({ name: 'UnitStatsPanel' }).exists()).toBe(true);
  });

  it('calls fetchOob from useOobData composable on mount', async () => {
    const wrapper = await mountGameView();
    // fetchOob is provided by the mocked useOobData composable
    const { fetchOob } = useOobData.mock.results[0].value;
    await vi.waitFor(() => expect(fetchOob).toHaveBeenCalled());
    expect(wrapper.find('.game-view').exists()).toBe(true);
  });

  it('shows a loading banner while gameStore.loading is true', async () => {
    const wrapper = await mountGameView({ loading: true });
    expect(wrapper.find('.loading-banner').exists()).toBe(true);
  });

  it('shows an error banner when gameStore.error is set', async () => {
    const wrapper = await mountGameView({ error: 'Game not found' });
    expect(wrapper.find('.error-banner').text()).toContain('Game not found');
  });

  it('wraps status banners in a .status-banners container (#445)', async () => {
    const wrapper = await mountGameView();
    expect(wrapper.find('.status-banners').exists()).toBe(true);
  });

  it('renders loading banner inside .status-banners container (#445)', async () => {
    const wrapper = await mountGameView({ loading: true });
    expect(wrapper.find('.status-banners .loading-banner').exists()).toBe(true);
  });

  it('renders error banner inside .status-banners container (#445)', async () => {
    const wrapper = await mountGameView({ error: 'fail' });
    expect(wrapper.find('.status-banners .error-banner').exists()).toBe(true);
  });
});

describe('GameView — calibration from gridSpec (#406)', () => {
  it('passes DEFAULT_CALIBRATION to HexMapOverlay when gridSpec is null', async () => {
    const wrapper = await mountGameView({ gridSpec: null });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    const cal = overlay.props('calibration');
    // Default cols/rows from DEFAULT_CALIBRATION
    expect(cal.cols).toBe(64);
    expect(cal.rows).toBe(35);
  });

  it('passes gridSpec values to HexMapOverlay when gridSpec is loaded (#406)', async () => {
    const wrapper = await mountGameView({ gridSpec: STUB_GRID_SPEC_MINI_WIRE });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    const cal = overlay.props('calibration');
    expect(cal.cols).toBe(STUB_GRID_SPEC_MINI_WIRE.cols);
    expect(cal.rows).toBe(STUB_GRID_SPEC_MINI_WIRE.rows);
    expect(cal.hexWidth).toBe(STUB_GRID_SPEC_MINI_WIRE.hexWidth);
    expect(cal.hexHeight).toBe(STUB_GRID_SPEC_MINI_WIRE.hexHeight);
  });

  it('uses gameStore.hexes as the hexes prop for HexMapOverlay (#406)', async () => {
    const hexes = [{ id: '01.01', terrain: 'woods', elevation: 0, edges: {} }];
    const wrapper = await mountGameView({ hexes });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    expect(overlay.props('hexes')).toEqual(hexes);
  });

  it('passes empty array to HexMapOverlay when hexes is null (#406)', async () => {
    const wrapper = await mountGameView({ hexes: null });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    expect(overlay.props('hexes')).toEqual([]);
  });
});

describe('GameView — game store integration', () => {
  it('calls loadGame with the game ID and module context from route params on mount (#583)', async () => {
    // GameView passes { moduleSlug, scenarioSlug } to loadGame so the store can co-fetch
    // scenario data; the test verifies the new 2-arg call signature.
    const loadGame = vi.fn();
    await mountGameView({ loadGame });
    await vi.waitFor(() => expect(loadGame).toHaveBeenCalledWith('game-1', expect.any(Object)));
  });

  it('passes selectedUnit enriched through OOB to UnitStatsPanel', async () => {
    // selectedUnit is the raw UnitState from the game store — GameView enriches it
    // via oobUnitMap before passing to the panel. With empty OOB data the enrichment
    // produces fallback values (id as name, null side, '?' sp).
    const selectedUnit = makeUnit({
      moraleState: 'shaken',
      orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
    });
    const wrapper = await mountGameView({ selectedUnit });
    const panel = wrapper.findComponent({ name: 'UnitStatsPanel' });
    const passed = panel.props('unit');
    expect(passed).not.toBeNull();
    expect(passed.id).toBe('unit-a');
    expect(passed.moraleState).toBe('shaken');
    expect(passed.orderType).toBe('move');
    // OOB empty → fallback values
    expect(passed.name).toBe('unit-a');
    expect(passed.side).toBeNull();
  });

  it('passes null to UnitStatsPanel when nothing is selected', async () => {
    const wrapper = await mountGameView({ selectedUnit: null });
    const panel = wrapper.findComponent({ name: 'UnitStatsPanel' });
    expect(panel.props('unit')).toBeNull();
  });
});

describe('GameView — click event wiring', () => {
  it('calls deselectUnit on hex-click when no unit is at that hex', async () => {
    const deselectUnit = vi.fn();
    // No units in game state → any hex click deselects
    const wrapper = await mountGameView({ gameState: { units: {} }, deselectUnit });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    await overlay.trigger('click');
    // The stub emits hex-click on click
    expect(deselectUnit).toHaveBeenCalled();
  });

  it('calls selectUnit when hex-click lands on a hex occupied by a unit', async () => {
    const selectUnit = vi.fn();
    const gameState = { units: { 'unit-a': makeUnit() } }; // unit-a is at '05.03'
    const wrapper = await mountGameView({ gameState, selectUnit });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    await overlay.trigger('click'); // stub emits hex-click with '05.03'
    expect(selectUnit).toHaveBeenCalledWith('unit-a');
  });

  it('calls selectUnit when unit-click event is received from HexMapOverlay', async () => {
    const selectUnit = vi.fn();
    const wrapper = await mountGameView({ selectUnit });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    await overlay.vm.$emit('unit-click', 'unit-x');
    expect(selectUnit).toHaveBeenCalledWith('unit-x');
  });
});

describe('GameView — displayUnits computation', () => {
  it('passes all on-board units to HexMapOverlay; counterFile is null for image-less units', async () => {
    // OOB structure: unit-a has a counter, unit-b has none, unit-c is off-board.
    // Both on-board units are passed through; the counter layer handles the fallback display.
    const oobData = {
      union: {
        id: 'corps-1',
        name: 'I Corps',
        brigades: [
          { id: 'unit-a', name: '1st Bde', counterRef: { front: 'unit-a.png' } },
          { id: 'unit-b', name: '2nd Bde' }, // no counterRef → counterFile: null, shown as fallback
        ],
      },
      confederate: {},
    };
    const gameState = {
      units: {
        'unit-a': makeUnit({ id: 'unit-a', hex: '05.03', isOnBoard: true }),
        'unit-b': makeUnit({ id: 'unit-b', hex: '06.03', isOnBoard: true }),
        'unit-c': makeUnit({ id: 'unit-c', hex: null, isOnBoard: false }),
      },
    };
    // Pass oobData as third arg — the mocked useOobData composable drives enrichment
    const wrapper = await mountGameView({ gameState }, null, oobData);
    await flushPromises();
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    const units = overlay.props('units');
    expect(units).toHaveLength(2); // both on-board units, regardless of counterFile
    const unitA = units.find((u) => u.id === 'unit-a');
    const unitB = units.find((u) => u.id === 'unit-b');
    expect(unitA.counterFile).toBe('unit-a.png');
    expect(unitB.counterFile).toBeNull(); // no image → counter layer renders fallback
  });
});

describe('GameView — map-config error handling (#422)', () => {
  it('shows a map-config warning banner when mapConfigError is set', async () => {
    const wrapper = await mountGameView({ mapConfigError: 'Map data unavailable' });
    expect(wrapper.find('.map-config-warning').exists()).toBe(true);
    expect(wrapper.find('.map-config-warning').text()).toContain('Map data unavailable');
  });

  it('does not show map-config warning when mapConfigError is null', async () => {
    const wrapper = await mountGameView({ mapConfigError: null });
    // v-show: element exists in DOM but is hidden when mapConfigError is null
    expect(wrapper.find('.map-config-warning').isVisible()).toBe(false);
  });
});

describe('GameView — OOB fetch error handling', () => {
  it('renders without crashing when OOB fetch fails', async () => {
    // Simulate composable reporting an error with no OOB data loaded
    const wrapper = await mountGameView({}, null, null);
    await flushPromises();
    expect(wrapper.find('.game-view').exists()).toBe(true);
    // No OOB data → displayUnits is empty
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    expect(overlay.props('units')).toEqual([]);
  });

  it('shows error banner when OOB composable reports an error', async () => {
    const wrapper = await mountGameView({}, null, null, 'OOB data unavailable');
    await flushPromises();
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-banner').text()).toContain('OOB data unavailable');
  });
});

describe('GameView — socket setup (#474)', () => {
  it('emits game:join with gameId on mount', async () => {
    await mountGameView();
    await flushPromises();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:join', { gameId: 'game-1' });
  });

  it('registers game:state-updated listener on mount', async () => {
    await mountGameView();
    await flushPromises();
    expect(mockSocket.on).toHaveBeenCalledWith('game:state-updated', expect.any(Function));
  });

  it('calls gameStore.refreshGame when game:state-updated fires', async () => {
    const refreshGame = vi.fn();
    await mountGameView({ refreshGame });
    await flushPromises();
    // Find the listener registered for game:state-updated and invoke it
    const [, listener] = mockSocket.on.mock.calls.find(([event]) => event === 'game:state-updated');
    listener();
    expect(refreshGame).toHaveBeenCalledWith('game-1');
  });

  it('calls gameStore.refreshValidActions on mount with the game id (#502)', async () => {
    const refreshValidActions = vi.fn().mockResolvedValue(undefined);
    await mountGameView({ refreshValidActions });
    await flushPromises();
    expect(refreshValidActions).toHaveBeenCalledWith('game-1');
  });

  it('calls gameStore.refreshValidActions when game:state-updated fires (#502)', async () => {
    const refreshValidActions = vi.fn().mockResolvedValue(undefined);
    await mountGameView({ refreshValidActions });
    await flushPromises();
    const [, listener] = mockSocket.on.mock.calls.find(([event]) => event === 'game:state-updated');
    listener();
    await flushPromises();
    expect(refreshValidActions).toHaveBeenCalledTimes(2); // once on mount, once on socket event
  });

  it('emits game:leave and disconnects socket on unmount', async () => {
    const wrapper = await mountGameView();
    await flushPromises();
    wrapper.unmount();
    expect(mockSocket.emit).toHaveBeenCalledWith('game:leave', { gameId: 'game-1' });
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});

describe('GameView — ActionPanel rendering (#474)', () => {
  it('renders ActionPanel in the sidebar', async () => {
    const wrapper = await mountGameView();
    expect(wrapper.findComponent({ name: 'ActionPanel' }).exists()).toBe(true);
  });

  it('passes pending=true to ActionPanel when store pendingAction is set', async () => {
    const wrapper = await mountGameView({ pendingAction: { type: 'END_PHASE', payload: null } });
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('pending')).toBe(true);
  });

  it('passes pending=false to ActionPanel when store pendingAction is null', async () => {
    const wrapper = await mountGameView({ pendingAction: null });
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('pending')).toBe(false);
  });

  it('calls gameStore.submitAction when ActionPanel emits submit-action', async () => {
    const submitAction = vi.fn();
    const wrapper = await mountGameView({ submitAction });
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    await panel.vm.$emit('submit-action', { type: 'END_PHASE', payload: { target: 'hex-1' } });
    expect(submitAction).toHaveBeenCalledWith('game-1', 'END_PHASE', { target: 'hex-1' });
  });

  it('shows error banner when gameStore.error is set', async () => {
    const wrapper = await mountGameView({ error: 'Action failed' });
    expect(wrapper.find('.error-banner').text()).toContain('Action failed');
  });

  it('forwards ACTIVATE_STACK payload from ActionPanel submit-action to gameStore.submitAction (#551)', async () => {
    // Integration: GameView wires ActionPanel submit-action → gameStore.submitAction.
    // Payload-bearing action: { hex } must be forwarded verbatim.
    const submitAction = vi.fn();
    const wrapper = await mountGameView({ submitAction });
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    await panel.vm.$emit('submit-action', {
      type: 'ACTIVATE_STACK',
      payload: { hex: '29.22' },
    });
    expect(submitAction).toHaveBeenCalledWith('game-1', 'ACTIVATE_STACK', { hex: '29.22' });
  });
});

describe('GameView — localPlayerSide and validActions (#474)', () => {
  it('passes localPlayerSide from /api/v1/games/me response to ActionPanel', async () => {
    const wrapper = await mountGameView({}, [['/api/v1/games/me', { side: 'union' }]]);
    await flushPromises();
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('localPlayerSide')).toBe('union');
  });

  it('localPlayerSide stays null when /games/me fetch fails', async () => {
    const wrapper = await mountGameView({}, [['/api/v1/games/me', new Error('network failure')]]);
    await flushPromises();
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('localPlayerSide')).toBeNull();
  });

  it('renders error banner when /games/me fetch fails (#496)', async () => {
    const wrapper = await mountGameView({}, [['/api/v1/games/me', new Error('network failure')]]);
    await flushPromises();
    expect(wrapper.find('.error-banner').exists()).toBe(true);
    expect(wrapper.find('.error-banner').text()).toMatch(/identity/i);
  });

  it('passes pendingActionType from store pendingAction to ActionPanel (#500)', async () => {
    const wrapper = await mountGameView({ pendingAction: { type: 'END_PHASE', payload: null } });
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('pendingActionType')).toBe('END_PHASE');
  });

  it('passes pendingActionType=null to ActionPanel when pendingAction is null (#500)', async () => {
    const wrapper = await mountGameView({ pendingAction: null });
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('pendingActionType')).toBeNull();
  });

  it('passes empty validActions when activePlayer does not match localPlayerSide', async () => {
    const gameState = {
      units: {},
      phase: 'command',
      step: 'orders',
      turn: 1,
      activePlayer: 'confederate',
    };
    const wrapper = await mountGameView({ gameState }, [['/api/v1/games/me', { side: 'union' }]]);
    await flushPromises();
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('validActions')).toHaveLength(0);
  });

  it('passes non-empty validActions when activePlayer matches localPlayerSide and store has actions (#495)', async () => {
    const gameState = {
      units: {},
      phase: 'command',
      step: 'orders',
      turn: 1,
      activePlayer: 'union',
    };
    const wrapper = await mountGameView(
      { gameState, serverValidActions: [{ type: 'END_PHASE', payload: null }] },
      [['/api/v1/games/me', { side: 'union' }]]
    );
    await flushPromises();
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('validActions').length).toBeGreaterThan(0);
  });

  it('passes empty validActions when gameState is null', async () => {
    const wrapper = await mountGameView({ gameState: null }, [
      ['/api/v1/games/me', { side: 'union' }],
    ]);
    await flushPromises();
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('validActions')).toHaveLength(0);
  });

  it('passes empty validActions when active player matches but phase/step are null', async () => {
    const gameState = { units: {}, phase: null, step: null, turn: 1, activePlayer: 'union' };
    const wrapper = await mountGameView({ gameState }, [['/api/v1/games/me', { side: 'union' }]]);
    await flushPromises();
    const panel = wrapper.findComponent({ name: 'ActionPanel' });
    expect(panel.props('validActions')).toHaveLength(0);
  });
});

describe('GameView — TurnControl rendering and wiring (#519, H3)', () => {
  it('renders TurnControl in the sidebar', async () => {
    const wrapper = await mountGameView();
    expect(wrapper.findComponent({ name: 'TurnControl' }).exists()).toBe(true);
  });

  it('passes turn from gameState to TurnControl', async () => {
    const gameState = {
      units: {},
      phase: 'command',
      step: 'orders',
      turn: 7,
      activePlayer: 'union',
    };
    const wrapper = await mountGameView({ gameState });
    const tc = wrapper.findComponent({ name: 'TurnControl' });
    expect(tc.props('turn')).toBe(7);
  });

  it('passes phase from gameState to TurnControl', async () => {
    const gameState = {
      units: {},
      phase: 'movement',
      step: 'execute',
      turn: 3,
      activePlayer: 'union',
    };
    const wrapper = await mountGameView({ gameState });
    const tc = wrapper.findComponent({ name: 'TurnControl' });
    expect(tc.props('phase')).toBe('movement');
  });

  it('passes activeSide from gameState.activePlayer to TurnControl', async () => {
    const gameState = {
      units: {},
      phase: 'command',
      step: 'orders',
      turn: 1,
      activePlayer: 'confederate',
    };
    const wrapper = await mountGameView({ gameState });
    const tc = wrapper.findComponent({ name: 'TurnControl' });
    expect(tc.props('activeSide')).toBe('confederate');
  });

  it('TurnControl scenario prop is null before fetch resolves', async () => {
    const wrapper = await mountGameView();
    const tc = wrapper.findComponent({ name: 'TurnControl' });
    expect(tc.props('scenario')).toBeNull();
  });

  it('TurnControl scenario prop reflects gameStore.scenario when set (#583, H3/H4)', async () => {
    // Scenario data is now loaded inside useGameStore.loadGame (not fetched in GameView).
    // GameView wires TurnControl with :scenario="gameStore.scenario". This test verifies
    // that when the store exposes a scenario, TurnControl receives it as a prop.
    const stubScenario = {
      turnStructure: { firstTurn: '09:00', date: '1862-09-14' },
      lightingSchedule: [{ startTurn: 1, condition: 'day', visibilityHexes: 999 }],
    };
    const wrapper = await mountGameView(
      { scenario: stubScenario },
      [],
      STUB_OOB_DATA,
      null,
      '/modules/SM/scenarios/full-battle/games/game-1'
    );
    await flushPromises();
    const tc = wrapper.findComponent({ name: 'TurnControl' });
    expect(tc.props('scenario')).toEqual(stubScenario);
  });

  it('loadGame is called with moduleSlug from route so store can fetch scenario (#583, H4)', async () => {
    // Scenario fetch URL construction is now the store's responsibility. GameView must pass
    // moduleSlug to loadGame so the store can construct the correct module-scoped API path.
    const loadGame = vi.fn();
    await mountGameView(
      { loadGame },
      [],
      STUB_OOB_DATA,
      null,
      '/modules/SM/scenarios/full-battle/games/game-1'
    );
    await flushPromises();
    await vi.waitFor(() =>
      expect(loadGame).toHaveBeenCalledWith('game-1', expect.objectContaining({ moduleSlug: 'SM' }))
    );
  });
});
