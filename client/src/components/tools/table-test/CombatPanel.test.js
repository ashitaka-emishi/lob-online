import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import CombatPanel from './CombatPanel.vue';

const COMBAT_RESULT = {
  resultType: 'full',
  spLoss: 2,
  moraleCheckRequired: true,
  leaderLossCheckRequired: true,
  finalColumn: '4-5',
  depletionBand: 'right',
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(COMBAT_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('CombatPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(CombatPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(CombatPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(CombatPanel);
    await wrapper.find('input[placeholder="e.g. 6"]').setValue('5');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing combat result/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(COMBAT_RESULT) });
    wrapper.unmount();
  });

  it('displays result after successful POST', async () => {
    const wrapper = mount(CombatPanel);
    await wrapper.find('input[placeholder="e.g. 6"]').setValue('5');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/4-5/);
    expect(wrapper.text()).toMatch(/full/i);
    expect(wrapper.text()).toMatch(/2/);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'bad input' }, false));
    const wrapper = mount(CombatPanel);
    await wrapper.find('input[placeholder="e.g. 6"]').setValue('5');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/bad input/i);
    wrapper.unmount();
  });

  it('reset clears inputs and result', async () => {
    const wrapper = mount(CombatPanel);
    await wrapper.find('input[placeholder="e.g. 6"]').setValue('5');
    await wrapper.find('input[placeholder="2–12"]').setValue('8');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/4-5/);
    wrapper.unmount();
  });
});
