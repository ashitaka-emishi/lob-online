import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ElevationToolPanel from './ElevationToolPanel.vue';

describe('ElevationToolPanel', () => {
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

  it('clicking Clear all and confirming emits clear-all-elevations', async () => {
    const wrapper = mount(ElevationToolPanel);
    const clearBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear all');
    await clearBtn.trigger('click');
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear');
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('clear-all-elevations')).toBeTruthy();
  });

  it('does not render click/paint mode toggle buttons', () => {
    const wrapper = mount(ElevationToolPanel);
    expect(wrapper.findAll('.mode-btn').length).toBe(0);
  });

  it('does not render raise-all or lower-all buttons', () => {
    const wrapper = mount(ElevationToolPanel);
    const text = wrapper.text();
    expect(text).not.toContain('Raise all');
    expect(text).not.toContain('Lower all');
  });

  // --- overlay-config ownership ---

  it('emits overlay-config on mount', () => {
    const wrapper = mount(ElevationToolPanel);
    expect(wrapper.emitted('overlay-config')).toBeTruthy();
  });

  it('emitted overlay-config has hexLabel with labelFn', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 10 } });
    const configs = wrapper.emitted('overlay-config');
    const cfg = configs[configs.length - 1][0];
    expect(cfg.hexLabel).toBeTruthy();
    expect(cfg.hexLabel.alwaysOn).toBe(true);
    expect(typeof cfg.hexLabel.labelFn).toBe('function');
    expect(cfg.hexLabel.labelFn({ elevation: 5 })).toBe('5');
  });

  it('emitted overlay-config has hexFill with fillFn', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 10 } });
    const configs = wrapper.emitted('overlay-config');
    const cfg = configs[configs.length - 1][0];
    expect(cfg.hexFill).toBeTruthy();
    expect(cfg.hexFill.toggleLabel).toBe('Elevation tint');
    expect(typeof cfg.hexFill.fillFn).toBe('function');
  });

  it('fillFn returns a css color for valid level', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 10 } });
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    const color = cfg.hexFill.fillFn({ elevation: 3 });
    expect(color).toMatch(/^hsl\(/);
  });

  it('renders "Elevation tint" toggle checkbox via BaseToolPanel', () => {
    const wrapper = mount(ElevationToolPanel);
    expect(wrapper.text()).toContain('Elevation tint');
  });

  // --- elevation slider (#137) ---

  it('renders a range slider input', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 22 } });
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it('slider min is 0 and max is elevationLevels − 1', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 10 } });
    const slider = wrapper.find('input[type="range"]');
    expect(slider.attributes('min')).toBe('0');
    expect(slider.attributes('max')).toBe('9');
  });

  it('slider reflects targetElevation prop (default 1)', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 22 } });
    const slider = wrapper.find('input[type="range"]');
    expect(Number(slider.element.value)).toBe(1);
  });

  it('slider reflects targetElevation prop when set to non-default', () => {
    const wrapper = mount(ElevationToolPanel, {
      props: { elevationLevels: 22, targetElevation: 7 },
    });
    const slider = wrapper.find('input[type="range"]');
    expect(Number(slider.element.value)).toBe(7);
  });

  it('changing slider emits target-elevation-change with numeric value', async () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 22 } });
    const slider = wrapper.find('input[type="range"]');
    await slider.setValue('5');
    expect(wrapper.emitted('target-elevation-change')).toBeTruthy();
    expect(wrapper.emitted('target-elevation-change')[0][0]).toBe(5);
  });

  it('displays the current target elevation value next to slider', () => {
    const wrapper = mount(ElevationToolPanel, { props: { elevationLevels: 22 } });
    expect(wrapper.text()).toContain('1'); // default targetElevation
  });
});
