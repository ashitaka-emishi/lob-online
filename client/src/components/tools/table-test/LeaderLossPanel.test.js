import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import LeaderLossPanel from './LeaderLossPanel.vue';

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ result: 'wounded' }));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('LeaderLossPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(LeaderLossPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(LeaderLossPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(LeaderLossPanel);
    await wrapper.find('select').setValue('other');
    await wrapper.find('input[type="number"]').setValue('11');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing leader loss/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve({ result: 'wounded' }) });
    wrapper.unmount();
  });

  it('displays result after successful POST', async () => {
    const wrapper = mount(LeaderLossPanel);
    await wrapper.find('select').setValue('other');
    await wrapper.find('input[type="number"]').setValue('11');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/wounded/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'invalid situation' }, false));
    const wrapper = mount(LeaderLossPanel);
    await wrapper.find('select').setValue('other');
    await wrapper.find('input[type="number"]').setValue('11');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/invalid situation/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(LeaderLossPanel);
    await wrapper.find('select').setValue('other');
    await wrapper.find('input[type="number"]').setValue('11');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/wounded/i);
    wrapper.unmount();
  });
});
