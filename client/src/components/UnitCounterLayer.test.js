import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UnitCounterLayer from './UnitCounterLayer.vue';

// cellById: Map<hexId, { cx, cy }> — mirrors the subset of gridData.cellById used by this component.
function makeCellById(entries) {
  return new Map(entries.map(([id, cx, cy]) => [id, { cx, cy }]));
}

const BASE_CELL_BY_ID = makeCellById([
  ['05.03', 100, 200],
  ['07.04', 300, 400],
  ['09.05', 500, 600],
]);

const UNIT_A = { id: 'unit-a', hexId: '05.03', counterFile: 'C1 copy.png', side: 'confederate' };
const UNIT_B = { id: 'unit-b', hexId: '07.04', counterFile: 'U1 copy.png', side: 'union' };
const UNIT_C = { id: 'unit-c', hexId: '05.03', counterFile: 'C2 copy.png', side: 'confederate' };
const UNIT_A_NAMED = { ...UNIT_A, name: '1st Brigade' };

describe('UnitCounterLayer', () => {
  it('renders nothing when units array is empty', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [], cellById: BASE_CELL_BY_ID },
    });
    expect(wrapper.findAll('image').length).toBe(0);
  });

  it('renders one <image> per unit', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A, UNIT_B], cellById: BASE_CELL_BY_ID },
    });
    expect(wrapper.findAll('image').length).toBe(2);
  });

  it('sets href to /counters/{counterFile} on each image', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A], cellById: BASE_CELL_BY_ID },
    });
    const img = wrapper.find('image');
    const href = img.attributes('href') ?? img.attributes('xlink:href');
    expect(href).toBe('/counters/C1 copy.png');
  });

  it('positions image centered on hex cx/cy', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A], cellById: BASE_CELL_BY_ID },
    });
    const img = wrapper.find('image');
    // The image x/y should place it centered: x = cx - size/2, y = cy - size/2
    const x = parseFloat(img.attributes('x'));
    const y = parseFloat(img.attributes('y'));
    const w = parseFloat(img.attributes('width'));
    const h = parseFloat(img.attributes('height'));
    // Center of rendered image should match hex center
    expect(x + w / 2).toBeCloseTo(100, 0); // cx = 100
    expect(y + h / 2).toBeCloseTo(200, 0); // cy = 200
  });

  it('skips units whose hexId is not in cellById (off-board reinforcements)', () => {
    const offBoard = {
      id: 'unit-off',
      hexId: '99.99',
      counterFile: 'C3 copy.png',
      side: 'confederate',
    };
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A, offBoard], cellById: BASE_CELL_BY_ID },
    });
    // Only UNIT_A renders; off-board unit has no cell
    expect(wrapper.findAll('image').length).toBe(1);
  });

  it('stacks multiple units in the same hex with an x offset per stacking index', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A, UNIT_C], cellById: BASE_CELL_BY_ID },
    });
    const images = wrapper.findAll('image');
    expect(images.length).toBe(2);
    // Both units are in hex 05.03 (cx=100). Second unit should be offset from first.
    const x0 = parseFloat(images[0].attributes('x'));
    const x1 = parseFloat(images[1].attributes('x'));
    expect(x0).not.toBeCloseTo(x1, 0);
  });

  it('emits unit-click with unitId when an image is clicked', async () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A, UNIT_B], cellById: BASE_CELL_BY_ID },
    });
    const images = wrapper.findAll('image');
    await images[0].trigger('click');
    expect(wrapper.emitted('unit-click')).toBeTruthy();
    expect(wrapper.emitted('unit-click')[0]).toEqual(['unit-a']);
  });

  it('emits the correct unitId when the second unit image is clicked', async () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A, UNIT_B], cellById: BASE_CELL_BY_ID },
    });
    const images = wrapper.findAll('image');
    await images[1].trigger('click');
    expect(wrapper.emitted('unit-click')[0]).toEqual(['unit-b']);
  });
});

describe('UnitCounterLayer — AT reliability (#434)', () => {
  it('wraps each interactive counter in a <g role="button"> element, not <image> (#434)', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A, UNIT_B], cellById: BASE_CELL_BY_ID },
    });
    const groups = wrapper.findAll('g[role="button"]');
    expect(groups).toHaveLength(2);
    // <image> must NOT carry role="button" — that pattern is unreliable across AT tools
    const images = wrapper.findAll('image[role="button"]');
    expect(images).toHaveLength(0);
  });

  it('interactive <g> carries tabindex="0" and aria-label with unit id fallback (#434)', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A], cellById: BASE_CELL_BY_ID },
    });
    const g = wrapper.find('g[role="button"]');
    expect(g.attributes('tabindex')).toBe('0');
    expect(g.attributes('aria-label')).toContain('unit-a');
  });

  it('interactive <g> aria-label uses enriched unit name when available (#434)', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A_NAMED], cellById: BASE_CELL_BY_ID },
    });
    const g = wrapper.find('g[role="button"]');
    expect(g.attributes('aria-label')).toContain('1st Brigade');
  });

  it('<image> inside interactive <g> does not carry role, tabindex, or aria-label (#434)', () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A], cellById: BASE_CELL_BY_ID },
    });
    const img = wrapper.find('image');
    expect(img.attributes('role')).toBeUndefined();
    expect(img.attributes('tabindex')).toBeUndefined();
    expect(img.attributes('aria-label')).toBeUndefined();
  });

  it('emits unit-click when Enter is pressed on the <g> wrapper (#434)', async () => {
    const wrapper = mount(UnitCounterLayer, {
      props: { units: [UNIT_A], cellById: BASE_CELL_BY_ID },
    });
    const g = wrapper.find('g[role="button"]');
    await g.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('unit-click')).toBeTruthy();
    expect(wrapper.emitted('unit-click')[0]).toEqual(['unit-a']);
  });
});
