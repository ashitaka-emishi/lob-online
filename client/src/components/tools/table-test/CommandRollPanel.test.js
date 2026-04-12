import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CommandRollPanel from './CommandRollPanel.vue';

function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  });
}

const CMD_RESULT = { yes: true, modifiedRoll: 12 };

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(CMD_RESULT));
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('CommandRollPanel', () => {
  it('renders without error with no submission', () => {
    const wrapper = mount(CommandRollPanel);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('submit button is disabled when required fields are empty', () => {
    const wrapper = mount(CommandRollPanel);
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('displays loading state while POST is in flight', async () => {
    let resolve;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
    const wrapper = mount(CommandRollPanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('9');
    await wrapper.find('button').trigger('click');
    expect(wrapper.text()).toMatch(/computing command roll/i);
    resolve({ ok: true, status: 200, json: () => Promise.resolve(CMD_RESULT) });
    wrapper.unmount();
  });

  it('displays yes/no result after successful POST', async () => {
    const wrapper = mount(CommandRollPanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('9');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/yes/i);
    expect(wrapper.text()).toMatch(/modified roll/i);
    wrapper.unmount();
  });

  it('displays error on fetch failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: 'bad input' }, false));
    const wrapper = mount(CommandRollPanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('9');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toMatch(/bad input/i);
    wrapper.unmount();
  });

  it('reset clears result', async () => {
    const wrapper = mount(CommandRollPanel);
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0].setValue('3');
    await inputs[1].setValue('9');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.text()).not.toMatch(/modified roll/i);
    wrapper.unmount();
  });
});
