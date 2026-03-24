import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RoadToolPanel from './RoadToolPanel.vue';

describe('RoadToolPanel', () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders trail, road, pike, and bridge type buttons', () => {
    const wrapper = mount(RoadToolPanel);
    const text = wrapper.text();
    expect(text).toContain('trail');
    expect(text).toContain('road');
    expect(text).toContain('pike');
    expect(text).toContain('bridge');
  });

  it('does not render Paint/Bridge mode toggle buttons', () => {
    const wrapper = mount(RoadToolPanel);
    expect(wrapper.findAll('.mode-btn').length).toBe(0);
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

  it('emits type-change with bridge when bridge button is clicked', async () => {
    const wrapper = mount(RoadToolPanel);
    const bridgeBtn = wrapper.findAll('.type-btn').find((b) => b.text().includes('bridge'));
    await bridgeBtn.trigger('click');
    expect(wrapper.emitted('type-change')?.[0][0]).toBe('bridge');
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

  it('handleEdgeClick emits edge-paint with selectedType', () => {
    const wrapper = mount(RoadToolPanel, { props: { selectedType: 'road' } });
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 1,
      type: 'road',
    });
  });

  it('handleEdgeRightClick emits hex-road-clear with hexId', () => {
    const wrapper = mount(RoadToolPanel, { props: { selectedType: 'trail' } });
    wrapper.vm.handleEdgeRightClick('03.02', 0);
    expect(wrapper.emitted('hex-road-clear')?.[0][0]).toEqual({ hexId: '03.02' });
  });

  // ── Bridge type validation ──────────────────────────────────────────────────

  it('bridge selection: edge-paint not emitted when edge has no road', () => {
    const wrapper = mount(RoadToolPanel, {
      props: { selectedType: 'bridge', getEdgeFeatures: () => [] },
    });
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('edge-paint')).toBeFalsy();
  });

  it('bridge selection: edge-paint emitted with type bridge when edge has road', () => {
    const wrapper = mount(RoadToolPanel, {
      props: { selectedType: 'bridge', getEdgeFeatures: () => ['road'] },
    });
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 1,
      type: 'bridge',
    });
  });

  it('bridge selection: validation error shown when edge has no road', async () => {
    const wrapper = mount(RoadToolPanel, {
      props: { selectedType: 'bridge', getEdgeFeatures: () => [] },
    });
    wrapper.vm.handleEdgeClick('05.03', 1);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.validation-error').exists()).toBe(true);
  });

  // ── Clear all ───────────────────────────────────────────────────────────────

  it('Clear all button emits edge-clear-all with road types including bridge', async () => {
    const wrapper = mount(RoadToolPanel);
    const clearBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear all');
    await clearBtn.trigger('click');
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear');
    await confirmBtn.trigger('click');
    const emitted = wrapper.emitted('edge-clear-all');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual(expect.arrayContaining(['trail', 'road', 'pike', 'bridge']));
  });
});
