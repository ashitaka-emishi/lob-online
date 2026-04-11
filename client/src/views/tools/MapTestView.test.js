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
