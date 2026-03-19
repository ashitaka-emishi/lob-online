import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HexEditPanel from './HexEditPanel.vue';

describe('HexEditPanel', () => {
  it('shows "Click a hex to edit" when hex=null and selectedHexId=null', () => {
    const wrapper = mount(HexEditPanel, {
      props: { hex: null, selectedHexId: null },
    });
    expect(wrapper.text()).toContain('Click a hex to edit');
  });

  it('shows hex id header when selectedHexId is set but hex is null', () => {
    const wrapper = mount(HexEditPanel, {
      props: { hex: null, selectedHexId: '12.34' },
    });
    expect(wrapper.text()).toContain('12.34');
    expect(wrapper.find('select').exists()).toBe(false);
  });

  it('shows form fields when hex is provided', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '12.34', terrain: 'clear' },
        selectedHexId: '12.34',
      },
    });
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.text()).toContain('12.34');
  });

  it('changing terrain select emits hex-update', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear' },
        selectedHexId: '05.10',
      },
    });
    const select = wrapper.find('select');
    await select.setValue('woods');
    await select.trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].terrain).toBe('woods');
  });

  it('checking vpHex checkbox emits hex-update with vpHex: true', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', vpHex: false },
        selectedHexId: '05.10',
      },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // building=0, vpHex=1, entryHex=2, seed=3
    const vpCheckbox = checkboxes[1];
    await vpCheckbox.setValue(true);
    await vpCheckbox.trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].vpHex).toBe(true);
  });

  it('hex with elevation renders elevation input', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', elevation: 2 },
        selectedHexId: '05.10',
      },
    });
    const elevationInput = wrapper.find('input[type="number"]');
    expect(elevationInput.exists()).toBe(true);
  });

  it('hex with setupUnits shows unit list', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', setupUnits: ['1/A/1'] },
        selectedHexId: '05.10',
      },
    });
    expect(wrapper.text()).toContain('1/A/1');
  });

  // --- Phase 5 new tests ---

  it('renders slope picker buttons (N,NE,SE,S,SW,NW,None)', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear' },
        selectedHexId: '05.10',
      },
    });
    const slopeBtns = wrapper.findAll('.slope-btn');
    expect(slopeBtns.length).toBe(7); // 6 dirs + None
    const labels = slopeBtns.map((b) => b.text());
    expect(labels).toContain('N');
    expect(labels).toContain('None');
  });

  it('clicking a slope direction button emits hex-update with slope index', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear' },
        selectedHexId: '05.10',
      },
    });
    const nBtn = wrapper.findAll('.slope-btn').find((b) => b.text() === 'SE');
    await nBtn.trigger('click');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].slope).toBe(2); // SE is index 2
  });

  it('clicking "None" slope button emits hex-update without slope', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', slope: 1 },
        selectedHexId: '05.10',
      },
    });
    const noneBtn = wrapper.findAll('.slope-btn').find((b) => b.text() === 'None');
    await noneBtn.trigger('click');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    // slope should not be in the update (null was set, emitUpdate omits null slope)
    expect(emitted[emitted.length - 1][0].slope).toBeUndefined();
  });

  it('wedge section is removed — no WedgeEditor or toggle-wedge-btn in HexEditPanel', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', wedgeElevations: [0, 0, 0, 0, 0, 0] },
        selectedHexId: '05.10',
      },
    });
    expect(wrapper.find('.toggle-wedge-btn').exists()).toBe(false);
    expect(wrapper.find('.derive-btn').exists()).toBe(false);
  });

  it('renders EdgeEditPanel for the edges section', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear' },
        selectedHexId: '05.10',
        edgeFeatureTypes: ['road', 'stream'],
      },
    });
    // EdgeEditPanel renders 6 dir-rows
    expect(wrapper.findAll('.dir-row').length).toBe(6);
  });

  it('building checkbox is unchecked when hex has no hexFeature', () => {
    const wrapper = mount(HexEditPanel, {
      props: { hex: { hex: '05.10', terrain: 'clear' }, selectedHexId: '05.10' },
    });
    const buildingCheckbox = wrapper.findAll('input[type="checkbox"]')[0];
    expect(buildingCheckbox.element.checked).toBe(false);
  });

  it('building checkbox is checked when hex has hexFeature: { type: "building" }', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', hexFeature: { type: 'building' } },
        selectedHexId: '05.10',
      },
    });
    const buildingCheckbox = wrapper.findAll('input[type="checkbox"]')[0];
    expect(buildingCheckbox.element.checked).toBe(true);
  });

  it('toggling building checkbox on emits hex-update with hexFeature', async () => {
    const wrapper = mount(HexEditPanel, {
      props: { hex: { hex: '05.10', terrain: 'clear' }, selectedHexId: '05.10' },
    });
    await wrapper.findAll('input[type="checkbox"]')[0].trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].hexFeature).toEqual({ type: 'building' });
  });

  it('toggling building checkbox off emits hex-update without hexFeature', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', hexFeature: { type: 'building' } },
        selectedHexId: '05.10',
      },
    });
    await wrapper.findAll('input[type="checkbox"]')[0].trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].hexFeature).toBeUndefined();
  });

  it('seed hex checkbox is rendered and disabled when canMarkAsSeed is false', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'unknown' },
        selectedHexId: '05.10',
        isSeedHex: false,
      },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // building=0, vpHex=1, entryHex=2, seed=3
    const seedCheckbox = checkboxes[3];
    expect(seedCheckbox.element.disabled).toBe(true);
  });

  it('seed hex checkbox is enabled when terrain and elevation are set', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', elevation: 2 },
        selectedHexId: '05.10',
        isSeedHex: false,
      },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const seedCheckbox = checkboxes[3];
    expect(seedCheckbox.element.disabled).toBe(false);
  });

  it('checking seed checkbox emits seed-toggle with hexId and confirmedData', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear', elevation: 2 },
        selectedHexId: '05.10',
        isSeedHex: false,
      },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    const seedCheckbox = checkboxes[3];
    await seedCheckbox.trigger('change');
    const emitted = wrapper.emitted('seed-toggle');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].hexId).toBe('05.10');
    expect(emitted[0][0].confirmedData.terrain).toBe('clear');
    expect(emitted[0][0].confirmedData.elevation).toBe(2);
  });

  it('renders terrain and elevation fields when a minimal hex is passed', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '03.05', terrain: 'unknown' },
        selectedHexId: '03.05',
      },
    });
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.find('input[type="number"]').exists()).toBe(true);
  });

  it('hex with wedgeElevations still emits wedgeElevations in hex-update when terrain changes', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: {
          hex: '05.10',
          terrain: 'clear',

          wedgeElevations: [3, 1, 0, 0, 0, 0],
        },
        selectedHexId: '05.10',
      },
    });
    const select = wrapper.find('select');
    await select.setValue('woods');
    await select.trigger('change');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    // wedgeElevations preserved through HexEditPanel form passthrough
    expect(emitted[emitted.length - 1][0].wedgeElevations).toEqual([3, 1, 0, 0, 0, 0]);
  });

  it('northOffset=3 slope buttons show SM cardinal labels W,NW,NE,E,SE,SW', () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear' },
        selectedHexId: '05.10',
        northOffset: 3,
      },
    });
    const slopeBtns = wrapper.findAll('.slope-btn');
    const labels = slopeBtns.map((b) => b.text()).filter((t) => t !== 'None');
    expect(labels).toEqual(['W', 'NW', 'NE', 'E', 'SE', 'SW']);
  });

  it('northOffset=3 slope button click for index 0 emits slope=0 (geographic W)', async () => {
    const wrapper = mount(HexEditPanel, {
      props: {
        hex: { hex: '05.10', terrain: 'clear' },
        selectedHexId: '05.10',
        northOffset: 3,
      },
    });
    const wBtn = wrapper.findAll('.slope-btn').find((b) => b.text() === 'W');
    await wBtn.trigger('click');
    const emitted = wrapper.emitted('hex-update');
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0].slope).toBe(0);
  });
});
