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
  pendingActionType: null,
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

describe('ActionPanel — landmark and ARIA structure (#498)', () => {
  it('wraps panel in a <section> with role=region and aria-label=Actions', () => {
    const wrapper = mount(ActionPanel, { props: DEFAULT_PROPS });
    const section = wrapper.find('section');
    expect(section.exists()).toBe(true);
    expect(section.attributes('role')).toBe('region');
    expect(section.attributes('aria-label')).toBe('Actions');
  });

  it('button container has role=group and aria-label', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, validActions: [{ type: 'END_PHASE', payload: null }] },
    });
    const group = wrapper.find('[role="group"]');
    expect(group.exists()).toBe(true);
    expect(group.attributes('aria-label')).toBeTruthy();
  });

  it('button container has aria-describedby pointing to summary when turn and phase are set (#498)', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, validActions: [{ type: 'END_PHASE', payload: null }] },
    });
    const group = wrapper.find('[role="group"]');
    const summaryId = group.attributes('aria-describedby');
    expect(summaryId).toBeTruthy();
    expect(wrapper.find(`#${summaryId}`).exists()).toBe(true);
  });

  it('button container has no aria-describedby when phase is null (#498)', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        phase: null,
        turn: null,
        validActions: [{ type: 'END_PHASE', payload: null }],
      },
    });
    const group = wrapper.find('[role="group"]');
    expect(group.attributes('aria-describedby')).toBeUndefined();
  });
});

describe('ActionPanel — aria-live announcement (#497)', () => {
  it('renders a polite aria-live region', () => {
    const wrapper = mount(ActionPanel, { props: DEFAULT_PROPS });
    const liveEl = wrapper.find('[aria-live="polite"]');
    expect(liveEl.exists()).toBe(true);
  });

  it('live region announces "Your turn" when it is the local player turn', () => {
    const wrapper = mount(ActionPanel, { props: { ...DEFAULT_PROPS, phase: 'command' } });
    const liveEl = wrapper.find('[aria-live="polite"]');
    expect(liveEl.text()).toMatch(/your turn/i);
  });

  it('live region announces waiting when it is not the local player turn', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, activePlayer: 'confederate', localPlayerSide: 'union' },
    });
    const liveEl = wrapper.find('[aria-live="polite"]');
    expect(liveEl.text()).toMatch(/waiting for/i);
  });

  it('live region announces submitting when pending is true with pendingActionType', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, pending: true, pendingActionType: 'END_PHASE' },
    });
    const liveEl = wrapper.find('[aria-live="polite"]');
    expect(liveEl.text()).toMatch(/submitting/i);
    expect(liveEl.text()).toMatch(/end phase/i);
  });

  it('live region announces generic "action" when pending but pendingActionType is null', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, pending: true, pendingActionType: null },
    });
    const liveEl = wrapper.find('[aria-live="polite"]');
    expect(liveEl.text()).toMatch(/submitting/i);
    expect(liveEl.text()).toMatch(/action/i);
  });
});

describe('ActionPanel — aria-busy on pending (#497)', () => {
  it('actions container has aria-busy=true when pending', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
        pending: true,
      },
    });
    const group = wrapper.find('[role="group"]');
    expect(group.attributes('aria-busy')).toBe('true');
  });

  it('actions container has aria-busy=false when not pending', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
        pending: false,
      },
    });
    const group = wrapper.find('[role="group"]');
    expect(group.attributes('aria-busy')).toBe('false');
  });
});

describe('ActionPanel — pendingActionType spinner targeting (#500)', () => {
  const TWO_ACTIONS = [
    { type: 'END_PHASE', payload: null },
    { type: 'PASS', payload: null },
  ];

  it('shows spinner on matching button when pendingActionType is set', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: TWO_ACTIONS,
        pending: true,
        pendingActionType: 'PASS',
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons[0].find('.spinner').exists()).toBe(false);
    expect(buttons[1].find('.spinner').exists()).toBe(true);
  });

  it('falls back to first button spinner when pendingActionType is null', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: TWO_ACTIONS,
        pending: true,
        pendingActionType: null,
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons[0].find('.spinner').exists()).toBe(true);
    expect(buttons[1].find('.spinner').exists()).toBe(false);
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

  it('sets aria-disabled=true on all buttons when pending (#505)', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [
          { type: 'END_PHASE', payload: null },
          { type: 'PASS', payload: null },
        ],
        pending: true,
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    buttons.forEach((btn) => {
      expect(btn.attributes('aria-disabled')).toBe('true');
      expect(btn.attributes('disabled')).toBeUndefined();
    });
  });

  it('does not set aria-disabled when not pending (#505)', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
        pending: false,
      },
    });
    const btn = wrapper.find('button');
    expect(btn.attributes('aria-disabled')).toBe('false');
    expect(btn.attributes('disabled')).toBeUndefined();
  });

  it('does not emit submit-action when button is clicked while pending (#505)', async () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
        pending: true,
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('submit-action')).toBeFalsy();
  });

  it('emits submit-action when button is clicked while not pending (contrast for guard test)', async () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'END_PHASE', payload: null }],
        pending: false,
      },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('submit-action')).toBeTruthy();
    expect(wrapper.emitted('submit-action')[0]).toEqual([{ type: 'END_PHASE', payload: null }]);
  });

  it('shows spinner only on first button when pending is true and pendingActionType is null', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [
          { type: 'END_PHASE', payload: null },
          { type: 'PASS', payload: null },
        ],
        pending: true,
        pendingActionType: null,
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons[0].find('.spinner').exists()).toBe(true);
    expect(buttons[1].find('.spinner').exists()).toBe(false);
  });

  it('renders title-cased label for multi-segment action type', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        validActions: [{ type: 'SET_MORALE', payload: null }],
      },
    });
    expect(wrapper.text()).toContain('Set Morale');
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

  it('renders no buttons when waiting even with non-empty validActions', () => {
    const wrapper = mount(ActionPanel, {
      props: {
        ...DEFAULT_PROPS,
        activePlayer: 'confederate',
        localPlayerSide: 'union',
        validActions: [{ type: 'END_PHASE', payload: null }],
      },
    });
    expect(wrapper.findAll('button')).toHaveLength(0);
  });
});

describe('ActionPanel — null-state summary', () => {
  it('does not render summary line when turn and phase are null', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, turn: null, phase: null, step: null },
    });
    expect(wrapper.find('.summary').exists()).toBe(false);
  });

  it('does not render summary line when phase is null even if turn is set', () => {
    const wrapper = mount(ActionPanel, {
      props: { ...DEFAULT_PROPS, turn: 1, phase: null, step: null },
    });
    expect(wrapper.find('.summary').exists()).toBe(false);
  });
});
