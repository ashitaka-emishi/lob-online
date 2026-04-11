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
      'overlayConfig',
      'interactionEnabled',
      'edgeInteraction',
      'dragPaintEnabled',
      'seedHexIds',
    ],
    emits: ['hex-click', 'hex-mouseenter', 'hex-mouseleave', 'edge-click', 'edge-right-click'],
  },
}));

import MapEditorView from './MapEditorView.vue';
import ElevationSystemControls from '../../components/ElevationSystemControls.vue';
import ElevationToolPanel from '../../components/ElevationToolPanel.vue';

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
    evenColUp: true,
  },
};

function makeElevationMap() {
  return {
    ...VALID_MAP,
    elevationSystem: {
      baseElevation: 500,
      elevationLevels: 22,
      contourInterval: 50,
      unit: 'feet',
      verticalSlopesImpassable: true,
    },
  };
}

const MAP_DRAFT_KEY = 'lob-map-editor-mapdata-south-mountain-v2';

function mockFetch(data, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

/** Open the elevation panel and return the ElevationToolPanel component. */
async function openElevationPanel(wrapper) {
  const headers = wrapper.findAll('button.accordion-header');
  const elevHeader = headers.find((h) => h.text().includes('Elevation Tool'));
  await elevHeader.trigger('click');
  await flushPromises();
  return wrapper.findComponent(ElevationToolPanel);
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

    // Make the editor dirty via ElevationToolPanel clear-all-elevations
    const elevPanel = await openElevationPanel(wrapper);
    elevPanel.vm.$emit('clear-all-elevations');
    await flushPromises();

    const pullBtn = wrapper.find('button.pull-btn');
    await pullBtn.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Discard local changes');
    wrapper.unmount();
  });

  it('EditorToolbar is no longer rendered (removed in framework refactor)', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    // No EditorToolbar — no global layer checkbox row above the body
    const allCheckboxes = wrapper.findAll('input[type="checkbox"]');
    // Any checkboxes present are inside open panel content, not a toolbar row
    expect(wrapper.find('.editor-toolbar').exists()).toBe(false);
    expect(allCheckboxes.length).toBe(0); // no panel open at mount
    wrapper.unmount();
  });

  it('opening Elevation Tool accordion sets editorMode to elevation', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const headers = wrapper.findAll('button.accordion-header');
    const elevHeader = headers.find((h) => h.text().includes('Elevation Tool'));
    await elevHeader.trigger('click');
    expect(wrapper.text()).toContain('Elevation tint');
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

    // Open elevation panel and trigger a mutation via clear-all-elevations
    const elevPanel = await openElevationPanel(wrapper);
    elevPanel.vm.$emit('clear-all-elevations');
    await flushPromises();

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

    // Make unsaved=true via ElevationToolPanel clear-all-elevations
    const elevPanel = await openElevationPanel(wrapper);
    elevPanel.vm.$emit('clear-all-elevations');
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

    // No panel open by default
    expect(wrapper.text()).not.toContain('Elevation tint');

    // Open Elevation panel
    const headers = wrapper.findAll('button.accordion-header');
    const elevHeader = headers.find((h) => h.text().includes('Elevation Tool'));
    await elevHeader.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Elevation tint');

    // Click Grid & Elevation Setup to open it — Elevation should close
    const calHeader = headers.find((h) => h.text().includes('Grid & Elevation Setup'));
    await calHeader.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Elevation tint');
    wrapper.unmount();
  });

  it('top bar displays active tool name when a panel is open', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // Open elevation panel
    const headers = wrapper.findAll('button.accordion-header');
    const elevHeader = headers.find((h) => h.text().includes('Elevation Tool'));
    await elevHeader.trigger('click');
    await flushPromises();

    const activeTool = wrapper.find('.active-tool');
    expect(activeTool.exists()).toBe(true);
    expect(activeTool.text()).toContain('Elevation');
    wrapper.unmount();
  });

  it('calibration-extra div is not in the DOM (removed in #92)', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.find('.calibration-extra').exists()).toBe(false);
    wrapper.unmount();
  });

  it('elevation-system-change from ElevationSystemControls merges into mapData.elevationSystem', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', mockFetch(makeElevationMap()));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // Open Grid & Elevation Setup accordion (ElevationSystemControls is rendered inside it)
    const headers = wrapper.findAll('button.accordion-header');
    const calHeader = headers.find((h) => h.text().includes('Grid & Elevation Setup'));
    await calHeader.trigger('click');
    await flushPromises();

    // Emit elevation-system-change directly from ElevationSystemControls
    const elevControls = wrapper.findComponent(ElevationSystemControls);
    elevControls.vm.$emit('elevation-system-change', {
      baseElevation: 600,
      elevationLevels: 25,
      contourInterval: 50,
      unit: 'feet',
      verticalSlopesImpassable: true,
    });
    await flushPromises();

    vi.runAllTimers();
    const calls = localStorage.setItem.mock.calls.filter(([key]) => key === MAP_DRAFT_KEY);
    expect(calls.length).toBeGreaterThan(0);
    const saved = JSON.parse(calls[calls.length - 1][1]);
    expect(saved.elevationSystem.baseElevation).toBe(600);
    expect(saved.elevationSystem.elevationLevels).toBe(25);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('ElevationSystemControls receives elevationSystem prop from mapData (#111)', async () => {
    vi.stubGlobal('fetch', mockFetch(makeElevationMap()));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    // Open Grid & Elevation Setup accordion (ElevationSystemControls is rendered inside it)
    const headers = wrapper.findAll('button.accordion-header');
    const calHeader = headers.find((h) => h.text().includes('Grid & Elevation Setup'));
    await calHeader.trigger('click');
    await flushPromises();

    const elevControls = wrapper.findComponent(ElevationSystemControls);
    expect(elevControls.props('elevationSystem')).toEqual(
      expect.objectContaining({ baseElevation: 500, elevationLevels: 22 })
    );
    wrapper.unmount();
  });

  // onMutated guard (#123): unsaved.value = true is written only once across multiple mutations
  it('marks unsaved on first mutation and stays marked on subsequent updates', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).not.toContain('* unsaved');

    const elevPanel = await openElevationPanel(wrapper);
    elevPanel.vm.$emit('clear-all-elevations');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('* unsaved');

    elevPanel.vm.$emit('clear-all-elevations');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('* unsaved');

    vi.useRealTimers();
    wrapper.unmount();
  });

  it('opening Road Tool accordion renders trail/road/pike type buttons', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const headers = wrapper.findAll('button.accordion-header');
    const roadHeader = headers.find((h) => h.text().includes('Road Tool'));
    await roadHeader.trigger('click');
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('trail');
    expect(text).toContain('road');
    expect(text).toContain('pike');
    wrapper.unmount();
  });

  it('opening Stream & Stone Wall Tool accordion renders stream/stoneWall type buttons', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const headers = wrapper.findAll('button.accordion-header');
    const streamHeader = headers.find((h) => h.text().includes('Stream'));
    await streamHeader.trigger('click');
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('stream');
    expect(text).toContain('stoneWall');
    wrapper.unmount();
  });

  it('opening Contour Tool accordion renders all four contour type buttons', async () => {
    vi.stubGlobal('fetch', mockFetch(VALID_MAP));
    const wrapper = mount(MapEditorView, { attachTo: document.body });
    await flushPromises();
    const headers = wrapper.findAll('button.accordion-header');
    const contourHeader = headers.find((h) => h.text().includes('Contour Tool'));
    await contourHeader.trigger('click');
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('elevation');
    expect(text).toContain('slope');
    expect(text).toContain('extremeSlope');
    expect(text).toContain('verticalSlope');
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
