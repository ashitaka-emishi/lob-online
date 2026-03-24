import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StreamWallToolPanel from './StreamWallToolPanel.vue';

describe('StreamWallToolPanel', () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders stream, stoneWall, and ford type buttons', () => {
    const wrapper = mount(StreamWallToolPanel);
    const text = wrapper.text();
    expect(text).toContain('stream');
    expect(text).toContain('stoneWall');
    expect(text).toContain('ford');
  });

  it('does not render Paint/Ford mode toggle buttons', () => {
    const wrapper = mount(StreamWallToolPanel);
    expect(wrapper.findAll('.mode-btn').length).toBe(0);
  });

  it('highlights the selected type button', () => {
    const wrapper = mount(StreamWallToolPanel, { props: { selectedType: 'stoneWall' } });
    const btn = wrapper.findAll('.type-btn').find((b) => b.text().includes('stoneWall'));
    expect(btn.classes()).toContain('active');
  });

  // ── Type selection ──────────────────────────────────────────────────────────

  it('emits type-change when a type button is clicked', async () => {
    const wrapper = mount(StreamWallToolPanel);
    const btn = wrapper.findAll('.type-btn').find((b) => b.text().includes('stoneWall'));
    await btn.trigger('click');
    expect(wrapper.emitted('type-change')?.[0][0]).toBe('stoneWall');
  });

  it('emits type-change with ford when ford button is clicked', async () => {
    const wrapper = mount(StreamWallToolPanel);
    const fordBtn = wrapper.findAll('.type-btn').find((b) => b.text().includes('ford'));
    await fordBtn.trigger('click');
    expect(wrapper.emitted('type-change')?.[0][0]).toBe('ford');
  });

  // ── Overlay config ──────────────────────────────────────────────────────────

  it('emits overlay-config on mount', () => {
    const wrapper = mount(StreamWallToolPanel);
    expect(wrapper.emitted('overlay-config')).toBeTruthy();
  });

  it('emitted overlay-config has edgeLine with along-edge style', () => {
    const wrapper = mount(StreamWallToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.edgeLine.style).toBe('along-edge');
    expect(cfg.edgeLine.featureGroups.length).toBe(2); // stream, stoneWall
  });

  it('emitted overlay-config has faint grid', () => {
    const wrapper = mount(StreamWallToolPanel);
    const cfg = wrapper.emitted('overlay-config').at(-1)[0];
    expect(cfg.grid).toBeTruthy();
    expect(cfg.grid.weight).toBe('faint');
  });

  // ── Edge paint events ───────────────────────────────────────────────────────

  it('handleEdgeClick emits edge-paint with selectedType', () => {
    const wrapper = mount(StreamWallToolPanel, { props: { selectedType: 'stream' } });
    wrapper.vm.handleEdgeClick('05.03', 2);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 2,
      type: 'stream',
    });
  });

  it('handleEdgeRightClick emits hex-stream-clear with hexId', () => {
    const wrapper = mount(StreamWallToolPanel, { props: { selectedType: 'stream' } });
    wrapper.vm.handleEdgeRightClick('03.02', 0);
    expect(wrapper.emitted('hex-stream-clear')?.[0][0]).toEqual({ hexId: '03.02' });
  });

  // ── Ford type validation ────────────────────────────────────────────────────

  it('ford selection: edge-paint not emitted when edge has no stream', () => {
    const wrapper = mount(StreamWallToolPanel, {
      props: { selectedType: 'ford', getEdgeFeatures: () => [] },
    });
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('edge-paint')).toBeFalsy();
  });

  it('ford selection: edge-paint emitted with type ford when edge has stream', () => {
    const wrapper = mount(StreamWallToolPanel, {
      props: { selectedType: 'ford', getEdgeFeatures: () => ['stream'] },
    });
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 1,
      type: 'ford',
    });
  });

  it('ford selection: validation error shown when edge has no stream', async () => {
    const wrapper = mount(StreamWallToolPanel, {
      props: { selectedType: 'ford', getEdgeFeatures: () => [] },
    });
    wrapper.vm.handleEdgeClick('05.03', 1);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.validation-error').exists()).toBe(true);
  });

  // ── Clear all ───────────────────────────────────────────────────────────────

  it('Clear all button emits edge-clear-all with stream types including ford', async () => {
    const wrapper = mount(StreamWallToolPanel);
    const clearBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear all');
    await clearBtn.trigger('click');
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear');
    await confirmBtn.trigger('click');
    const emitted = wrapper.emitted('edge-clear-all');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual(expect.arrayContaining(['stream', 'stoneWall', 'ford']));
  });
});
