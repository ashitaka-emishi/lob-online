import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import ElevationSeedEditor from './ElevationSeedEditor.vue';

const SEED_LOW = {
  hexId: '04.10',
  confirmedData: { terrain: 'clear', elevation: 250, features: [] },
  cropBase64: '',
};

const SEED_MID = {
  hexId: '10.08',
  confirmedData: { terrain: 'woods', elevation: 550, features: [] },
  cropBase64: '',
};

describe('ElevationSeedEditor', () => {
  it('renders with empty config showing no seeds message', () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    expect(wrapper.text()).toContain('No elevation seed hexes yet');
  });

  it('renders coverage grid with 5 elevation bands', () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    const cells = wrapper.findAll('.coverage-cell');
    expect(cells).toHaveLength(5);
  });

  it('marks band as covered when seed hex exists in that band', () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [SEED_LOW] } },
    });
    const covered = wrapper.findAll('.coverage-cell.covered');
    expect(covered).toHaveLength(1);
  });

  it('lists seed hexes with their ids', () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [SEED_LOW, SEED_MID] } },
    });
    expect(wrapper.text()).toContain('04.10');
    expect(wrapper.text()).toContain('10.08');
  });

  it('shows elevation in seed list entry', () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [SEED_LOW] } },
    });
    expect(wrapper.text()).toContain('250 ft');
  });

  it('emits seed-remove with hexId when Remove button clicked', async () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [SEED_LOW] } },
    });
    await wrapper.find('.delete-btn').trigger('click');
    const emitted = wrapper.emitted('seed-remove');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe('04.10');
  });

  it('updates reactively when config prop changes', async () => {
    const wrapper = mount(ElevationSeedEditor, {
      props: { config: { seedHexes: [] } },
    });
    expect(wrapper.text()).toContain('No elevation seed hexes yet');
    await wrapper.setProps({ config: { seedHexes: [SEED_LOW] } });
    expect(wrapper.text()).toContain('04.10');
  });

  it('renders with default config when no prop provided', () => {
    const wrapper = mount(ElevationSeedEditor);
    expect(wrapper.text()).toContain('No elevation seed hexes yet');
  });
});
