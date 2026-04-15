import { describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import TableTestView from './TableTestView.vue';

// ─── Stub all 11 panel components ─────────────────────────────────────────────

// defineAsyncComponent resolves the module namespace before accessing .default.
// Vitest's strict mock proxy throws when Vue/VTU access undeclared properties on the
// namespace (__isTeleport, __isKeepAlive, name, __esModule). Declare them all.
vi.mock('../../components/tools/table-test/CombatPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: { name: 'CombatPanel', template: '<div class="stub-combat">CombatPanel</div>' },
}));
vi.mock('../../components/tools/table-test/OpeningVolleyPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'OpeningVolleyPanel',
    template: '<div class="stub-opening-volley">OpeningVolleyPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/MoralePanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: { name: 'MoralePanel', template: '<div class="stub-morale">MoralePanel</div>' },
}));
vi.mock('../../components/tools/table-test/MoraleTransitionPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'MoraleTransitionPanel',
    template: '<div class="stub-morale-transition">MoraleTransitionPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/ClosingRollPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'ClosingRollPanel',
    template: '<div class="stub-closing-roll">ClosingRollPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/LeaderLossPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'LeaderLossPanel',
    template: '<div class="stub-leader-loss">LeaderLossPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/CommandRollPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'CommandRollPanel',
    template: '<div class="stub-command-roll">CommandRollPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/OrderDeliveryPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'OrderDeliveryPanel',
    template: '<div class="stub-order-delivery">OrderDeliveryPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/FlukeStoppagePanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'FlukeStoppagePanel',
    template: '<div class="stub-fluke-stoppage">FlukeStoppagePanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/AttackRecoveryPanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: {
    name: 'AttackRecoveryPanel',
    template: '<div class="stub-attack-recovery">AttackRecoveryPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/ZeroRulePanel.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  __isKeepAlive: false,
  name: undefined,
  default: { name: 'ZeroRulePanel', template: '<div class="stub-zero-rule">ZeroRulePanel</div>' },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TableTestView', () => {
  it('renders without error', () => {
    const wrapper = mount(TableTestView);
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it('panel selector shows all 11 panel names', () => {
    const wrapper = mount(TableTestView);
    const text = wrapper.text();
    expect(text).toMatch(/combat/i);
    expect(text).toMatch(/opening volley/i);
    expect(text).toMatch(/morale/i);
    expect(text).toMatch(/morale transition/i);
    expect(text).toMatch(/closing roll/i);
    expect(text).toMatch(/leader loss/i);
    expect(text).toMatch(/command roll/i);
    expect(text).toMatch(/order delivery/i);
    expect(text).toMatch(/fluke stoppage/i);
    expect(text).toMatch(/attack recovery/i);
    expect(text).toMatch(/zero rule/i);
    wrapper.unmount();
  });

  it('Combat tab is active by default', () => {
    // TableTestView's responsibility is tab state management; panel rendering
    // is tested in each panel's own test file. Check aria-selected, not panel DOM.
    const wrapper = mount(TableTestView);
    const tabs = wrapper.findAll('[role="tab"]');
    const combatTab = tabs.find((t) => t.text() === 'Combat');
    expect(combatTab.attributes('aria-selected')).toBe('true');
    expect(combatTab.classes()).toContain('active');
    wrapper.unmount();
  });

  it('switching tab updates active state', async () => {
    const wrapper = mount(TableTestView);

    const tabs = wrapper.findAll('[role="tab"]');
    const moraleTab = tabs.find((t) => t.text() === 'Morale');
    const combatTab = tabs.find((t) => t.text() === 'Combat');
    await moraleTab.trigger('click');

    expect(moraleTab.attributes('aria-selected')).toBe('true');
    expect(moraleTab.classes()).toContain('active');
    expect(combatTab.attributes('aria-selected')).toBe('false');
    expect(combatTab.classes()).not.toContain('active');
    wrapper.unmount();
  });

  it('active tab gets active class', async () => {
    const wrapper = mount(TableTestView);

    const tabs = wrapper.findAll('[role="tab"]');
    const zerTab = tabs.find((t) => t.text() === 'Zero Rule');
    await zerTab.trigger('click');

    expect(zerTab.classes()).toContain('active');
    wrapper.unmount();
  });
});
