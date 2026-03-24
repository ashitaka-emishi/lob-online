import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContourToolPanel from './ContourToolPanel.vue';

describe('ContourToolPanel', () => {
  it('renders all four contour type buttons', () => {
    const wrapper = mount(ContourToolPanel);
    const text = wrapper.text();
    expect(text).toContain('elevation');
    expect(text).toContain('slope');
    expect(text).toContain('extremeSlope');
    expect(text).toContain('verticalSlope');
  });

  it('highlights the selected type button', () => {
    const wrapper = mount(ContourToolPanel, { props: { selectedType: 'slope' } });
    const btn = wrapper.findAll('.type-btn').find((b) => b.text().includes('slope'));
    expect(btn.classes()).toContain('active');
  });

  it('emits type-change when a type button is clicked', async () => {
    const wrapper = mount(ContourToolPanel);
    const btn = wrapper.findAll('.type-btn').find((b) => b.text().includes('extremeSlope'));
    await btn.trigger('click');
    expect(wrapper.emitted('type-change')?.[0][0]).toBe('extremeSlope');
  });

  // ── Overlay config ──────────────────────────────────────────────────────────

  it('emits overlay-config on mount', () => {
    const wrapper = mount(ContourToolPanel);
    expect(wrapper.emitted('overlay-config')).toBeTruthy();
  });

  it('emitted overlay-config has edgeLine with along-edge style', () => {
    const wrapper = mount(ContourToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.edgeLine.style).toBe('along-edge');
    expect(cfg.edgeLine.featureGroups.length).toBe(4); // 4 contour types
  });

  it('emitted overlay-config has faint grid', () => {
    const wrapper = mount(ContourToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.grid.weight).toBe('faint');
  });

  it('emitted overlay-config has hexFill with Elevation info toggleLabel', () => {
    const wrapper = mount(ContourToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.hexFill.toggleLabel).toBe('Elevation info');
    expect(cfg.hexFill.alwaysOn).toBe(false);
  });

  it('hexFill fillFn returns null when elevation info is off', () => {
    const wrapper = mount(ContourToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    const result = cfg.hexFill.fillFn({ elevation: 5 });
    expect(result).toBeNull();
  });

  it('hexFill fillFn returns hsl color when elevation info is on', async () => {
    const wrapper = mount(ContourToolPanel, { props: { elevationLevels: 22 } });
    // Simulate turning elevation info on via overlay-toggle
    wrapper.vm.onOverlayToggle('hexFill');
    await wrapper.vm.$nextTick();
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    const result = cfg.hexFill.fillFn({ elevation: 5 });
    expect(result).toMatch(/^hsl\(/);
  });

  it('hexLabel not present in config when elevation info is off', () => {
    const wrapper = mount(ContourToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.hexLabel).toBeUndefined();
  });

  it('hexLabel added to config when elevation info is on', async () => {
    const wrapper = mount(ContourToolPanel);
    wrapper.vm.onOverlayToggle('hexFill');
    await wrapper.vm.$nextTick();
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.hexLabel).toBeTruthy();
    expect(cfg.hexLabel.labelFn({ elevation: 7 })).toBe('7');
  });

  // ── Edge paint events ───────────────────────────────────────────────────────

  it('handleEdgeClick emits edge-paint with selected type', () => {
    const wrapper = mount(ContourToolPanel, { props: { selectedType: 'slope' } });
    wrapper.vm.handleEdgeClick('05.03', 2);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 2,
      type: 'slope',
    });
  });

  it('handleEdgeRightClick emits edge-clear with selected type', () => {
    const wrapper = mount(ContourToolPanel, { props: { selectedType: 'verticalSlope' } });
    wrapper.vm.handleEdgeRightClick('03.02', 1);
    expect(wrapper.emitted('edge-clear')?.[0][0]).toEqual({
      hexId: '03.02',
      faceIndex: 1,
      type: 'verticalSlope',
    });
  });

  // ── Clear all ───────────────────────────────────────────────────────────────

  it('Clear all emits edge-clear-all with all contour types after confirmation', async () => {
    const wrapper = mount(ContourToolPanel);
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Clear all')
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Clear')
      .trigger('click');
    const emitted = wrapper.emitted('edge-clear-all');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual(
      expect.arrayContaining(['elevation', 'slope', 'extremeSlope', 'verticalSlope'])
    );
  });

  it('does not render auto-detect button', () => {
    const wrapper = mount(ContourToolPanel);
    expect(wrapper.find('.auto-detect-btn').exists()).toBe(false);
  });
});
