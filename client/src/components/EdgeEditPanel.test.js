import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EdgeEditPanel from './EdgeEditPanel.vue';

const EDGE_FEATURE_TYPES = [
  'road',
  'stream',
  'stoneWall',
  'slope',
  'extremeSlope',
  'verticalSlope',
];

describe('EdgeEditPanel', () => {
  it('renders 6 direction rows (N, NE, SE, S, SW, NW)', () => {
    const wrapper = mount(EdgeEditPanel, {
      props: { hexId: '05.10', edges: {}, edgeFeatureTypes: EDGE_FEATURE_TYPES },
    });
    const rows = wrapper.findAll('.dir-row');
    expect(rows.length).toBe(6);
    const labels = rows.map((r) => r.find('.dir-label').text());
    expect(labels).toEqual(['N', 'NE', 'SE', 'S', 'SW', 'NW']);
  });

  it('lists existing edge features as chips', () => {
    const wrapper = mount(EdgeEditPanel, {
      props: {
        hexId: '05.10',
        edges: { N: [{ type: 'stream' }], SE: [{ type: 'road' }] },
        edgeFeatureTypes: EDGE_FEATURE_TYPES,
      },
    });
    const chips = wrapper.findAll('.feature-chip');
    expect(chips.length).toBe(2);
    const chipTexts = chips.map((c) => c.text());
    expect(chipTexts.some((t) => t.includes('stream'))).toBe(true);
    expect(chipTexts.some((t) => t.includes('road'))).toBe(true);
  });

  it('type dropdown uses edgeFeatureTypes', () => {
    const wrapper = mount(EdgeEditPanel, {
      props: { hexId: '05.10', edges: {}, edgeFeatureTypes: ['road', 'stream'] },
    });
    const selects = wrapper.findAll('.type-select');
    expect(selects.length).toBe(6);
    // Check options in first select
    const options = selects[0].findAll('option').slice(1); // skip "— add —"
    expect(options.map((o) => o.text())).toEqual(['road', 'stream']);
  });

  it('Add button is disabled when no type selected', () => {
    const wrapper = mount(EdgeEditPanel, {
      props: { hexId: '05.10', edges: {}, edgeFeatureTypes: EDGE_FEATURE_TYPES },
    });
    const addBtns = wrapper.findAll('.add-btn');
    expect(addBtns[0].element.disabled).toBe(true);
  });

  it('selecting a type enables Add button', async () => {
    const wrapper = mount(EdgeEditPanel, {
      props: { hexId: '05.10', edges: {}, edgeFeatureTypes: EDGE_FEATURE_TYPES },
    });
    const firstSelect = wrapper.findAll('.type-select')[0];
    await firstSelect.setValue('road');
    const addBtns = wrapper.findAll('.add-btn');
    expect(addBtns[0].element.disabled).toBe(false);
  });

  it('clicking Add emits edge-update with new feature', async () => {
    const wrapper = mount(EdgeEditPanel, {
      props: { hexId: '05.10', edges: {}, edgeFeatureTypes: EDGE_FEATURE_TYPES },
    });
    const firstSelect = wrapper.findAll('.type-select')[0];
    await firstSelect.setValue('road');
    const addBtns = wrapper.findAll('.add-btn');
    await addBtns[0].trigger('click');

    const emitted = wrapper.emitted('edge-update');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual({ hexId: '05.10', dir: 'N', features: [{ type: 'road' }] });
  });

  it('clicking Remove emits edge-update without that feature', async () => {
    const wrapper = mount(EdgeEditPanel, {
      props: {
        hexId: '05.10',
        edges: { N: [{ type: 'stream' }, { type: 'road' }] },
        edgeFeatureTypes: EDGE_FEATURE_TYPES,
      },
    });
    const removeBtns = wrapper.findAll('.remove-btn');
    await removeBtns[0].trigger('click');

    const emitted = wrapper.emitted('edge-update');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].dir).toBe('N');
    expect(emitted[0][0].features).toHaveLength(1);
    expect(emitted[0][0].features[0].type).toBe('road');
  });

  it('removing last feature emits empty features array', async () => {
    const wrapper = mount(EdgeEditPanel, {
      props: {
        hexId: '05.10',
        edges: { SE: [{ type: 'stoneWall' }] },
        edgeFeatureTypes: EDGE_FEATURE_TYPES,
      },
    });
    const removeBtns = wrapper.findAll('.remove-btn');
    await removeBtns[0].trigger('click');

    const emitted = wrapper.emitted('edge-update');
    expect(emitted[0][0].dir).toBe('SE');
    expect(emitted[0][0].features).toHaveLength(0);
  });

  it('emits edge-update with correct hexId', async () => {
    const wrapper = mount(EdgeEditPanel, {
      props: { hexId: '12.34', edges: {}, edgeFeatureTypes: EDGE_FEATURE_TYPES },
    });
    const selects = wrapper.findAll('.type-select');
    await selects[2].setValue('slope'); // SE direction
    await wrapper.findAll('.add-btn')[2].trigger('click');

    const emitted = wrapper.emitted('edge-update');
    expect(emitted[0][0].hexId).toBe('12.34');
    expect(emitted[0][0].dir).toBe('SE');
  });
});
