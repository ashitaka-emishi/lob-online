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
    // Button order: [0]=Lock, [1]=Orientation, [2]=Labels, [3]=EvenColUp
    const btn = wrapper.findAll('button')[1];
    await btn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].orientation).toBe('flat');
  });

  it('clicking orientation button when flat emits pointy', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, orientation: 'flat' } },
    });
    const btn = wrapper.findAll('button')[1];
    await btn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted[0][0].orientation).toBe('pointy');
  });

  it('clicking evenColUp button emits calibration-change with flipped evenColUp', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, evenColUp: false } },
    });
    // Even Col ↑ is the 4th button (after Lock, Orientation, Labels)
    const btn = wrapper.findAll('button')[3];
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
    // 2nd button is toggle-calibration-mode (after lock button)
    const btn = wrapper.findAll('button')[2];
    expect(btn.classes()).toContain('active');
  });

  it('renders rotation input', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: BASE_CAL },
    });
    const inputs = wrapper.findAll('input[type="number"]');
    // rotation is 9th input (after cols, rows, dx, dy, hexWidth, hexHeight, imageScale, strokeWidth)
    expect(inputs.length).toBeGreaterThanOrEqual(9);
  });

  it('rotation input emits calibration-change with updated rotation', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, rotation: 0 } },
    });
    const inputs = wrapper.findAll('input[type="number"]');
    const rotationInput = inputs[8];
    await rotationInput.setValue('5');
    await rotationInput.trigger('input');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].rotation).toBe(5);
  });

  it('lock button renders', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: BASE_CAL },
    });
    // Lock is first button
    const lockBtn = wrapper.findAll('button')[0];
    expect(lockBtn.exists()).toBe(true);
    expect(lockBtn.text()).toContain('Lock');
  });

  it('lock toggle emits locked: true when currently unlocked', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, locked: false } },
    });
    const lockBtn = wrapper.findAll('button')[0];
    await lockBtn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].locked).toBe(true);
  });

  it('lock toggle emits locked: false when currently locked', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, locked: true } },
    });
    const lockBtn = wrapper.findAll('button')[0];
    await lockBtn.trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].locked).toBe(false);
  });

  it('numeric inputs are disabled when calibration.locked is true', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, locked: true } },
    });
    const inputs = wrapper.findAll('input[type="number"]');
    for (const input of inputs) {
      expect(input.element.disabled).toBe(true);
    }
  });

  it('lock button is not disabled when calibration.locked is true', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, locked: true } },
    });
    const lockBtn = wrapper.findAll('button')[0];
    expect(lockBtn.element.disabled).toBe(false);
  });

  it('renders 12-position north picker circles', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, northOffset: 0 } },
    });
    const circles = wrapper.findAll('circle[data-north-offset]');
    expect(circles).toHaveLength(12);
  });

  it('clicking north picker circle emits calibration-change with correct northOffset', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, northOffset: 0 } },
    });
    const circles = wrapper.findAll('circle[data-north-offset]');
    await circles[3].trigger('click'); // position 3
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].northOffset).toBe(3);
  });

  it('selected north picker circle has yellow fill', () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, northOffset: 3 } },
    });
    const circles = wrapper.findAll('circle[data-north-offset]');
    expect(circles[3].attributes('fill')).toBe('#ffdd00');
    expect(circles[0].attributes('fill')).toBe('#444');
  });

  it('north picker does not emit when locked', async () => {
    const wrapper = mount(CalibrationControls, {
      props: { calibration: { ...BASE_CAL, northOffset: 0, locked: true } },
    });
    const circles = wrapper.findAll('circle[data-north-offset]');
    await circles[3].trigger('click');
    const emitted = wrapper.emitted('calibration-change');
    expect(emitted).toBeFalsy();
  });

  describe('Elevation System section', () => {
    const ELEV_SYS = { baseElevation: 500, elevationLevels: 22 };

    it('baseElevation input shows correct value from prop', () => {
      const wrapper = mount(CalibrationControls, {
        props: { calibration: BASE_CAL, elevationSystem: ELEV_SYS },
      });
      const input = wrapper.find('[data-testid="base-elevation-input"]');
      expect(input.element.value).toBe('500');
    });

    it('elevationLevels input shows correct value from prop', () => {
      const wrapper = mount(CalibrationControls, {
        props: { calibration: BASE_CAL, elevationSystem: ELEV_SYS },
      });
      const input = wrapper.find('[data-testid="elevation-levels-input"]');
      expect(input.element.value).toBe('22');
    });

    it('changing baseElevation emits elevation-system-change with updated value', async () => {
      const wrapper = mount(CalibrationControls, {
        props: { calibration: BASE_CAL, elevationSystem: ELEV_SYS },
      });
      const input = wrapper.find('[data-testid="base-elevation-input"]');
      await input.setValue('600');
      await input.trigger('input');
      const emitted = wrapper.emitted('elevation-system-change');
      expect(emitted).toBeTruthy();
      expect(emitted[emitted.length - 1][0].baseElevation).toBe(600);
      expect(emitted[emitted.length - 1][0].elevationLevels).toBe(22);
    });

    it('changing elevationLevels emits elevation-system-change with updated value', async () => {
      const wrapper = mount(CalibrationControls, {
        props: { calibration: BASE_CAL, elevationSystem: ELEV_SYS },
      });
      const input = wrapper.find('[data-testid="elevation-levels-input"]');
      await input.setValue('30');
      await input.trigger('input');
      const emitted = wrapper.emitted('elevation-system-change');
      expect(emitted).toBeTruthy();
      expect(emitted[emitted.length - 1][0].elevationLevels).toBe(30);
      expect(emitted[emitted.length - 1][0].baseElevation).toBe(500);
    });

    it('elevation inputs are disabled when elevationSystem prop is absent', () => {
      const wrapper = mount(CalibrationControls, {
        props: { calibration: BASE_CAL },
      });
      expect(wrapper.find('[data-testid="base-elevation-input"]').element.disabled).toBe(true);
      expect(wrapper.find('[data-testid="elevation-levels-input"]').element.disabled).toBe(true);
    });

    it('elevation inputs are disabled when calibration is locked', () => {
      const wrapper = mount(CalibrationControls, {
        props: { calibration: { ...BASE_CAL, locked: true }, elevationSystem: ELEV_SYS },
      });
      expect(wrapper.find('[data-testid="base-elevation-input"]').element.disabled).toBe(true);
      expect(wrapper.find('[data-testid="elevation-levels-input"]').element.disabled).toBe(true);
    });
  });
});
