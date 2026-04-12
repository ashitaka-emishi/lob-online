import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import ZeroRulePanel from './ZeroRulePanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ ma: 'full' }));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ZeroRulePanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(ZeroRulePanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required field is empty', () => {
    const wrapper = mount(ZeroRulePanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(ZeroRulePanel);
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing zero rule/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve({ ma: 'full' }) });
    wrapper.unmount();
  });

  it('displays MA result after successful POST', async () => {
    const wrapper = mount(ZeroRulePanel);
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/full ma/i);
    wrapper.unmount();
  });

  it('displays no-MA result for roll of 1', async () => {
    vi.stubGlobal('fetch', mockFetch({ ma: 'none' }));
    const wrapper = mount(ZeroRulePanel);
    await wrapper.find('input').setValue('1');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/no ma/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'bad dice' }, false));
    const wrapper = mount(ZeroRulePanel);
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/bad dice/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(ZeroRulePanel);
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/full ma/i);
    wrapper.unmount();
  });
});
