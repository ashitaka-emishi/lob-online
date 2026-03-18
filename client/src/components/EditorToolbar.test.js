import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorToolbar from './EditorToolbar.vue';

const BASE_LAYERS = {
  grid: true,
  terrain: true,
  elevation: false,
  wedges: false,
  edges: true,
  slopeArrows: false,
};

describe('EditorToolbar', () => {
  it('renders layer checkboxes for all 6 layers', () => {
    const wrapper = mount(EditorToolbar, {
      props: { layers: BASE_LAYERS },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(6);
  });

  it('layer checkbox change emits layer-change with updated value', async () => {
    const wrapper = mount(EditorToolbar, {
      props: { layers: BASE_LAYERS },
    });
    // elevation is the 3rd checkbox (index 2)
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const elevCheckbox = checkboxes[2];
    await elevCheckbox.setValue(true);
    await elevCheckbox.trigger('change');
    const emitted = wrapper.emitted('layer-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].elevation).toBe(true);
  });

  it('renders no mode buttons (mode switching moved to accordion panels)', () => {
    const wrapper = mount(EditorToolbar, {
      props: { layers: BASE_LAYERS },
    });
    expect(wrapper.find('.mode-btn').exists()).toBe(false);
  });

  it('Export button is not rendered in toolbar (moved to header)', () => {
    const wrapper = mount(EditorToolbar, {
      props: { layers: BASE_LAYERS },
    });
    expect(wrapper.find('.export-btn').exists()).toBe(false);
  });

  it('checked state of layer checkboxes matches layers prop', () => {
    const wrapper = mount(EditorToolbar, {
      props: { layers: { ...BASE_LAYERS, elevation: true } },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // elevation is index 2
    expect(checkboxes[2].element.checked).toBe(true);
    expect(checkboxes[0].element.checked).toBe(true); // grid
    expect(checkboxes[3].element.checked).toBe(false); // wedges
  });
});
