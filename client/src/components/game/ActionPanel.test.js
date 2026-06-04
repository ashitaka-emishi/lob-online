import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ActionPanel from './ActionPanel.vue';

const DEFAULT_PROPS = {
  phase: 'command',
  step: 'orders',
  turn: 3,
  activePlayer: 'union',
  validActions: [],
  pending: false,
  localPlayerSide: 'union',
};

describe('ActionPanel — phase/turn summary', () => {
  it('renders turn, phase, and step summary line', () => {
    const wrapper = mount(ActionPanel, { props: DEFAULT_PROPS });
    expect(wrapper.text()).toMatch(/turn 3/i);
    expect(wrapper.text()).toMatch(/command/i);
    expect(wrapper.text()).toMatch(/orders/i);
  });
});

describe('ActionPanel — action buttons', () => {
  it('renders one button per validActions entry', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [
          { type: 'END_PHASE', payload: null },
          { type: 'PASS', payload: null },
        ],
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
  });

  it('renders title-cased label from action type', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
      },
    });
    expect(wrapper.text()).toContain('End Phase');
  });

  it('renders no buttons when validActions is empty and it is the local player turn', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, validActions: [] },
    });
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('disables all buttons when pending is true', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
        pending: true,
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined());
  });

  it('emits submit-action with { type, payload } on button click', async () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: { foo: 1 } }],
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('submit-action')).toBeTruthy();
    expect(wrapper.emitted('submit-action')[0]).toEqual([
      { type: 'END_PHASE', payload: { foo: 1 } },
    ]);
  });
});

describe('ActionPanel — waiting state', () => {
  it('shows waiting message when activePlayer does not match localPlayerSide', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        activePlayer: 'confederate',
        localPlayerSide: 'union',
      },
    });
    expect(wrapper.text()).toMatch(/waiting for/i);
    expect(wrapper.text()).toMatch(/confederate/i);
  });

  it('does not show waiting message when it is the local player turn', () => {
    const wrapper = mount(ActionPanel, { props: DEFAULT_PROPS });
    expect(wrapper.text()).not.toMatch(/waiting for/i);
  });
});
