import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HexEditPanel from './HexEditPanel.vue';

describe('HexEditPanel', () => {
  it('shows "Click a hex to edit" when hex=null and selectedHexId=null', () => {
    const wrapper = mount(HexEditPanel, {
      props: { hex: null, selectedHexId: null },
    });
    expect(wrapper.text()).toContain('Click a hex to edit');
  });

  it('shows hex id header when selectedHexId is set but hex is null', () => {
    const wrapper = mount(HexEditPanel, {
      props: { hex: null, selectedHexId: '12.34' },
    });
    expect(wrapper.text()).toContain('12.34');
    expect(wrapper.find('select').exists()).toBe(false);
  });

  it('shows form fields when hex is provided', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '12.34', terrain: 'clear', hexsides: {} },
        selectedHexId: '12.34',
      },
    });
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.text()).toContain('12.34');
  });

  it('changing terrain select emits hex-update', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', hexsides: {} },
        selectedHexId: '05.10',
      },
    });
    const select = wrapper.find('select');
    await select.setValue('woods');
    await select.trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].terrain).toBe('woods');
  });

  it('checking vpHex checkbox emits hex-update with vpHex: true', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', hexsides: {}, vpHex: false },
        selectedHexId: '05.10',
      },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // vpHex is first checkbox
    const vpCheckbox = checkboxes[0];
    await vpCheckbox.setValue(true);
    await vpCheckbox.trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].vpHex).toBe(true);
  });

  it('hex with elevation renders elevation input', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', elevation: 2, hexsides: {} },
        selectedHexId: '05.10',
      },
    });
    const elevationInput = wrapper.find('input[type="number"]');
    expect(elevationInput.exists()).toBe(true);
  });

  it('hex with setupUnits shows unit list', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', hexsides: {}, setupUnits: ['1/A/1'] },
        selectedHexId: '05.10',
      },
    });
    expect(wrapper.text()).toContain('1/A/1');
  });
});
