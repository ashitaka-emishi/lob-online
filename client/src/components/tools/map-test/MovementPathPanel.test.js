import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MovementPathPanel from './MovementPathPanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

const PATH_RESULT = {
  path: ['10.10', '10.11', '10.12'],
  totalCost: 4,
  impassable: false,
  costs: [
    { hex: '10.11', terrainCost: 1, hexsideCost: 0, total: 1 },
    { hex: '10.12', terrainCost: 2, hexsideCost: 1, total: 3 },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(PATH_RESULT));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MovementPathPanel', () => {
  it('renders without error with no selection', () => {
    const wrapper = mount(MovementPathPanel);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toMatch(/click start hex/i);
    wrapper.unmount();
  });

  it('shows start hint after first click', async () => {
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    expect(wrapper.text()).toMatch(/10\.10/);
    expect(wrapper.text()).toMatch(/click end hex/i);
    wrapper.unmount();
  });

  it('displays loading state while fetch is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.11' });
    expect(wrapper.text()).toMatch(/computing path/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(PATH_RESULT) });
    wrapper.unmount();
  });

  it('displays cost table after both hexes selected', async () => {
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.12' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/total/i);
    expect(wrapper.text()).toMatch(/4/);
    expect(wrapper.find('table').exists()).toBe(true);
    wrapper.unmount();
  });

  it('displays impassable message when path is blocked', async () => {
    vi.stubGlobal('fetch', mockFetch({ path: [], totalCost: 0, impassable: true, costs: [] }));
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.12' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/impassable/i);
    wrapper.unmount();
  });

  it('displays error message on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.12' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/http 500/i);
    wrapper.unmount();
  });

  it('emits overlay-update when result arrives', async () => {
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.12' });
    await flushPromises();
    const events = wrapper.emitted('overlay-update');
    expect(events).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('clear button resets state', async () => {
    const wrapper = mount(MovementPathPanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await wrapper.setProps({ clickedHexId: '10.12' });
    await flushPromises();
    await wrapper.find('.clear-btn').trigger('click');
    expect(wrapper.text()).toMatch(/click start hex/i);
    expect(wrapper.find('table').exists()).toBe(false);
    wrapper.unmount();
  });
});
