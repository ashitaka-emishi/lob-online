import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MapEditorView from './MapEditorView.vue';

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
});
