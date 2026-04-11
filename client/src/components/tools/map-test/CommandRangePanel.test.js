import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CommandRangePanel from './CommandRangePanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}

const RANGE_RESULT = {
  withinRadius: ['10.11', '10.12', '10.13'],
  beyondRadius: ['10.14', '10.15'],
  beyondRadiusFar: ['10.20'],
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(RANGE_RESULT));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CommandRangePanel', () => {
  it('renders without error with no selection', () => {
    const wrapper = mount(CommandRangePanel);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toMatch(/click commander hex/i);
    wrapper.unmount();
  });

  it('shows commander level selector with all four levels', () => {
    const wrapper = mount(CommandRangePanel);
    const options = wrapper.findAll('option').map((o) => o.text());
    expect(options).toContain('brigade');
    expect(options).toContain('division');
    expect(options).toContain('corps');
    expect(options).toContain('army');
    wrapper.unmount();
  });

  it('displays loading state while fetch is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(CommandRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    expect(wrapper.text()).toMatch(/computing command range/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(RANGE_RESULT) });
    wrapper.unmount();
  });

  it('shows zone counts after hex selected', async () => {
    const wrapper = mount(CommandRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/within radius.*3/i);
    expect(wrapper.text()).toMatch(/beyond radius.*2/i);
    expect(wrapper.text()).toMatch(/beyond radius.*far.*1/i);
    wrapper.unmount();
  });

  it('displays error message on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    const wrapper = mount(CommandRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    expect(wrapper.text()).toMatch(/http 500/i);
    wrapper.unmount();
  });

  it('emits overlay-update when result arrives', async () => {
    const wrapper = mount(CommandRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    const events = wrapper.emitted('overlay-update');
    expect(events).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('re-queries when commander level changes', async () => {
    const wrapper = mount(CommandRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    const fetchMock = mockFetch(RANGE_RESULT);
    vi.stubGlobal('fetch', fetchMock);
    await wrapper.find('select').setValue('division');
    await flushPromises();
    expect(fetchMock).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('clear button resets state', async () => {
    const wrapper = mount(CommandRangePanel);
    await wrapper.setProps({ clickedHexId: '10.10' });
    await flushPromises();
    await wrapper.find('.clear-btn').trigger('click');
    expect(wrapper.text()).toMatch(/click commander hex/i);
    expect(wrapper.text()).not.toMatch(/within radius/i);
    wrapper.unmount();
  });
});
