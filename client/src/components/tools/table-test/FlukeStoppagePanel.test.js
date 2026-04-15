import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import FlukeStoppagePanel from './FlukeStoppagePanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  });
}

const FLUKE_RESULT = {
  step1EffectiveRoll: 5,
  basePass: false,
  step2Required: true,
  step2EffectiveRoll: 8,
  step2Threshold: 7,
  stoppage: false,
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(FLUKE_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('FlukeStoppagePanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(FlukeStoppagePanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(FlukeStoppagePanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(FlukeStoppagePanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('5');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing fluke stoppage/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(FLUKE_RESULT) });
    wrapper.unmount();
  });

  it('displays result after successful POST', async () => {
    const wrapper = mount(FlukeStoppagePanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/base check/i);
    expect(wrapper.text()).toMatch(/stoppage/i);
    wrapper.unmount();
  });

  it('shows step 2 results when step2Required is true', async () => {
    const wrapper = mount(FlukeStoppagePanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/step 2 threshold/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'bad input' }, false));
    const wrapper = mount(FlukeStoppagePanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/bad input/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(FlukeStoppagePanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    // 'step 1 effective roll' only appears in the result section
    expect(wrapper.text()).not.toMatch(/step 1 effective roll/i);
    wrapper.unmount();
  });
});
