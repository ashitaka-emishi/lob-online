import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MoralePanel from './MoralePanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  });
}

const MORALE_RESULT = {
  effectiveRoll: 9,
  type: 'shaken',
  retreatHexes: 1,
  spLoss: 0,
  leaderLossCheck: false,
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(MORALE_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('MoralePanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(MoralePanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(MoralePanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(MoralePanel);
    await wrapper.find('select').setValue('C');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing morale result/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(MORALE_RESULT) });
    wrapper.unmount();
  });

  it('displays morale result after successful POST', async () => {
    const wrapper = mount(MoralePanel);
    await wrapper.find('select').setValue('C');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/shaken/i);
    expect(wrapper.text()).toMatch(/effective roll/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'invalid rating' }, false));
    const wrapper = mount(MoralePanel);
    await wrapper.find('select').setValue('C');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/invalid rating/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(MoralePanel);
    await wrapper.find('select').setValue('C');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    // 'effective roll' only appears in the result section
    expect(wrapper.text()).not.toMatch(/effective roll/i);
    wrapper.unmount();
  });
});
