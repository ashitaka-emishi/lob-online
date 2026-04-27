import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import OrderDeliveryPanel from './OrderDeliveryPanel.vue';

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ turnsToDeliver: 4 }));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('OrderDeliveryPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(OrderDeliveryPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(OrderDeliveryPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(OrderDeliveryPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('normal');
    await selects[1].setValue('beyondRadius');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing order delivery/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve({ turnsToDeliver: 4 }) });
    wrapper.unmount();
  });

  it('displays turns to deliver after successful POST', async () => {
    const wrapper = mount(OrderDeliveryPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('normal');
    await selects[1].setValue('beyondRadius');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/turns to deliver/i);
    expect(wrapper.text()).toMatch(/4/);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'invalid armyCOType' }, false));
    const wrapper = mount(OrderDeliveryPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('normal');
    await selects[1].setValue('beyondRadius');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/invalid/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(OrderDeliveryPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('normal');
    await selects[1].setValue('beyondRadius');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/turns to deliver/i);
    wrapper.unmount();
  });
});
