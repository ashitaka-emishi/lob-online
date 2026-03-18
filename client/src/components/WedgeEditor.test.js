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

  it('left-click on a wedge decrements that wedge by 1', async () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [0, 0, 0, 0, 0, 0] },
    });
    const clickablePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('style')?.includes('cursor: pointer'));
    await clickablePolygons[0].trigger('click');

    const emitted = wrapper.emitted('update:wedgeElevations');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][0]).toBe(-1);
    // Other indices unchanged
    expect(emitted[0][0][1]).toBe(0);
  });

  it('right-click on a wedge increments that wedge by 1', async () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [0, 0, 0, 0, 0, 0] },
    });
    const clickablePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('style')?.includes('cursor: pointer'));
    await clickablePolygons[1].trigger('contextmenu');

    const emitted = wrapper.emitted('update:wedgeElevations');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][1]).toBe(1);
    // Other indices unchanged
    expect(emitted[0][0][0]).toBe(0);
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

  it('northOffset=3 shows SM cardinal labels W,NW,NE,E,SE,SW', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: DEFAULT_ELEVATIONS, northOffset: 3 },
    });
    const text = wrapper.text();
    for (const label of ['W', 'NW', 'NE', 'E', 'SE', 'SW']) {
      expect(text).toContain(label);
    }
  });

  it('northOffset=0 shows standard labels N,NE,SE,S,SW,NW', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: DEFAULT_ELEVATIONS, northOffset: 0 },
    });
    const text = wrapper.text();
    for (const label of ['N', 'NE', 'SE', 'S', 'SW', 'NW']) {
      expect(text).toContain(label);
    }
  });

  it('left-click clamps at -21 when current is already -21', async () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [-21, 0, 0, 0, 0, 0] },
    });
    const clickablePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('style')?.includes('cursor: pointer'));
    await clickablePolygons[0].trigger('click');

    const emitted = wrapper.emitted('update:wedgeElevations');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][0]).toBe(-21); // clamped, not -22
  });

  it('right-click clamps at 21 when current is already 21', async () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [0, 21, 0, 0, 0, 0] },
    });
    const clickablePolygons = wrapper
      .findAll('polygon')
      .filter((p) => p.attributes('style')?.includes('cursor: pointer'));
    await clickablePolygons[1].trigger('contextmenu');

    const emitted = wrapper.emitted('update:wedgeElevations');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][1]).toBe(21); // clamped, not 22
  });

  it('wedge value labels are visible in SVG text elements', () => {
    const wrapper = mount(WedgeEditor, {
      props: { wedgeElevations: [2, -1, 0, 3, 0, -2], northOffset: 3 },
    });
    const text = wrapper.text();
    expect(text).toContain('2');
    expect(text).toContain('-1');
    expect(text).toContain('3');
    expect(text).toContain('-2');
  });
});
