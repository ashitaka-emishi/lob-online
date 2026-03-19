import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RoadToolPanel from './RoadToolPanel.vue';

describe('RoadToolPanel', () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders trail, road, pike type buttons', () => {
    const wrapper = mount(RoadToolPanel);
    const text = wrapper.text();
    expect(text).toContain('trail');
    expect(text).toContain('road');
    expect(text).toContain('pike');
  });

  it('renders Paint and Bridge mode buttons', () => {
    const wrapper = mount(RoadToolPanel);
    const btns = wrapper.findAll('.mode-btn');
    const labels = btns.map((b) => b.text());
    expect(labels).toContain('Paint');
    expect(labels).toContain('Bridge');
  });

  it('Paint mode is active by default', () => {
    const wrapper = mount(RoadToolPanel);
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Paint');
    expect(paintBtn.classes()).toContain('active');
  });

  it('highlights the selected type button', () => {
    const wrapper = mount(RoadToolPanel, { props: { selectedType: 'road' } });
    const roadBtn = wrapper.findAll('.type-btn').find((b) => b.text().includes('road'));
    expect(roadBtn.classes()).toContain('active');
  });

  // ── Type selection ──────────────────────────────────────────────────────────

  it('emits type-change when a type button is clicked', async () => {
    const wrapper = mount(RoadToolPanel);
    const pikeBtn = wrapper.findAll('.type-btn').find((b) => b.text().includes('pike'));
    await pikeBtn.trigger('click');
    expect(wrapper.emitted('type-change')?.[0][0]).toBe('pike');
  });

  // ── Overlay config ──────────────────────────────────────────────────────────

  it('emits overlay-config on mount', () => {
    const wrapper = mount(RoadToolPanel);
    expect(wrapper.emitted('overlay-config')).toBeTruthy();
  });

  it('emitted overlay-config has edgeLine with through-hex style', () => {
    const wrapper = mount(RoadToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.edgeLine).toBeTruthy();
    expect(cfg.edgeLine.style).toBe('through-hex');
    expect(cfg.edgeLine.featureGroups.length).toBe(3); // trail, road, pike
  });

  it('emitted overlay-config has faint grid', () => {
    const wrapper = mount(RoadToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.grid).toBeTruthy();
    expect(cfg.grid.weight).toBe('faint');
  });

  // ── Edge paint events ───────────────────────────────────────────────────────

  it('handleEdgeClick emits edge-paint with selectedType in paint mode', () => {
    const wrapper = mount(RoadToolPanel, { props: { selectedType: 'road' } });
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 1,
      type: 'road',
    });
  });

  it('handleEdgeRightClick emits edge-clear with selectedType in paint mode', () => {
    const wrapper = mount(RoadToolPanel, { props: { selectedType: 'trail' } });
    wrapper.vm.handleEdgeRightClick('03.02', 0);
    expect(wrapper.emitted('edge-clear')?.[0][0]).toEqual({
      hexId: '03.02',
      faceIndex: 0,
      type: 'trail',
    });
  });

  // ── Clear all ───────────────────────────────────────────────────────────────

  it('Clear all button emits edge-clear-all after confirmation', async () => {
    const wrapper = mount(RoadToolPanel);
    const clearBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear all');
    await clearBtn.trigger('click');
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear');
    await confirmBtn.trigger('click');
    const emitted = wrapper.emitted('edge-clear-all');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual(expect.arrayContaining(['trail', 'road', 'pike']));
  });

  // ── Bridge mode ─────────────────────────────────────────────────────────────

  it('switches to Bridge mode when Bridge button is clicked', async () => {
    const wrapper = mount(RoadToolPanel);
    const bridgeBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Bridge');
    await bridgeBtn.trigger('click');
    expect(wrapper.text()).toContain('place a bridge');
  });

  it('bridge placement blocked without road on edge — no bridge-place emitted', () => {
    const wrapper = mount(RoadToolPanel, {
      props: { getEdgeFeatures: () => [] }, // no road features
    });
    // Switch to bridge mode
    wrapper.vm.$el; // ensure mount
    // Directly trigger bridge mode and click
    const vm = wrapper.vm;
    // Switch internal mode to bridge by triggering the button
    const bridgeBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Bridge');
    bridgeBtn.trigger('click');
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('bridge-place')).toBeFalsy();
  });

  it('bridge-place emitted when road exists on edge', async () => {
    const wrapper = mount(RoadToolPanel, {
      props: { getEdgeFeatures: () => ['road'] },
    });
    const bridgeBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Bridge');
    await bridgeBtn.trigger('click');
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('bridge-place')?.[0][0]).toEqual({ hexId: '05.03', faceIndex: 1 });
  });

  it('bridge-remove emitted on right-click in bridge mode', async () => {
    const wrapper = mount(RoadToolPanel, {
      props: { getEdgeFeatures: () => ['road'] },
    });
    const bridgeBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Bridge');
    await bridgeBtn.trigger('click');
    wrapper.vm.handleEdgeRightClick('05.03', 1);
    expect(wrapper.emitted('bridge-remove')?.[0][0]).toEqual({ hexId: '05.03', faceIndex: 1 });
  });
});
