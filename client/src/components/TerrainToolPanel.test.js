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
});
