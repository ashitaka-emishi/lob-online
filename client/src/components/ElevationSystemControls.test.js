import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ElevationSystemControls from './ElevationSystemControls.vue';

const ELEV_SYS = { baseElevation: 500, elevationLevels: 22 };

describe('ElevationSystemControls', () => {
  it('renders baseElevation value from prop', () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: ELEV_SYS, locked: false },
    });
    const input = wrapper.find('[data-testid="base-elevation-input"]');
    expect(input.element.value).toBe('500');
  });

  it('renders elevationLevels value from prop', () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: ELEV_SYS, locked: false },
    });
    const input = wrapper.find('[data-testid="elevation-levels-input"]');
    expect(input.element.value).toBe('22');
  });

  it('emits elevation-system-change with updated baseElevation on input', async () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: ELEV_SYS, locked: false },
    });
    const input = wrapper.find('[data-testid="base-elevation-input"]');
    await input.setValue('600');
    await input.trigger('input');
    const emitted = wrapper.emitted('elevation-system-change');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].baseElevation).toBe(600);
    expect(emitted[emitted.length - 1][0].elevationLevels).toBe(22);
  });

  it('emits elevation-system-change with updated elevationLevels on input', async () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: ELEV_SYS, locked: false },
    });
    const input = wrapper.find('[data-testid="elevation-levels-input"]');
    await input.setValue('30');
    await input.trigger('input');
    const emitted = wrapper.emitted('elevation-system-change');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].elevationLevels).toBe(30);
    expect(emitted[emitted.length - 1][0].baseElevation).toBe(500);
  });

  it('inputs are disabled when locked is true', () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: ELEV_SYS, locked: true },
    });
    expect(wrapper.find('[data-testid="base-elevation-input"]').element.disabled).toBe(true);
    expect(wrapper.find('[data-testid="elevation-levels-input"]').element.disabled).toBe(true);
  });

  it('inputs are disabled when elevationSystem is null', () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: null, locked: false },
    });
    expect(wrapper.find('[data-testid="base-elevation-input"]').element.disabled).toBe(true);
    expect(wrapper.find('[data-testid="elevation-levels-input"]').element.disabled).toBe(true);
  });

  it('inputs show empty string when elevationSystem is null', () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: null, locked: false },
    });
    expect(wrapper.find('[data-testid="base-elevation-input"]').element.value).toBe('');
    expect(wrapper.find('[data-testid="elevation-levels-input"]').element.value).toBe('');
  });

  it('does not emit when elevationSystem is null', async () => {
    const wrapper = mount(ElevationSystemControls, {
      props: { elevationSystem: null, locked: false },
    });
    const input = wrapper.find('[data-testid="base-elevation-input"]');
    await input.trigger('input');
    expect(wrapper.emitted('elevation-system-change')).toBeFalsy();
  });
});
