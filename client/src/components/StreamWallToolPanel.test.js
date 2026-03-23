import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StreamWallToolPanel from './StreamWallToolPanel.vue';

describe('StreamWallToolPanel', () => {
  it('renders stream and stoneWall type buttons', () => {
    const wrapper = mount(StreamWallToolPanel);
    const text = wrapper.text();
    expect(text).toContain('stream');
    expect(text).toContain('stoneWall');
  });

  it('renders Paint and Ford mode buttons', () => {
    const wrapper = mount(StreamWallToolPanel);
    const labels = wrapper.findAll('.mode-btn').map((b) => b.text());
    expect(labels).toContain('Paint');
    expect(labels).toContain('Ford');
  });

  it('Paint mode is active by default', () => {
    const wrapper = mount(StreamWallToolPanel);
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Paint');
    expect(paintBtn.classes()).toContain('active');
  });

  it('highlights the selected type button', () => {
    const wrapper = mount(StreamWallToolPanel, { props: { selectedType: 'stoneWall' } });
    const btn = wrapper.findAll('.type-btn').find((b) => b.text().includes('stoneWall'));
    expect(btn.classes()).toContain('active');
  });

  it('emits type-change when a type button is clicked', async () => {
    const wrapper = mount(StreamWallToolPanel);
    const btn = wrapper.findAll('.type-btn').find((b) => b.text().includes('stoneWall'));
    await btn.trigger('click');
    expect(wrapper.emitted('type-change')?.[0][0]).toBe('stoneWall');
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
    expect(cfg.grid.weight).toBe('faint');
  });

  // ── Edge paint events ───────────────────────────────────────────────────────

  it('handleEdgeClick emits edge-paint in paint mode', () => {
    const wrapper = mount(StreamWallToolPanel, { props: { selectedType: 'stream' } });
    wrapper.vm.handleEdgeClick('05.03', 2);
    expect(wrapper.emitted('edge-paint')?.[0][0]).toEqual({
      hexId: '05.03',
      faceIndex: 2,
      type: 'stream',
    });
  });

  it('handleEdgeRightClick emits edge-clear in paint mode', () => {
    const wrapper = mount(StreamWallToolPanel, { props: { selectedType: 'stoneWall' } });
    wrapper.vm.handleEdgeRightClick('03.02', 1);
    expect(wrapper.emitted('edge-clear')?.[0][0]).toEqual({
      hexId: '03.02',
      faceIndex: 1,
      type: 'stoneWall',
    });
  });

  // ── Clear all ───────────────────────────────────────────────────────────────

  it('Clear all emits edge-clear-all with stream and stoneWall after confirmation', async () => {
    const wrapper = mount(StreamWallToolPanel);
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
    expect(emitted[0][0]).toEqual(expect.arrayContaining(['stream', 'stoneWall']));
  });

  // ── Ford mode ───────────────────────────────────────────────────────────────

  it('switches to Ford mode when Ford button is clicked', async () => {
    const wrapper = mount(StreamWallToolPanel);
    await wrapper
      .findAll('.mode-btn')
      .find((b) => b.text() === 'Ford')
      .trigger('click');
    expect(wrapper.text()).toContain('stream edge');
  });

  it('ford placement blocked without stream — no ford-place emitted', async () => {
    const wrapper = mount(StreamWallToolPanel, { props: { getEdgeFeatures: () => [] } });
    await wrapper
      .findAll('.mode-btn')
      .find((b) => b.text() === 'Ford')
      .trigger('click');
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('ford-place')).toBeFalsy();
  });

  it('ford-place emitted when stream exists on edge', async () => {
    const wrapper = mount(StreamWallToolPanel, { props: { getEdgeFeatures: () => ['stream'] } });
    await wrapper
      .findAll('.mode-btn')
      .find((b) => b.text() === 'Ford')
      .trigger('click');
    wrapper.vm.handleEdgeClick('05.03', 1);
    expect(wrapper.emitted('ford-place')?.[0][0]).toEqual({ hexId: '05.03', faceIndex: 1 });
  });

  it('ford-remove emitted on right-click in ford mode', async () => {
    const wrapper = mount(StreamWallToolPanel, { props: { getEdgeFeatures: () => ['stream'] } });
    await wrapper
      .findAll('.mode-btn')
      .find((b) => b.text() === 'Ford')
      .trigger('click');
    wrapper.vm.handleEdgeRightClick('05.03', 1);
    expect(wrapper.emitted('ford-remove')?.[0][0]).toEqual({ hexId: '05.03', faceIndex: 1 });
  });
});
