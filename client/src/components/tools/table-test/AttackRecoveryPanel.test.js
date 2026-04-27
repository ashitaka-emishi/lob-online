import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import AttackRecoveryPanel from './AttackRecoveryPanel.vue';

const RECOVERY_RESULT = {
  step1Threshold: 9,
  basePass: true,
  step2Required: true,
  step2EffectiveRoll: 8,
  step2Threshold: 8,
  recovered: true,
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(RECOVERY_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AttackRecoveryPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(AttackRecoveryPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(AttackRecoveryPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(AttackRecoveryPanel);
    await wrapper.find('select').setValue('wrecked');
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('10');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing attack recovery/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(RECOVERY_RESULT) });
    wrapper.unmount();
  });

  it('displays result after successful POST', async () => {
    const wrapper = mount(AttackRecoveryPanel);
    await wrapper.find('select').setValue('wrecked');
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('10');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/recovered/i);
    expect(wrapper.text()).toMatch(/base check/i);
    wrapper.unmount();
  });

  it('shows step 2 when step2Required is true', async () => {
    const wrapper = mount(AttackRecoveryPanel);
    await wrapper.find('select').setValue('wrecked');
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('10');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/step 2 threshold/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'invalid status' }, false));
    const wrapper = mount(AttackRecoveryPanel);
    await wrapper.find('select').setValue('wrecked');
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('10');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/invalid status/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(AttackRecoveryPanel);
    await wrapper.find('select').setValue('wrecked');
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('10');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    // 'step 1 threshold' only appears in the result section
    expect(wrapper.text()).not.toMatch(/step 1 threshold/i);
    wrapper.unmount();
  });
});
