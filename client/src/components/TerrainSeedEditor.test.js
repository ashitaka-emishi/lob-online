import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import TerrainSeedEditor from './TerrainSeedEditor.vue';

const SEED_CLEAR = {
  hexId: '04.10',
  confirmedData: { terrain: 'open', elevation: 250, features: [] },
  cropBase64: '',
};

const SEED_WOODS = {
  hexId: '10.08',
  confirmedData: { terrain: 'woods', elevation: 550, features: [] },
  cropBase64: '',
};

describe('TerrainSeedEditor', () => {
  it('renders with empty config showing no seeds message', () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    expect(wrapper.text()).toContain('No terrain seed hexes yet');
  });

  it('renders coverage grid with 5 terrain types', () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    const cells = wrapper.findAll('.coverage-cell');
    expect(cells).toHaveLength(5);
  });

  it('shows all five terrain type labels', () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    const text = wrapper.text();
    expect(text).toContain('open');
    expect(text).toContain('woods');
    expect(text).toContain('town');
    expect(text).toContain('orchard');
    expect(text).toContain('rough');
  });

  it('marks terrain as covered when seed hex exists for that terrain', () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [SEED_CLEAR] } },
    });
    const covered = wrapper.findAll('.coverage-cell.covered');
    expect(covered).toHaveLength(1);
  });

  it('lists seed hexes with their ids', () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [SEED_CLEAR, SEED_WOODS] } },
    });
    expect(wrapper.text()).toContain('04.10');
    expect(wrapper.text()).toContain('10.08');
  });

  it('shows terrain type in seed list entry', () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [SEED_WOODS] } },
    });
    expect(wrapper.text()).toContain('woods');
  });

  it('emits seed-remove with hexId when Remove button clicked', async () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [SEED_CLEAR] } },
    });
    await wrapper.find('.delete-btn').trigger('click');
    const emitted = wrapper.emitted('seed-remove');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe('04.10');
  });

  it('updates reactively when config prop changes', async () => {
    const wrapper = mount(TerrainSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    expect(wrapper.text()).toContain('No terrain seed hexes yet');
    await wrapper.setProps({ config: { seedHexes: [SEED_WOODS] } });
    expect(wrapper.text()).toContain('10.08');
  });

  it('renders with default config when no prop provided', () => {
    const wrapper = mount(TerrainSeedEditor);
    expect(wrapper.text()).toContain('No terrain seed hexes yet');
  });
});
