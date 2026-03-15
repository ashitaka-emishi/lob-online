import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorToolbar from './EditorToolbar.vue';

const BASE_LAYERS = {
  grid: true,
  terrain: true,
  elevation: false,
  wedges: false,
  edges: true,
  slopeArrows: false,
};

describe('EditorToolbar', () => {
  it('renders 4 mode buttons', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS },
    });
    const modeBtns = wrapper.findAll('.mode-btn');
    expect(modeBtns.length).toBe(4);
    expect(modeBtns.map((b) => b.text())).toEqual(['select', 'paint', 'elevation', 'edge']);
  });

  it('active mode button has active class', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'paint', layers: BASE_LAYERS },
    });
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'paint');
    expect(paintBtn.classes()).toContain('active');
    const selectBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'select');
    expect(selectBtn.classes()).not.toContain('active');
  });

  it('clicking a mode button emits mode-change with the mode name', async () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS },
    });
    const paintBtn = wrapper.findAll('.mode-btn').find((b) => b.text() === 'paint');
    await paintBtn.trigger('click');
    const emitted = wrapper.emitted('mode-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe('paint');
  });

  it('terrain palette is visible in paint mode when terrainTypes provided', () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        editorMode: 'paint',
        layers: BASE_LAYERS,
        terrainTypes: ['clear', 'woods', 'marsh'],
      },
    });
    expect(wrapper.find('.terrain-palette').exists()).toBe(true);
    const paletteBtns = wrapper.find('.terrain-palette').findAll('.palette-btn');
    expect(paletteBtns.length).toBe(3);
  });

  it('terrain palette is hidden in select mode', () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        editorMode: 'select',
        layers: BASE_LAYERS,
        terrainTypes: ['clear', 'woods'],
      },
    });
    expect(wrapper.find('.terrain-palette').exists()).toBe(false);
  });

  it('clicking terrain button emits terrain-change', async () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        editorMode: 'paint',
        paintTerrain: 'clear',
        layers: BASE_LAYERS,
        terrainTypes: ['clear', 'woods'],
      },
    });
    const woodsBtn = wrapper.find('.terrain-palette').findAll('.palette-btn')[1];
    await woodsBtn.trigger('click');
    expect(wrapper.emitted('terrain-change')?.[0][0]).toBe('woods');
  });

  it('edge palette visible in edge mode when edgeFeatureTypes provided', () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        editorMode: 'edge',
        layers: BASE_LAYERS,
        edgeFeatureTypes: ['road', 'stream', 'stoneWall'],
      },
    });
    expect(wrapper.find('.edge-palette').exists()).toBe(true);
    const edgeBtns = wrapper.find('.edge-palette').findAll('.palette-btn');
    expect(edgeBtns.length).toBe(3);
  });

  it('clicking edge feature button emits edge-feature-change', async () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        editorMode: 'edge',
        layers: BASE_LAYERS,
        edgeFeatureTypes: ['road', 'stream'],
      },
    });
    const streamBtn = wrapper.find('.edge-palette').findAll('.palette-btn')[1];
    await streamBtn.trigger('click');
    expect(wrapper.emitted('edge-feature-change')?.[0][0]).toBe('stream');
  });

  it('renders layer checkboxes for all 6 layers', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(6);
  });

  it('layer checkbox change emits layer-change with updated value', async () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS },
    });
    // elevation is the 3rd checkbox (index 2)
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const elevCheckbox = checkboxes[2];
    await elevCheckbox.setValue(true);
    await elevCheckbox.trigger('change');
    const emitted = wrapper.emitted('layer-change');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].elevation).toBe(true);
  });

  it('Export button is disabled when hasMapData=false', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS, hasMapData: false },
    });
    expect(wrapper.find('.export-btn').element.disabled).toBe(true);
  });

  it('Export button is enabled when hasMapData=true', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS, hasMapData: true },
    });
    expect(wrapper.find('.export-btn').element.disabled).toBe(false);
  });

  it('clicking Export emits export-click', async () => {
    const wrapper = mount(EditorToolbar, {
      props: { editorMode: 'select', layers: BASE_LAYERS, hasMapData: true },
    });
    await wrapper.find('.export-btn').trigger('click');
    expect(wrapper.emitted('export-click')).toBeTruthy();
  });
});
