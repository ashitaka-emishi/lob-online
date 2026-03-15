import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

// Stub heavy child components that cause jsdom hangs via honeycomb-grid SVG computation
vi.mock('../../components/HexMapOverlay.vue', () => ({
  default: {
    name: 'HexMapOverlay',
    template: '<div class="hex-map-overlay-stub"></div>',
    props: [
      'calibration',
      'hexes',
      'vpHexIds',
      'selectedHexId',
      'calibrationMode',
      'imageWidth',
      'imageHeight',
      'losHexA',
      'losHexB',
      'losPathHexes',
      'losBlockedHex',
      'layers',
      'editorMode',
      'paintTerrain',
    ],
    emits: ['hex-click', 'hex-mouseenter', 'hex-mouseleave', 'edge-click', 'edge-hover'],
  },
}));

vi.mock('../../components/HexEditPanel.vue', () => ({
  default: {
    name: 'HexEditPanel',
    template: '<div class="hex-edit-panel-stub"></div>',
    props: ['hex', 'selectedHexId', 'hexFeatureTypes', 'edgeFeatureTypes'],
    emits: ['hex-update'],
  },
}));

vi.mock('../../components/LosTestPanel.vue', () => ({
  default: {
    name: 'LosTestPanel',
    template: '<div class="los-test-panel-stub"></div>',
    props: ['hexA', 'hexB', 'mapData', 'gridSpec', 'selectingHex'],
    emits: ['pick-start', 'pick-cancel', 'set-hex-a', 'set-hex-b', 'los-result'],
  },
}));

import MapEditorView from './MapEditorView.vue';
import HexEditPanel from '../../components/HexEditPanel.vue';

const VALID_MAP = {
  _status: 'draft',
  scenario: 'south-mountain',
  layout: 'pointy-top',
  vpHexes: [{ hex: '10.10', unionVP: 3, confederateVP: 2 }],
  hexes: [{ hex: '01.01', terrain: 'clear', hexsides: {} }],
  gridSpec: {
    cols: 4,
    rows: 3,
    dx: 100,
    dy: 50,
    hexWidth: 35,
    hexHeight: 35,
    imageScale: 1,
    orientation: 'flat',
    strokeWidth: 0.5,
    evenColUp: false,
  },
};

function mockFetch(data, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('MapEditorView', () => {
  beforeEach(() => {
    // Stub localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header with "Map Editor" title', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Map Editor');
    wrapper.unmount();
  });

  it('renders Save button', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const saveBtn = wrapper.find('button.save-btn');
    expect(saveBtn.exists()).toBe(true);
    wrapper.unmount();
  });

  it('renders Export button', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const exportBtn = wrapper.find('button.export-btn');
    expect(exportBtn.exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows fetch error when API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load');
    wrapper.unmount();
  });

  it('default editorMode is "select" (mode button active)', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const selectBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'select');
    expect(selectBtn?.classes()).toContain('active');
    wrapper.unmount();
  });

  it('renders EditorToolbar with 4 mode buttons', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.findAll('.mode-btn').length).toBe(4);
    wrapper.unmount();
  });

  it('clicking mode button changes active mode', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'paint');
    await paintBtn.trigger('click');
    expect(paintBtn.classes()).toContain('active');
    wrapper.unmount();
  });

  it('localStorage.setItem called when map data is updated', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // Emit hex-update from HexEditPanel child component
    const hexEditPanel = wrapper.findComponent(HexEditPanel);
    if (hexEditPanel.exists()) {
      hexEditPanel.vm.$emit('hex-update', { hex: '01.01', terrain: 'woods' });
      await flushPromises();
    }

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'lob-map-editor-mapdata-v1',
      expect.any(String)
    );
    wrapper.unmount();
  });

  it('draft banner is shown when localStorage has newer draft', async () => {
    const futureTs = Date.now() + 100000;
    const draft = { ...VALID_MAP, _savedAt: futureTs };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === 'lob-map-editor-mapdata-v1') return JSON.stringify(draft);
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.draft-banner').exists()).toBe(true);
    wrapper.unmount();
  });

  it('no draft banner when no localStorage draft', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.draft-banner').exists()).toBe(false);
    wrapper.unmount();
  });

  it('save button calls PUT when mapData is loaded', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_MAP) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    const saveBtn = wrapper.find('button.save-btn');
    await saveBtn.trigger('click');
    await flushPromises();

    // fetch called twice: once for GET, once for PUT
    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('save success clears the localStorage draft', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_MAP) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    const saveBtn = wrapper.find('button.save-btn');
    await saveBtn.trigger('click');
    await flushPromises();

    expect(localStorage.removeItem).toHaveBeenCalledWith('lob-map-editor-mapdata-v1');
    wrapper.unmount();
  });
});
