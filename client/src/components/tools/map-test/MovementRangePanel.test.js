import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MovementRangePanel from './MovementRangePanel.vue';
import { mockFetch } from './test-utils/mockFetch.js';

const RANGE_RESULT = {
  reachable: [
    { hex: '10.11', cost: 1 },
    { hex: '10.12', cost: 2 },
    { hex: '10.13', cost: 4 },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(RANGE_RESULT));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MovementRangePanel', () => {
  it('renders without error with no selection', () => {
    const wrapper = mount(MovementRangePanel);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toMatch(/click origin hex/i);
    wrapper.unmount();
  });

  it('displays loading state while fetch is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    expect(wrapper.text()).toMatch(/computing range/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(RANGE_RESULT) });
    wrapper.unmount();
  });

  it('shows reachable hex count after hex selected', async () => {
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/3 hexes reachable/i);
    wrapper.unmount();
  });

  it('shows MP legend after result arrives', async () => {
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/0.+2.*mp/i);
    expect(wrapper.text()).toMatch(/9\+.*mp/i);
    wrapper.unmount();
  });

  it('displays error message on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/http 500/i);
    wrapper.unmount();
  });

  it('emits overlay-update when result arrives', async () => {
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    const events = wrapper.emitted('overlay-update');
    expect(events).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('re-queries when formation changes', async () => {
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    const fetchMock = mockFetch(RANGE_RESULT);
    vi.stubGlobal('fetch', fetchMock);
    await wrapper.find('select').setValue('column');
    await flushPromises();
    expect(fetchMock).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('clear button resets state', async () => {
    const wrapper = mount(MovementRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    await wrapper.find('.clear-btn').trigger('click');
    expect(wrapper.text()).toMatch(/click origin hex/i);
    expect(wrapper.text()).not.toMatch(/hexes reachable/i);
    wrapper.unmount();
  });
});
