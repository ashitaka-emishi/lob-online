import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TurnControl from './TurnControl.vue';

const SM_SCENARIO = {
  turnStructure: { firstTurn: '09:00', date: '1862-09-14' },
  lightingSchedule: [
    { startTurn: 1, condition: 'day', visibilityHexes: 999 },
    { startTurn: 39, condition: 'twilight', visibilityHexes: 10 },
    { startTurn: 45, condition: 'night', visibilityHexes: 2 },
  ],
};

function makeWrapper(props = {}) {
  return mount(TurnControl, {
    props: {
      turn: 5,
      phase: 'command',
      activeSide: 'union',
      scenario: SM_SCENARIO,
      ...props,
    },
  });
}

describe('TurnControl — renders nothing when turn or scenario is missing', () => {
  it('renders nothing when turn is null', () => {
    const wrapper = makeWrapper({ turn: null });
    expect(wrapper.find('[data-testid="turn-control"]').exists()).toBe(false);
  });

  it('renders nothing when scenario is null', () => {
    const wrapper = makeWrapper({ scenario: null });
    expect(wrapper.find('[data-testid="turn-control"]').exists()).toBe(false);
  });
});

describe('TurnControl — turn number and time', () => {
  it('renders the turn number', () => {
    const wrapper = makeWrapper({ turn: 5 });
    expect(wrapper.find('[data-testid="turn-number"]').text()).toBe('5');
  });

  it('renders the computed time for turn 1 (09:00)', () => {
    const wrapper = makeWrapper({ turn: 1 });
    expect(wrapper.find('[data-testid="turn-time"]').text()).toBe('09:00');
  });

  it('renders the computed time for turn 10 (11:15)', () => {
    const wrapper = makeWrapper({ turn: 10 });
    expect(wrapper.find('[data-testid="turn-time"]').text()).toBe('11:15');
  });

  it('renders turn 39 time (18:30 — first twilight)', () => {
    const wrapper = makeWrapper({ turn: 39 });
    expect(wrapper.find('[data-testid="turn-time"]').text()).toBe('18:30');
  });
});

describe('TurnControl — lighting condition', () => {
  it('renders condition "day" for turn 1', () => {
    const wrapper = makeWrapper({ turn: 1 });
    expect(wrapper.find('[data-testid="turn-condition"]').text()).toBe('day');
  });

  it('renders condition "twilight" for turn 39', () => {
    const wrapper = makeWrapper({ turn: 39 });
    expect(wrapper.find('[data-testid="turn-condition"]').text()).toBe('twilight');
  });

  it('renders condition "night" for turn 45', () => {
    const wrapper = makeWrapper({ turn: 45 });
    expect(wrapper.find('[data-testid="turn-condition"]').text()).toBe('night');
  });

  it('renders "Unlimited" visibility for daytime turns', () => {
    const wrapper = makeWrapper({ turn: 1 });
    expect(wrapper.find('[data-testid="turn-visibility"]').text()).toMatch(/unlimited/i);
  });

  it('renders numeric visibility for night turns with correct plural', () => {
    const wrapper = makeWrapper({ turn: 45 });
    expect(wrapper.find('[data-testid="turn-visibility"]').text()).toBe('2 hexes');
  });

  it('renders "1 hex" (singular) when visibility is 1', () => {
    const scenario = {
      turnStructure: { firstTurn: '09:00', date: '1862-09-14' },
      lightingSchedule: [{ startTurn: 1, condition: 'night', visibilityHexes: 1 }],
    };
    const wrapper = makeWrapper({ turn: 1, scenario });
    expect(wrapper.find('[data-testid="turn-visibility"]').text()).toBe('1 hex');
  });
});

describe('TurnControl — scenario date', () => {
  it('renders the scenario date', () => {
    const wrapper = makeWrapper({ turn: 1 });
    expect(wrapper.find('[data-testid="turn-date"]').text()).toContain('1862-09-14');
  });
});

describe('TurnControl — active side and phase', () => {
  it('renders the active side', () => {
    const wrapper = makeWrapper({ activeSide: 'confederate' });
    expect(wrapper.find('[data-testid="turn-active-side"]').text()).toBe('confederate');
  });

  it('renders the current phase', () => {
    const wrapper = makeWrapper({ phase: 'movement' });
    expect(wrapper.find('[data-testid="turn-phase"]').text()).toBe('movement');
  });

  it('does not render active-side element when activeSide is null', () => {
    const wrapper = makeWrapper({ activeSide: null });
    expect(wrapper.find('[data-testid="turn-active-side"]').exists()).toBe(false);
  });

  it('does not render phase element when phase is null', () => {
    const wrapper = makeWrapper({ phase: null });
    expect(wrapper.find('[data-testid="turn-phase"]').exists()).toBe(false);
  });
});

describe('TurnControl — reactive prop updates (L5)', () => {
  it('re-renders time and condition when turn prop changes', async () => {
    const wrapper = makeWrapper({ turn: 1 });
    expect(wrapper.find('[data-testid="turn-time"]').text()).toBe('09:00');
    expect(wrapper.find('[data-testid="turn-condition"]').text()).toBe('day');
    await wrapper.setProps({ turn: 45 });
    expect(wrapper.find('[data-testid="turn-time"]').text()).toBe('20:00');
    expect(wrapper.find('[data-testid="turn-condition"]').text()).toBe('night');
  });
});

describe('TurnControl — ARIA structure (H2)', () => {
  it('container has role=region and aria-label="Turn status"', () => {
    const wrapper = makeWrapper({ turn: 1 });
    const container = wrapper.find('[data-testid="turn-control"]');
    expect(container.attributes('role')).toBe('region');
    expect(container.attributes('aria-label')).toBe('Turn status');
  });
});
