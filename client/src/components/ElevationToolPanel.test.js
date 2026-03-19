import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ElevationToolPanel from './ElevationToolPanel.vue';

describe('ElevationToolPanel', () => {
  it('renders tool hint text in click mode', () => {
    const wrapper = mount(ElevationToolPanel, { props: { paintMode: 'click' } });
    expect(wrapper.text()).toContain('Click');
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

  it('clicking Clear all and confirming emits clear-all-elevations', async () => {
    const wrapper = mount(ElevationToolPanel);
    // BaseToolPanel renders a "Clear all" button that shows a confirm dialog first
    const clearBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear all');
    await clearBtn.trigger('click');
    // Confirm dialog should now be visible; click the "Clear" confirm button
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear');
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('clear-all-elevations')).toBeTruthy();
  });

  // --- click/paint mode toggle (#115) ---

  it('renders a Click and a Paint mode toggle button', () => {
    const wrapper = mount(ElevationToolPanel);
    const btns = wrapper.findAll('.mode-btn');
    expect(btns.length).toBe(2);
    const labels = btns.map((b) => b.text());
    expect(labels).toContain('Click');
    expect(labels).toContain('Paint');
  });

  it('Click button has active class when paintMode is click', () => {
    const wrapper = mount(ElevationToolPanel, { props: { paintMode: 'click' } });
    const clickBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Click');
    expect(clickBtn.classes()).toContain('active');
  });

  it('Paint button has active class when paintMode is paint', () => {
    const wrapper = mount(ElevationToolPanel, { props: { paintMode: 'paint' } });
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Paint');
    expect(paintBtn.classes()).toContain('active');
  });

  it('clicking Click button emits paint-mode-change with click', async () => {
    const wrapper = mount(ElevationToolPanel, { props: { paintMode: 'paint' } });
    const clickBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Click');
    await clickBtn.trigger('click');
    expect(wrapper.emitted('paint-mode-change')?.[0][0]).toBe('click');
  });

  it('clicking Paint button emits paint-mode-change with paint', async () => {
    const wrapper = mount(ElevationToolPanel, { props: { paintMode: 'click' } });
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Paint');
    await paintBtn.trigger('click');
    expect(wrapper.emitted('paint-mode-change')?.[0][0]).toBe('paint');
  });

  it('hint text changes based on paintMode', () => {
    const clickWrapper = mount(ElevationToolPanel, { props: { paintMode: 'click' } });
    const paintWrapper = mount(ElevationToolPanel, { props: { paintMode: 'paint' } });
    expect(clickWrapper.text()).not.toEqual(paintWrapper.text());
  });
});
