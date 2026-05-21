import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('../stores/useGameStore.js', () => ({
  useGameStore: vi.fn(),
}));

import { useGameStore } from '../stores/useGameStore.js';
import GameView from './GameView.vue';

// Minimal map-data response (hexes array + gridSpec)
const STUB_MAP_DATA = { hexes: [], gridSpec: { cols: 4, rows: 3 } };

// Minimal OOB response
const STUB_OOB_DATA = {
  union: {},
  confederate: {},
};

function makeGameStore(overrides = {}) {
  return {
    gameState: null,
    selectedUnitId: null,
    selectedUnit: null,
    loading: false,
    error: null,
    loadGame: vi.fn(),
    selectUnit: vi.fn(),
    deselectUnit: vi.fn(),
    ...overrides,
  };
}

function makeFetchSequence(responses) {
  // Returns a fetch mock that answers requests in order based on URL matching
  return vi.fn().mockImplementation((url) => {
    for (const [pattern, data, ok = true] of responses) {
      if (url.includes(pattern)) {
        return Promise.resolve({
          ok,
          status: ok ? 200 : 500,
          json: () => Promise.resolve(data),
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
async function mountGameView(storeOverrides = {}, fetchResponses = null) {
  setActivePinia(createPinia());
  useGameStore.mockReturnValue(makeGameStore(storeOverrides));

  const fetchMock = makeFetchSequence(
    fetchResponses ?? [
      ['map-test/data', STUB_MAP_DATA],
      ['oob-editor/data', STUB_OOB_DATA],
    ]
  );
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

  it('fetches map data from /api/tools/map-test/data on mount', async () => {
    await mountGameView();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('map-test/data'));
  });

  it('fetches OOB data from /api/tools/oob-editor/data on mount', async () => {
    await mountGameView();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringContaining('oob-editor/data'));
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
    // produces fallback values (id as name, 'unknown' side, '?' sp).
    const selectedUnit = {
      id: 'unit-a',
      hex: '05.03',
      facing: 0,
      moraleState: 'shaken',
      wrecked: false,
      orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
      ammo: 'full',
      isOnBoard: true,
      entryTurn: null,
      isDetached: false,
    };
    const wrapper = await mountGameView({ selectedUnit });
    const panel = wrapper.findComponent({ name: 'UnitStatsPanel' });
    const passed = panel.props('unit');
    expect(passed).not.toBeNull();
    expect(passed.id).toBe('unit-a');
    expect(passed.moraleState).toBe('shaken');
    expect(passed.orderType).toBe('move');
    // OOB empty → fallback values
    expect(passed.name).toBe('unit-a');
    expect(passed.side).toBe('unknown');
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
});
