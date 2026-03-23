import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TerrainToolPanel from './TerrainToolPanel.vue';

const TERRAIN_TYPES = ['clear', 'woods', 'slopingGround', 'marsh'];

describe('TerrainToolPanel', () => {
  it('renders a button for each terrain type plus the building button', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const btns = wrapper.findAll('.terrain-btn');
    expect(btns.length).toBe(TERRAIN_TYPES.length + 1); // +1 for building
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

  // --- color swatches (#138) ---

  it('each terrain button contains a .terrain-swatch element', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const btns = wrapper.findAll('.terrain-btn');
    btns.forEach((btn) => {
      expect(btn.find('.terrain-swatch').exists()).toBe(true);
    });
  });

  it('terrain button swatch has inline background-color for colored types', () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: ['woods'] },
    });
    const swatch = wrapper.find('.terrain-swatch');
    expect(swatch.attributes('style')).toContain('background-color');
  });

  it('terrain button swatch has no background-color for clear (null color)', () => {
    const wrapper = mount(TerrainToolPanel, {
      props: { terrainTypes: ['clear'] },
    });
    const swatch = wrapper.find('.terrain-swatch');
    const style = swatch.attributes('style') ?? '';
    expect(style).not.toContain('background-color');
  });

  // --- building button (#138) ---

  it('renders a building button in the palette', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const btns = wrapper.findAll('.terrain-btn');
    const buildingBtn = btns.find((b) => b.text().includes('building'));
    expect(buildingBtn).toBeTruthy();
  });

  it('clicking building button emits terrain-change with building', async () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const buildingBtn = wrapper.findAll('.terrain-btn').find((b) => b.text().includes('building'));
    await buildingBtn.trigger('click');
    expect(wrapper.emitted('terrain-change')?.[0][0]).toBe('building');
  });

  it('building button has no color swatch background', () => {
    const wrapper = mount(TerrainToolPanel, { props: { terrainTypes: TERRAIN_TYPES } });
    const buildingBtn = wrapper.findAll('.terrain-btn').find((b) => b.text().includes('building'));
    const swatch = buildingBtn.find('.terrain-swatch');
    const style = swatch.exists() ? (swatch.attributes('style') ?? '') : '';
    expect(style).not.toContain('background-color');
  });
});
