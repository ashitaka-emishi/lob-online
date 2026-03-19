import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TerrainToolPanel from './TerrainToolPanel.vue';

const TERRAIN_TYPES = ['clear', 'woods', 'slopingGround', 'marsh'];

describe('TerrainToolPanel', () => {
  it('renders a button for each terrain type', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const btns = wrapper.findAll('.terrain-btn');
    expect(btns.length).toBe(4);
  });

  it('active terrain button has active class', () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: TERRAIN_TYPES, paintTerrain: 'woods' },
    });
    const woodsBtn = wrapper.findAll('.terrain-btn').find((b) => b.text().includes('woods'));
    expect(woodsBtn.classes()).toContain('active');
  });

  it('clicking terrain button emits terrain-change', async () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: TERRAIN_TYPES, paintTerrain: 'clear' },
    });
    const woodsBtn = wrapper.findAll('.terrain-btn').find((b) => b.text().includes('woods'));
    await woodsBtn.trigger('click');
    expect(wrapper.emitted('terrain-change')?.[0][0]).toBe('woods');
  });

  it('renders clear-all-terrain button', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    expect(wrapper.find('.clear-btn').exists()).toBe(true);
  });

  it('clicking clear-all button emits clear-all-terrain', async () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    await wrapper.find('.clear-btn').trigger('click');
    expect(wrapper.emitted('clear-all-terrain')).toBeTruthy();
  });

  // --- click/paint mode toggle (#115) ---

  it('renders a Click and a Paint mode toggle button', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const btns = wrapper.findAll('.mode-btn');
    expect(btns.length).toBe(2);
    const labels = btns.map((b) => b.text());
    expect(labels).toContain('Click');
    expect(labels).toContain('Paint');
  });

  it('Click button has active class when paintMode is click', () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: TERRAIN_TYPES, paintMode: 'click' },
    });
    const clickBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Click');
    expect(clickBtn.classes()).toContain('active');
  });

  it('Paint button has active class when paintMode is paint', () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: TERRAIN_TYPES, paintMode: 'paint' },
    });
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Paint');
    expect(paintBtn.classes()).toContain('active');
  });

  it('clicking Click button emits paint-mode-change with click', async () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: TERRAIN_TYPES, paintMode: 'paint' },
    });
    const clickBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Click');
    await clickBtn.trigger('click');
    expect(wrapper.emitted('paint-mode-change')?.[0][0]).toBe('click');
  });

  it('clicking Paint button emits paint-mode-change with paint', async () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: TERRAIN_TYPES, paintMode: 'click' },
    });
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'Paint');
    await paintBtn.trigger('click');
    expect(wrapper.emitted('paint-mode-change')?.[0][0]).toBe('paint');
  });
});
