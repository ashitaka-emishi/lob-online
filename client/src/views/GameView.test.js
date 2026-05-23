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

import { useGameStore } from '../stores/useGameStore.js';
import { useOobData } from '../composables/useOobData.js';
import GameView from './GameView.vue';
import { STUB_GRID_SPEC_MINI_WIRE as STUB_GRID_SPEC } from '../test/fixtures.js';

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
    selectedUnitId: null,
    selectedUnit: null,
    loading: false,
    error: null,
    mapConfigError: null,
    loadGame: vi.fn(),
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
    ],
  });
}

// Push to the game route before mounting so route.params.id is resolved synchronously
// when onMounted fires.
async function mountGameView(
  storeOverrides = {},
  fetchResponses = null,
  oobDataValue = STUB_OOB_DATA,
  oobErrorValue = null
) {
  setActivePinia(createPinia());
  useGameStore.mockReturnValue(makeGameStore(storeOverrides));
  useOobData.mockReturnValue(makeOobStore(oobDataValue, oobErrorValue));

  const fetchMock = makeFetchSequence(fetchResponses ?? []);
  vi.stubGlobal('fetch', fetchMock);

  const router = makeRouter();
  await router.push('/games/game-1');

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
    const wrapper = await mountGameView({ gridSpec: STUB_GRID_SPEC });
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    const cal = overlay.props('calibration');
    expect(cal.cols).toBe(STUB_GRID_SPEC.cols);
    expect(cal.rows).toBe(STUB_GRID_SPEC.rows);
    expect(cal.hexWidth).toBe(STUB_GRID_SPEC.hexWidth);
    expect(cal.hexHeight).toBe(STUB_GRID_SPEC.hexHeight);
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
  it('calls loadGame with the game ID from route params on mount', async () => {
    const loadGame = vi.fn();
    await mountGameView({ loadGame });
    await vi.waitFor(() => expect(loadGame).toHaveBeenCalledWith('game-1'));
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
  it('only passes on-board units with a counterFile to HexMapOverlay', async () => {
    // OOB structure: unit-a has a counter, unit-b has none, unit-c is off-board.
    const oobData = {
      union: {
        id: 'corps-1',
        name: 'I Corps',
        brigades: [
          { id: 'unit-a', name: '1st Bde', counterRef: { front: 'unit-a.png' } },
          { id: 'unit-b', name: '2nd Bde' }, // no counterRef → filtered out
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
    expect(units).toHaveLength(1);
    expect(units[0].id).toBe('unit-a');
    expect(units[0].counterFile).toBe('unit-a.png');
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
