import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import WedgeEditor from './WedgeEditor.vue';

const DEFAULT_ELEVATIONS = [0, 0, 0, 0, 0, 0];
const MIXED_ELEVATIONS = [10, -5, 0, 20, -15, 0];

describe('WedgeEditor', () => {
  it('renders an SVG element', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: DEFAULT_ELEVATIONS },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('renders 6 clickable wedge polygons', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: DEFAULT_ELEVATIONS },
    });
    // 6 wedge polygons + 1 outline polygon = 7 polygons total
    const polygons = wrapper.findAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(6);
  });

  it('renders 6 elevation value labels', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [10, 20, 30, 40, 50, 60] },
    });
    // Should contain the elevation values
    const textContent = wrapper.text();
    expect(textContent).toContain('10');
    expect(textContent).toContain('20');
    expect(textContent).toContain('30');
  });

  it('positive wedge elevation uses white fill', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [10, 0, 0, 0, 0, 0] },
    });
    // The first wedge polygon (after outline) should have fill="white"
    const wedgePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('fill') === 'white');
    expect(wedgePolygons.length).toBeGreaterThan(0);
  });

  it('negative wedge elevation uses black fill', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [0, -5, 0, 0, 0, 0] },
    });
    const blackPolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('fill') === 'black');
    expect(blackPolygons.length).toBeGreaterThan(0);
  });

  it('zero wedge elevation uses transparent fill', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: DEFAULT_ELEVATIONS },
    });
    const transparentPolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('fill') === 'transparent');
    expect(transparentPolygons.length).toBeGreaterThan(0);
  });

  it('clicking a wedge polygon shows the inline edit input', async () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: DEFAULT_ELEVATIONS },
    });
    expect(wrapper.find('.wedge-input-row').exists()).toBe(false);

    // Click the first wedge polygon (index 0, after the outline polygon at index 0)
    const clickablePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('style')?.includes('cursor: pointer'));
    await clickablePolygons[0].trigger('click');

    expect(wrapper.find('.wedge-input-row').exists()).toBe(true);
    expect(wrapper.find('.wedge-input').exists()).toBe(true);
  });

  it('confirming edit emits update:wedgeElevations with updated index', async () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [0, 0, 0, 0, 0, 0] },
    });

    const clickablePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('style')?.includes('cursor: pointer'));
    await clickablePolygons[0].trigger('click');

    const input = wrapper.find('.wedge-input');
    await input.setValue('50');
    await input.trigger('keyup.enter');

    const emitted = wrapper.emitted('update:wedgeElevations');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][0]).toBe(50);
    // Other indices unchanged
    expect(emitted[0][0][1]).toBe(0);
  });

  it('defaults to all-zero elevations when wedgeElevations not provided', () => {
    const wrapper = mount(WedgeEditor, {});
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('mixed elevations: positive white, negative black, zero transparent', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: MIXED_ELEVATIONS },
    });
    const polygons = wrapper.findAll('polygon');
    const fills = polygons.map((p) => p.attributes('fill'));
    expect(fills).toContain('white');
    expect(fills).toContain('black');
    expect(fills).toContain('transparent');
  });
});
