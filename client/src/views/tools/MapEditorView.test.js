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
      'seedHexIds',
    ],
    emits: ['hex-click', 'hex-mouseenter', 'hex-mouseleave', 'edge-click', 'edge-hover'],
  },
}));

vi.mock('../../components/HexEditPanel.vue', () => ({
  default: {
    name: 'HexEditPanel',
    template: '<div class="hex-edit-panel-stub"></div>',
    props: [
      'hex',
      'selectedHexId',
      'hexFeatureTypes',
      'edgeFeatureTypes',
      'isSeedHex',
      'northOffset',
    ],
    emits: ['hex-update', 'seed-toggle'],
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
import LosTestPanel from '../../components/LosTestPanel.vue';

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

const MAP_DRAFT_KEY = 'lob-map-editor-mapdata-south-mountain-v2';

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

  it('renders Push to Server button', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const saveBtn = wrapper.find('button.save-btn');
    expect(saveBtn.exists()).toBe(true);
    expect(saveBtn.text()).toBe('Push to Server');
    wrapper.unmount();
  });

  it('renders Pull from Server button', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const pullBtn = wrapper.find('button.pull-btn');
    expect(pullBtn.exists()).toBe(true);
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

  it('shows fetch error when API fails and no draft exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).toContain('Failed to load');
    wrapper.unmount();
  });

  it('shows offline banner when fetch throws and draft exists', async () => {
    const draft = { ...VALID_MAP, _savedAt: Date.now() };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === MAP_DRAFT_KEY) return JSON.stringify(draft);
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.offline-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Server unreachable');
    wrapper.unmount();
  });

  it('shows fetch error when fetch throws and no draft exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.offline-banner').exists()).toBe(false);
    expect(wrapper.text()).toContain('Failed to load');
    wrapper.unmount();
  });

  it('Push to Server button shows "Offline" when server unreachable', async () => {
    const draft = { ...VALID_MAP, _savedAt: Date.now() };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === MAP_DRAFT_KEY) return JSON.stringify(draft);
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const saveBtn = wrapper.find('button.save-btn');
    expect(saveBtn.text()).toBe('Offline');
    expect(saveBtn.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('clicking Pull from Server when dirty shows confirmation dialog', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // Make the editor dirty
    const hexEditPanel = wrapper.findComponent(HexEditPanel);
    if (hexEditPanel.exists()) {
      hexEditPanel.vm.$emit('hex-update', { hex: '01.01', terrain: 'woods' });
      await flushPromises();
    }

    const pullBtn = wrapper.find('button.pull-btn');
    await pullBtn.trigger('click');
    await flushPromises();

    // ConfirmDialog should be visible
    expect(wrapper.text()).toContain('Discard local changes');
    wrapper.unmount();
  });

  it('EditorToolbar renders layer checkboxes (mode buttons removed)', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.findAll('.mode-btn').length).toBe(0);
    expect(wrapper.findAll('input[type="checkbox"]').length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('opening Elevation Tool accordion sets editorMode to elevation', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const headers = wrapper.findAll('button.accordion-header');
    const elevHeader = headers.find((h) => h.text().includes('Elevation Tool'));
    await elevHeader.trigger('click');
    // ElevationToolPanel should be visible
    expect(wrapper.text()).toContain('Raise all');
    wrapper.unmount();
  });

  it('opening Terrain Tool accordion renders TerrainToolPanel', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const headers = wrapper.findAll('button.accordion-header');
    const terrainHeader = headers.find((h) => h.text().includes('Terrain Tool'));
    await terrainHeader.trigger('click');
    expect(wrapper.text()).toContain('Clear all terrain');
    wrapper.unmount();
  });

  it('localStorage.setItem called with v2 key when map data is updated', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // Emit hex-update from HexEditPanel child component
    const hexEditPanel = wrapper.findComponent(HexEditPanel);
    if (hexEditPanel.exists()) {
      hexEditPanel.vm.$emit('hex-update', { hex: '01.01', terrain: 'woods' });
      await flushPromises();
    }

    // saveMapDraft is debounced 500ms — advance timers to trigger the write
    vi.runAllTimers();
    expect(localStorage.setItem).toHaveBeenCalledWith(MAP_DRAFT_KEY, expect.any(String));
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('draft banner is shown when localStorage has newer draft', async () => {
    const futureTs = Date.now() + 100000;
    const draft = { ...VALID_MAP, _savedAt: futureTs };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === MAP_DRAFT_KEY) return JSON.stringify(draft);
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

  it('push button calls PUT when mapData is loaded', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_MAP) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: Date.now() }),
      });
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

  describe('LOS panel event handling', () => {
    async function mountWithLos() {
      vi.stubGlobal('fetch', mockFetch(VALID_MAP));
      const wrapper = mount(MapEditorView, { attachTo: document.body });
      await flushPromises();
      // Open the LOS Test accordion so LosTestPanel is rendered
      const headers = wrapper.findAll('button.accordion-header');
      const losHeader = headers.find((h) => h.text().includes('LOS Test'));
      await losHeader.trigger('click');
      return wrapper;
    }

    it('@pick-start updates losSelectingHex prop on LosTestPanel', async () => {
      const wrapper = await mountWithLos();
      const panel = wrapper.findComponent(LosTestPanel);
      panel.vm.$emit('pick-start', 'A');
      await flushPromises();
      expect(wrapper.findComponent(LosTestPanel).props('selectingHex')).toBe('A');
      wrapper.unmount();
    });

    it('@pick-cancel resets losSelectingHex to null', async () => {
      const wrapper = await mountWithLos();
      const panel = wrapper.findComponent(LosTestPanel);
      panel.vm.$emit('pick-start', 'B');
      await flushPromises();
      panel.vm.$emit('pick-cancel');
      await flushPromises();
      expect(wrapper.findComponent(LosTestPanel).props('selectingHex')).toBeNull();
      wrapper.unmount();
    });

    it('@set-hex-a updates hexA prop on LosTestPanel', async () => {
      const wrapper = await mountWithLos();
      const panel = wrapper.findComponent(LosTestPanel);
      panel.vm.$emit('set-hex-a', '03.05');
      await flushPromises();
      expect(wrapper.findComponent(LosTestPanel).props('hexA')).toBe('03.05');
      wrapper.unmount();
    });

    it('@set-hex-b updates hexB prop on LosTestPanel', async () => {
      const wrapper = await mountWithLos();
      const panel = wrapper.findComponent(LosTestPanel);
      panel.vm.$emit('set-hex-b', '07.05');
      await flushPromises();
      expect(wrapper.findComponent(LosTestPanel).props('hexB')).toBe('07.05');
      wrapper.unmount();
    });

    it('@los-result captures the result object', async () => {
      const wrapper = await mountWithLos();
      const panel = wrapper.findComponent(LosTestPanel);
      const fakeResult = { clear: true, steps: [] };
      panel.vm.$emit('los-result', fakeResult);
      await flushPromises();
      // No public prop for losResult, but the emit should not throw
      // and the component should remain stable
      expect(wrapper.findComponent(LosTestPanel).exists()).toBe(true);
      wrapper.unmount();
    });
  });

  it('v1→v2 migration: copies v1 draft to v2 key and removes v1 key on mount', async () => {
    const v1Data = JSON.stringify({ ...VALID_MAP, _savedAt: 1000 });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === 'lob-map-editor-mapdata-v1') return v1Data;
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    expect(localStorage.setItem).toHaveBeenCalledWith(MAP_DRAFT_KEY, v1Data);
    expect(localStorage.removeItem).toHaveBeenCalledWith('lob-map-editor-mapdata-v1');
    wrapper.unmount();
  });

  it('no push confirmation dialog when no unsaved changes, even if server has newer timestamp', async () => {
    const serverMap = { ...VALID_MAP, _savedAt: 2000 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(serverMap) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: 3000 }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.save-btn').trigger('click');
    await flushPromises();

    // No confirmation dialog — push proceeds directly when nothing is unsaved
    expect(wrapper.text()).not.toContain('Server data is newer');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('push confirmation → Overwrite → PUT fires when unsaved and server is newer', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1500); // Date.now() = 1500 < serverMap._savedAt=2000

    const serverMap = { ...VALID_MAP, _savedAt: 2000 };
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, val) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(serverMap) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: 3000 }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    // serverSavedAt = 2000; Date.now() = 1500

    // Emit a hex-update to set unsaved=true (saveMapDraft stores draft with _savedAt=1500)
    const hexEditPanel = wrapper.findComponent({ name: 'HexEditPanel' });
    await hexEditPanel.vm.$emit('hex-update', { hex: '01.01', terrain: 'woods' });
    await flushPromises();
    // unsaved=true, localDraftSavedAt=1500 < serverSavedAt=2000 → dialog should appear

    await wrapper.find('button.save-btn').trigger('click');
    await flushPromises();

    const overwriteBtn = wrapper.findAll('button').find((b) => b.text() === 'Overwrite');
    await overwriteBtn.trigger('click');
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    wrapper.unmount();
  });

  it('pull when not dirty: no dialog, fetches directly', async () => {
    const fetchMock = mockFetch(VALID_MAP);
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    await wrapper.find('button.pull-btn').trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Discard local changes');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('opening one accordion panel closes any previously open panel', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // hexEdit is open by default — HexEditPanel stub should be rendered
    expect(wrapper.find('.hex-edit-panel-stub').exists()).toBe(true);

    // Click the Grid Calibration header to open it
    const headers = wrapper.findAll('button.accordion-header');
    const calHeader = headers.find((h) => h.text().includes('Grid Calibration'));
    await calHeader.trigger('click');
    await flushPromises();

    // hexEdit panel should now be closed
    expect(wrapper.find('.hex-edit-panel-stub').exists()).toBe(false);
    wrapper.unmount();
  });

  it('top bar displays active tool name when a panel is open', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // hexEdit is open by default
    const activeTool = wrapper.find('.active-tool');
    expect(activeTool.exists()).toBe(true);
    expect(activeTool.text()).toContain('Hex Edit');
    wrapper.unmount();
  });

  it('Hex Edit accordion header always reads "Hex Edit"', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    const headers = wrapper.findAll('button.accordion-header');
    const hexEditHeader = headers.find((h) => h.text().includes('Hex Edit'));
    expect(hexEditHeader).toBeTruthy();
    // Should not contain a dynamic hex ID — just the fixed label
    expect(hexEditHeader.text()).not.toMatch(/Hex \d{2}\.\d{2}/);
    wrapper.unmount();
  });

  it('onSeedToggle toggles a seed hex off when already in the set', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    const hexEditPanel = wrapper.findComponent({ name: 'HexEditPanel' });
    // Toggle on
    await hexEditPanel.vm.$emit('seed-toggle', {
      hexId: '01.01',
      confirmedData: { terrain: 'clear', elevation: 1 },
    });
    await flushPromises();
    // Toggle off
    await hexEditPanel.vm.$emit('seed-toggle', {
      hexId: '01.01',
      confirmedData: { terrain: 'clear', elevation: 1 },
    });
    await flushPromises();

    // After toggling off, seed-hex-ids prop passed to HexMapOverlay should not contain '01.01'
    const overlay = wrapper.findComponent({ name: 'HexMapOverlay' });
    expect(overlay.props('seedHexIds')).not.toContain('01.01');
    wrapper.unmount();
  });

  it('save success clears the v2 localStorage draft key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_MAP) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, _savedAt: Date.now() }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    const saveBtn = wrapper.find('button.save-btn');
    await saveBtn.trigger('click');
    await flushPromises();

    expect(localStorage.removeItem).toHaveBeenCalledWith(MAP_DRAFT_KEY);
    wrapper.unmount();
  });
});
