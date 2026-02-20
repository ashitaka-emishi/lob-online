import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CalibrationControls from './CalibrationControls.vue';

const BASE_CAL = {
  cols: 64,
  rows: 35,
  dx: 0,
  dy: 0,
  hexWidth: 35,
  hexHeight: 35,
  imageScale: 1,
  orientation: 'flat',
  strokeWidth: 0.5,
  evenColUp: false,
};

describe('CalibrationControls', () => {
  it('renders all inputs and buttons', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: BASE_CAL },
    });
    expect(wrapper.findAll('input[type="number"]').length).toBeGreaterThan(0);
    expect(wrapper.findAll('button').length).toBeGreaterThan(0);
  });

  it('clicking orientation button emits calibration-change with flipped orientation', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, orientation: 'pointy' } },
    });
    const btn = wrapper.findAll('button')[0];
    await btn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].orientation).toBe('flat');
  });

  it('clicking orientation button when flat emits pointy', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, orientation: 'flat' } },
    });
    const btn = wrapper.findAll('button')[0];
    await btn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted[0][0].orientation).toBe('pointy');
  });

  it('clicking evenColUp button emits calibration-change with flipped evenColUp', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, evenColUp: false } },
    });
    // Even Col ↑ is the 3rd button
    const btn = wrapper.findAll('button')[2];
    await btn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].evenColUp).toBe(true);
  });

  it('input event on dx field emits calibration-change with updated value', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: BASE_CAL },
    });
    // 3rd input is dx (cols, rows, dx ...)
    const inputs = wrapper.findAll('input[type="number"]');
    const dxInput = inputs[2];
    await dxInput.setValue('42');
    await dxInput.trigger('input');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].dx).toBe(42);
  });

  it('calibrationMode active class is applied to labels button', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: BASE_CAL, calibrationMode: true },
    });
    // 2nd button is toggle-calibration-mode
    const btn = wrapper.findAll('button')[1];
    expect(btn.classes()).toContain('active');
  });
});
