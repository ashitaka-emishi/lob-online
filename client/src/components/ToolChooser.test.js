import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ToolChooser from './ToolChooser.vue';

const ITEMS = [
  { value: 'trail', label: 'Trail' },
  { value: 'road', label: 'Road', color: '#8B6914' },
  { value: 'pike', label: 'Pike', color: '#ffffff' },
];

describe('ToolChooser', () => {
  it('renders one button per item', () => {
    const wrapper = mount(ToolChooser, { props: { items: ITEMS, modelValue: 'trail' } });
    expect(wrapper.findAll('button')).toHaveLength(3);
  });

  it('renders the label text for each item', () => {
    const wrapper = mount(ToolChooser, { props: { items: ITEMS, modelValue: 'trail' } });
    expect(wrapper.text()).toContain('Trail');
    expect(wrapper.text()).toContain('Road');
    expect(wrapper.text()).toContain('Pike');
  });

  it('active button has the "active" class', () => {
    const wrapper = mount(ToolChooser, { props: { items: ITEMS, modelValue: 'road' } });
    const buttons = wrapper.findAll('button');
    expect(buttons[1].classes()).toContain('active');
    expect(buttons[0].classes()).not.toContain('active');
    expect(buttons[2].classes()).not.toContain('active');
  });

  it('clicking a button emits update:modelValue with the item value', async () => {
    const wrapper = mount(ToolChooser, { props: { items: ITEMS, modelValue: 'trail' } });
    await wrapper.findAll('button')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['pike']);
  });

  it('renders a color swatch when item has a color', () => {
    const wrapper = mount(ToolChooser, { props: { items: ITEMS, modelValue: 'trail' } });
    const swatches = wrapper.findAll('.color-swatch');
    // road and pike have colors; trail does not
    expect(swatches).toHaveLength(2);
  });

  it('renders no swatch for items without a color', () => {
    const items = [{ value: 'x', label: 'X' }];
    const wrapper = mount(ToolChooser, { props: { items, modelValue: 'x' } });
    expect(wrapper.findAll('.color-swatch')).toHaveLength(0);
  });

  it('renders an empty list when items is empty', () => {
    const wrapper = mount(ToolChooser, { props: { items: [], modelValue: null } });
    expect(wrapper.findAll('button')).toHaveLength(0);
  });
});
