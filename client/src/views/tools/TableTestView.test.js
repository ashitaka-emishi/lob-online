import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TableTestView from './TableTestView.vue';

// ─── Stub all 11 panel components ─────────────────────────────────────────────

vi.mock('../../components/tools/table-test/CombatPanel.vue', () => ({
  default: { name: 'CombatPanel', template: '<div class="stub-combat">CombatPanel</div>' },
}));
vi.mock('../../components/tools/table-test/OpeningVolleyPanel.vue', () => ({
  default: {
    name: 'OpeningVolleyPanel',
    template: '<div class="stub-opening-volley">OpeningVolleyPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/MoralePanel.vue', () => ({
  default: { name: 'MoralePanel', template: '<div class="stub-morale">MoralePanel</div>' },
}));
vi.mock('../../components/tools/table-test/MoraleTransitionPanel.vue', () => ({
  default: {
    name: 'MoraleTransitionPanel',
    template: '<div class="stub-morale-transition">MoraleTransitionPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/ClosingRollPanel.vue', () => ({
  default: {
    name: 'ClosingRollPanel',
    template: '<div class="stub-closing-roll">ClosingRollPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/LeaderLossPanel.vue', () => ({
  default: {
    name: 'LeaderLossPanel',
    template: '<div class="stub-leader-loss">LeaderLossPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/CommandRollPanel.vue', () => ({
  default: {
    name: 'CommandRollPanel',
    template: '<div class="stub-command-roll">CommandRollPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/OrderDeliveryPanel.vue', () => ({
  default: {
    name: 'OrderDeliveryPanel',
    template: '<div class="stub-order-delivery">OrderDeliveryPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/FlukeStoppagePanel.vue', () => ({
  default: {
    name: 'FlukeStoppagePanel',
    template: '<div class="stub-fluke-stoppage">FlukeStoppagePanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/AttackRecoveryPanel.vue', () => ({
  default: {
    name: 'AttackRecoveryPanel',
    template: '<div class="stub-attack-recovery">AttackRecoveryPanel</div>',
  },
}));
vi.mock('../../components/tools/table-test/ZeroRulePanel.vue', () => ({
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

  it('renders Combat panel by default', () => {
    const wrapper = mount(TableTestView);
    expect(wrapper.find('.stub-combat').exists()).toBe(true);
    wrapper.unmount();
  });

  it('switching tab renders the selected panel', async () => {
    const wrapper = mount(TableTestView);

    // Click the Morale tab
    const tabs = wrapper.findAll('[role="tab"]');
    const moraleTab = tabs.find((t) => t.text() === 'Morale');
    await moraleTab.trigger('click');

    expect(wrapper.find('.stub-morale').exists()).toBe(true);
    expect(wrapper.find('.stub-combat').exists()).toBe(false);
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
