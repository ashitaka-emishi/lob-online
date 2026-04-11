import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import HexInspectorPanel from './HexInspectorPanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

const HEX_RESULT = {
  terrain: 'woods',
  elevation: 2,
  wedgeElevations: [2, 2, 3],
  hexsides: { 0: [{ type: 'slope' }] },
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(HEX_RESULT));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HexInspectorPanel', () => {
  it('renders without error with no selection', () => {
    const wrapper = mount(HexInspectorPanel);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toMatch(/click any hex/i);
    wrapper.unmount();
  });

  it('displays loading state while fetch is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    expect(wrapper.text()).toMatch(/loading hex data/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(HEX_RESULT) });
    wrapper.unmount();
  });

  it('displays terrain and elevation after hex selected', async () => {
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/woods/i);
    expect(wrapper.text()).toMatch(/2/);
    wrapper.unmount();
  });

  it('displays wedge elevations', async () => {
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/2, 2, 3/);
    wrapper.unmount();
  });

  it('displays hexside features', async () => {
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/slope/i);
    wrapper.unmount();
  });

  it('shows "none" when no hexsides present', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ terrain: 'clear', elevation: 0, wedgeElevations: [], hexsides: {} })
    );
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/none/i);
    wrapper.unmount();
  });

  it('displays error message on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/http 500/i);
    wrapper.unmount();
  });

  it('emits overlay-update when result arrives', async () => {
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    const events = wrapper.emitted('overlay-update');
    expect(events).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('clear button resets state', async () => {
    const wrapper = mount(HexInspectorPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    await wrapper.find('.clear-btn').trigger('click');
    expect(wrapper.text()).toMatch(/click any hex/i);
    expect(wrapper.text()).not.toMatch(/woods/i);
    wrapper.unmount();
  });
});
