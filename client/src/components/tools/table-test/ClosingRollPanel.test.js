import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import ClosingRollPanel from './ClosingRollPanel.vue';

const CLOSING_RESULT = { pass: true, threshold: 3, modifiedRoll: 4 };

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(CLOSING_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ClosingRollPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(ClosingRollPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(ClosingRollPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(ClosingRollPanel);
    await wrapper.find('select').setValue('B');
    await wrapper.find('input').setValue('3');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing closing roll/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(CLOSING_RESULT) });
    wrapper.unmount();
  });

  it('displays pass/fail result after successful POST', async () => {
    const wrapper = mount(ClosingRollPanel);
    await wrapper.find('select').setValue('B');
    await wrapper.find('input').setValue('3');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/pass/i);
    expect(wrapper.text()).toMatch(/threshold/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'invalid rating' }, false));
    const wrapper = mount(ClosingRollPanel);
    await wrapper.find('select').setValue('B');
    await wrapper.find('input').setValue('3');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/invalid rating/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(ClosingRollPanel);
    await wrapper.find('select').setValue('B');
    await wrapper.find('input').setValue('3');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/threshold/i);
    wrapper.unmount();
  });
});
