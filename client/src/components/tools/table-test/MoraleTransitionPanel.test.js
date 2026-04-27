import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFetch } from './test-utils/mockFetch.js';
import { mount, flushPromises } from '@vue/test-utils';
import MoraleTransitionPanel from './MoraleTransitionPanel.vue';

const TRANSITION_RESULT = { newState: 'dg', suppressRetreatsAndLosses: false };

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(TRANSITION_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('MoraleTransitionPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(MoraleTransitionPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(MoraleTransitionPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(MoraleTransitionPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('shaken');
    await selects[1].setValue('shaken');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/resolving transition/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(TRANSITION_RESULT) });
    wrapper.unmount();
  });

  it('displays transition result after successful POST', async () => {
    const wrapper = mount(MoraleTransitionPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('shaken');
    await selects[1].setValue('shaken');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/new state/i);
    expect(wrapper.text()).toMatch(/dg/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'no transition defined' }, false));
    const wrapper = mount(MoraleTransitionPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('bl');
    await selects[1].setValue('normal');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/no transition defined/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(MoraleTransitionPanel);
    const selects = wrapper.findAll('select');
    await selects[0].setValue('shaken');
    await selects[1].setValue('shaken');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/new state/i);
    wrapper.unmount();
  });
});
