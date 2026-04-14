import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

// ─── Stub HexMapOverlay (heavy SVG component) ──────────────────────────────────
vi.mock('../../components/HexMapOverlay.vue', () => ({
  default: {
    name: 'HexMapOverlay',
    template: '<div class="hex-map-overlay-stub"></div>',
    props: ['calibration', 'hexes', 'overlayConfig', 'interactionEnabled'],
    emits: ['hex-click'],
  },
}));

// ─── Stub panel components for orchestration tests ────────────────────────────
vi.mock('../../components/tools/map-test/MovementPathPanel.vue', () => ({
  default: {
    name: 'MovementPathPanel',
    template: '<div class="movement-path-panel-stub"></div>',
    props: ['clickedHexId'],
    emits: ['overlay-update'],
  },
}));
vi.mock('../../components/tools/map-test/MovementRangePanel.vue', () => ({
  default: {
    name: 'MovementRangePanel',
    template: '<div class="movement-range-panel-stub"></div>',
    props: ['clickedHexId'],
    emits: ['overlay-update'],
  },
}));
vi.mock('../../components/tools/map-test/HexInspectorPanel.vue', () => ({
  default: {
    name: 'HexInspectorPanel',
    template: '<div class="hex-inspector-panel-stub"></div>',
    props: ['clickedHexId'],
    emits: ['overlay-update'],
  },
}));
vi.mock('../../components/tools/map-test/LosPanel.vue', () => ({
  default: {
    name: 'LosPanel',
    template: '<div class="los-panel-stub"></div>',
    props: ['clickedHexId'],
    emits: ['overlay-update'],
  },
}));
vi.mock('../../components/tools/map-test/CommandRangePanel.vue', () => ({
  default: {
    name: 'CommandRangePanel',
    template: '<div class="command-range-panel-stub"></div>',
    props: ['clickedHexId'],
    emits: ['overlay-update'],
  },
}));

import MapTestView from './MapTestView.vue';

const VALID_MAP = {
  _status: 'draft',
  scenario: 'south-mountain',
  layout: 'pointy-top',
  vpHexes: [],
  hexes: [{ hex: '10.10', terrain: 'clear' }],
  gridSpec: {
    cols: 64,
    rows: 35,
    dx: 39.75,
    dy: 36,
    hexWidth: 40.5,
    hexHeight: 40.7,
    imageScale: 1,
    orientation: 'flat',
    strokeWidth: 0.5,
    evenColUp: true,
  },
  elevationSystem: { baseElevation: 500, contourInterval: 50, elevationLevels: 24, unit: 'feet' },
};

function mockFetch(data, ok = true) {
  return vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(data),
    })
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(VALID_MAP));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MapTestView', () => {
  it('renders without error', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows the hex map overlay after data loads', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.hex-map-overlay-stub').exists()).toBe(true);
    wrapper.unmount();
  });

  it('panel selector shows all five panel names', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();
    const text = wrapper.text();
    expect(text).toMatch(/movement path/i);
    expect(text).toMatch(/movement range/i);
    expect(text).toMatch(/hex inspector/i);
    expect(text).toMatch(/los/i);
    expect(text).toMatch(/command range/i);
    wrapper.unmount();
  });

  it('shows an error message when map fetch fails', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toMatch(/failed to load/i);
    wrapper.unmount();
  });
});

// ─── Orchestration — togglePanel (#300) ───────────────────────────────────────

describe('MapTestView — togglePanel orchestration (#300)', () => {
  it('clicking a panel header switches the active panel', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();

    // Default: MovementPath is active
    expect(wrapper.findComponent({ name: 'MovementPathPanel' }).exists()).toBe(true);

    // Click LOS panel header (4th button, index 3)
    const headers = wrapper.findAll('button.accordion-header');
    await headers[3].trigger('click');

    expect(wrapper.findComponent({ name: 'LosPanel' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'MovementPathPanel' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('clicking the active panel header deactivates it', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();

    // Movement Path is active by default
    expect(wrapper.findComponent({ name: 'MovementPathPanel' }).exists()).toBe(true);

    // Click Movement Path header again (toggle off)
    const headers = wrapper.findAll('button.accordion-header');
    await headers[0].trigger('click');

    expect(wrapper.findComponent({ name: 'MovementPathPanel' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('hex-click from HexMapOverlay dispatches clickedHexId to active panel', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();

    // Emit hex-click from the overlay stub
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    await overlay.vm.$emit('hex-click', '19.23');

    // Active panel (MovementPathPanel) should receive updated clickedHexId prop
    const panel = wrapper.findComponent({ name: 'MovementPathPanel' });
    expect(panel.props('clickedHexId')).toBe('19.23');
    wrapper.unmount();
  });

  it('overlay-update event from active panel updates overlayConfig for HexMapOverlay', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();

    const mockOverlay = { highlightHexes: ['10.10'], mode: 'movement-path' };

    // Emit overlay-update from the active panel
    const panel = wrapper.findComponent({ name: 'MovementPathPanel' });
    await panel.vm.$emit('overlay-update', mockOverlay);

    // HexMapOverlay should receive the updated overlayConfig prop
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    expect(overlay.props('overlayConfig')).toEqual(mockOverlay);
    wrapper.unmount();
  });

  it('togglePanel resets clickedHexId and overlayConfig when switching panels', async () => {
    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();

    // Set a hex click on the current panel
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    await overlay.vm.$emit('hex-click', '10.10');

    // Switch to a different panel
    const headers = wrapper.findAll('button.accordion-header');
    await headers[1].trigger('click'); // Movement Range

    // New panel should receive null clickedHexId
    const rangePanel = wrapper.findComponent({ name: 'MovementRangePanel' });
    expect(rangePanel.props('clickedHexId')).toBeNull();
    wrapper.unmount();
  });
});

// ─── Fetch URL — dedicated data endpoint (#303) ───────────────────────────────

describe('MapTestView — data endpoint (#303)', () => {
  it('fetches map data from /api/tools/map-test/data, not the map-editor endpoint', async () => {
    const fetchMock = mockFetch(VALID_MAP);
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(MapTestView, { attachTo: document.body });
    await flushPromises();

    // Verify the correct endpoint was called
    const calledUrl = fetchMock.mock.calls[0]?.[0];
    expect(calledUrl).toBe('/api/tools/map-test/data');
    expect(calledUrl).not.toContain('map-editor');
    wrapper.unmount();
  });
});
