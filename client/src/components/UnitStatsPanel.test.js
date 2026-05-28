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
  weapon: 'R',
  counterFile: 'C1.png',
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

describe('UnitStatsPanel — counter image (#408)', () => {
  it('renders a counter image when counterFile is set', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    const img = wrapper.find('img.counter-image');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('/counters/C1.png');
  });

  it('does not render a counter image when counterFile is null', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, counterFile: null } },
    });
    expect(wrapper.find('img.counter-image').exists()).toBe(false);
  });

  it('does not render a counter image when unit is null', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: null } });
    expect(wrapper.find('img.counter-image').exists()).toBe(false);
  });
});

describe('UnitStatsPanel — weapon type (#408)', () => {
  it('renders the weapon code in the stat list', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    expect(wrapper.text()).toContain('R');
  });

  it('does not render a weapon row when weapon is null', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, weapon: null } },
    });
    expect(wrapper.find('.stat-row--weapon').exists()).toBe(false);
  });
});

describe('UnitStatsPanel — faction header color (#408)', () => {
  it('applies confederate header color for CSA units', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT } });
    const title = wrapper.find('.panel-title');
    expect(title.attributes('class')).toContain('panel-title--confederate');
  });

  it('applies union header color for USA units', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, side: 'union' } },
    });
    const title = wrapper.find('.panel-title');
    expect(title.attributes('class')).toContain('panel-title--union');
  });

  it('applies no faction modifier when side is null', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: { ...FULL_UNIT, side: null } },
    });
    const title = wrapper.find('.panel-title');
    expect(title.attributes('class')).not.toContain('panel-title--confederate');
    expect(title.attributes('class')).not.toContain('panel-title--union');
  });
});

describe('UnitStatsPanel — multi-unit paging (#408)', () => {
  const UNIT_B = { ...FULL_UNIT, id: 'unit-b', name: '2nd Brigade', counterFile: 'C2.png' };

  it('does not show paging controls for a single unit', () => {
    const wrapper = mount(UnitStatsPanel, { props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT] } });
    expect(wrapper.find('.paging-controls').exists()).toBe(false);
  });

  it('shows paging controls when hexUnits has more than one entry', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    expect(wrapper.find('.paging-controls').exists()).toBe(true);
  });

  it('displays the first unit initially', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    expect(wrapper.text()).toContain('1st Brigade');
    expect(wrapper.text()).not.toContain('2nd Brigade');
  });

  it('advances to next unit when next button is clicked', async () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    await wrapper.find('[data-testid="paging-next"]').trigger('click');
    expect(wrapper.text()).toContain('2nd Brigade');
    expect(wrapper.text()).not.toContain('1st Brigade');
  });

  it('wraps from last to first unit on next', async () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    await wrapper.find('[data-testid="paging-next"]').trigger('click');
    await wrapper.find('[data-testid="paging-next"]').trigger('click');
    expect(wrapper.text()).toContain('1st Brigade');
  });

  it('goes to previous unit when prev button is clicked', async () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    await wrapper.find('[data-testid="paging-prev"]').trigger('click');
    expect(wrapper.text()).toContain('2nd Brigade');
  });

  it('resets to page 0 when hexUnits changes', async () => {
    const UNIT_C = { ...FULL_UNIT, id: 'unit-c', name: '3rd Brigade' };
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    await wrapper.find('[data-testid="paging-next"]').trigger('click');
    expect(wrapper.text()).toContain('2nd Brigade');
    await wrapper.setProps({ hexUnits: [UNIT_C] });
    expect(wrapper.text()).toContain('3rd Brigade');
  });

  it('shows a page indicator (e.g. 1 / 2)', () => {
    const wrapper = mount(UnitStatsPanel, {
      props: { unit: FULL_UNIT, hexUnits: [FULL_UNIT, UNIT_B] },
    });
    expect(wrapper.find('.paging-controls').text()).toMatch(/1\s*\/\s*2/);
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
