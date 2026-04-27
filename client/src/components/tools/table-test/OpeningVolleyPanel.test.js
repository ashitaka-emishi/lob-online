import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import OpeningVolleyPanel from './OpeningVolleyPanel.vue';

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ spLoss: 1 }));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpeningVolleyPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(OpeningVolleyPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(OpeningVolleyPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(OpeningVolleyPanel);
    await wrapper.find('select').setValue('charge');
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing opening volley/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve({ spLoss: 1 }) });
    wrapper.unmount();
  });

  it('displays SP loss after successful POST', async () => {
    const wrapper = mount(OpeningVolleyPanel);
    await wrapper.find('select').setValue('charge');
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/sp loss/i);
    expect(wrapper.text()).toMatch(/1/);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'bad condition' }, false));
    const wrapper = mount(OpeningVolleyPanel);
    await wrapper.find('select').setValue('charge');
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/bad condition/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(OpeningVolleyPanel);
    await wrapper.find('select').setValue('charge');
    await wrapper.find('input').setValue('5');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/sp loss/i);
    wrapper.unmount();
  });
});
