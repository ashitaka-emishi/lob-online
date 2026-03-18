import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ElevationToolPanel from './ElevationToolPanel.vue';

describe('ElevationToolPanel', () => {
  it('renders tool hint text', () => {
    const wrapper = mount(ElevationToolPanel);
    expect(wrapper.text()).toContain('Click hex');
  });

  it('shows "No hex selected" when selectedHex is null', () => {
    const wrapper = mount(ElevationToolPanel, { props: { selectedHex: null } });
    expect(wrapper.text()).toContain('No hex selected');
  });

  it('shows selected hex id and elevation when selectedHex provided', () => {
    const wrapper = mount(ElevationToolPanel, {
      props: { selectedHex: { hex: '03.05', elevation: 7 }, elevationLevels: 22 },
    });
    expect(wrapper.text()).toContain('03.05');
    expect(wrapper.text()).toContain('7');
    expect(wrapper.text()).toContain('21'); // max = elevationLevels - 1
  });

  it('clicking raise-all button emits raise-all', async () => {
    const wrapper = mount(ElevationToolPanel);
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Raise all'));
    await btn.trigger('click');
    expect(wrapper.emitted('raise-all')).toBeTruthy();
  });

  it('clicking lower-all button emits lower-all', async () => {
    const wrapper = mount(ElevationToolPanel);
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Lower all'));
    await btn.trigger('click');
    expect(wrapper.emitted('lower-all')).toBeTruthy();
  });

  it('clicking clear-all-elevations button emits clear-all-elevations', async () => {
    const wrapper = mount(ElevationToolPanel);
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Clear all'));
    await btn.trigger('click');
    expect(wrapper.emitted('clear-all-elevations')).toBeTruthy();
  });
});
