import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LosPanel from './LosPanel.vue';
import { mockFetch } from './test-utils/mockFetch.js';

const LOS_YES = { canSee: true, blockedBy: null, trace: ['10.11', '10.12'] };
const LOS_NO = { canSee: false, blockedBy: '10.11', trace: ['10.11'] };

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(LOS_YES));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LosPanel', () => {
  it('renders without error with no selection', () => {
    const wrapper = mount(LosPanel);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toMatch(/click observer hex/i);
    wrapper.unmount();
  });

  it('shows observer hint after first click', async () => {
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    expect(wrapper.text()).toMatch(/10\.10/);
    expect(wrapper.text()).toMatch(/click target hex/i);
    wrapper.unmount();
  });

  it('displays loading state while fetch is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    expect(wrapper.text()).toMatch(/computing los/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(LOS_YES) });
    wrapper.unmount();
  });

  it('shows line-of-sight YES badge when canSee is true', async () => {
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/line of sight.*yes/i);
    wrapper.unmount();
  });

  it('shows line-of-sight NO badge when canSee is false', async () => {
    vi.stubGlobal('fetch', mockFetch(LOS_NO));
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/line of sight.*no/i);
    wrapper.unmount();
  });

  it('shows blocking hex when LOS is blocked', async () => {
    vi.stubGlobal('fetch', mockFetch(LOS_NO));
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/blocked by/i);
    expect(wrapper.text()).toMatch(/10\.11/);
    wrapper.unmount();
  });

  it('displays trace hexes', async () => {
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/trace hexes/i);
    expect(wrapper.text()).toMatch(/10\.11/);
    wrapper.unmount();
  });

  it('displays error message on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/http 500/i);
    wrapper.unmount();
  });

  it('emits overlay-update when result arrives', async () => {
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    const events = wrapper.emitted('overlay-update');
    expect(events).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('clear button resets state', async () => {
    const wrapper = mount(LosPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.13' });
    await flushPromises();
    await wrapper.find('.clear-btn').trigger('click');
    expect(wrapper.text()).toMatch(/click observer hex/i);
    expect(wrapper.find('.can-see-badge').exists()).toBe(false);
    wrapper.unmount();
  });
});
