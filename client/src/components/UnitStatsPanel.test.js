import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UnitStatsPanel from './UnitStatsPanel.vue';

const FULL_UNIT = {
  id: 'unit-a',
  name: '1st Brigade / Hood',
  side: 'confederate',
  sp: 8,
  moraleState: 'normal',
  orderType: 'attack',
};

describe('UnitStatsPanel — empty state', () => {
  it('renders a "no selection" message when unit prop is null', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: null } });
    expect(wrapper.text()).toMatch(/no unit selected/i);
  });

  it('does not render unit name when unit prop is null', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: null } });
    expect(wrapper.text()).not.toContain('1st Brigade');
  });
});

describe('UnitStatsPanel — unit display', () => {
  it('renders the unit name', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    expect(wrapper.text()).toContain('1st Brigade / Hood');
  });

  it('renders "Confederate" for confederate side', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    expect(wrapper.text()).toContain('Confederate');
  });

  it('renders "Union" for union side', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, side: 'union' } },
    });
    expect(wrapper.text()).toContain('Union');
  });

  it('renders strength points', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    expect(wrapper.text()).toContain('8');
  });

  it('renders morale state as a readable label', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    // moraleState 'normal' should display as "Normal" (or similar readable form)
    expect(wrapper.text()).toMatch(/normal/i);
  });

  it('renders "Blood Lust" for bloodLust morale state', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, moraleState: 'bloodLust' } },
    });
    expect(wrapper.text()).toMatch(/blood lust/i);
  });

  it('renders order type', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    expect(wrapper.text()).toMatch(/attack/i);
  });

  it('renders "None" when orderType is null', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, orderType: null } },
    });
    expect(wrapper.text()).toMatch(/none/i);
  });

  it('renders "Disorganized" for DG morale state', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, moraleState: 'DG' } },
    });
    expect(wrapper.text()).toMatch(/disorganized/i);
  });

  it('renders "Shaken" for shaken morale state', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, moraleState: 'shaken' } },
    });
    expect(wrapper.text()).toMatch(/shaken/i);
  });

  it('renders "Routed" for routed morale state', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, moraleState: 'routed' } },
    });
    expect(wrapper.text()).toMatch(/routed/i);
  });

  it('renders "Unknown" when side is null', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, side: null } },
    });
    expect(wrapper.text()).toContain('Unknown');
  });
});

describe('UnitStatsPanel — prop change reactivity', () => {
  it('updates when unit prop changes from null to a unit', async () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: null } });
    expect(wrapper.text()).toMatch(/no unit selected/i);
    await wrapper.setProps({ unit: FULL_UNIT });
    expect(wrapper.text()).toContain('1st Brigade / Hood');
  });

  it('updates when unit prop changes from one unit to another', async () => {
    const unitB = { ...FULL_UNIT, id: 'unit-b', name: '2nd Brigade / Evans' };
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    expect(wrapper.text()).toContain('1st Brigade');
    await wrapper.setProps({ unit: unitB });
    expect(wrapper.text()).toContain('2nd Brigade');
    expect(wrapper.text()).not.toContain('1st Brigade');
  });

  it('reverts to "no unit selected" when unit prop changes to null', async () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    await wrapper.setProps({ unit: null });
    expect(wrapper.text()).toMatch(/no unit selected/i);
  });
});
