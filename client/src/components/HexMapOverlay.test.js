import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HexMapOverlay from './HexMapOverlay.vue';

const BASE_CAL = {
  cols: 4,
  rows: 3,
  dx: 100,
  dy: 50,
  hexWidth: 35,
  hexHeight: 35,
  imageScale: 1,
  orientation: 'flat',
  strokeWidth: 0.5,
  evenColUp: false,
};

describe('HexMapOverlay', () => {
  it('renders an SVG element', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('calibrationMode=false with empty vpHexIds renders no polygons', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, calibrationMode: false, vpHexIds: [] },
    });
    expect(wrapper.findAll('polygon').length).toBe(0);
  });

  it('calibrationMode=false with vpHexIds renders VP hex polygons', () => {
    // The grid is 4 cols x 3 rows; game id col=1,row=3 => "01.03"
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: ['01.03'],
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('calibrationMode=true renders full grid of polygons', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, calibrationMode: true },
    });
    // 4 cols * 3 rows = 12 hexes
    expect(wrapper.findAll('polygon').length).toBe(12);
  });

  it('selectedHexId is highlighted (polygon rendered for it)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        selectedHexId: '01.03',
        vpHexIds: [],
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('calibrationMode=true renders text labels', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, calibrationMode: true },
    });
    expect(wrapper.findAll('text').length).toBeGreaterThan(0);
  });

  it('SVG dimensions are based on imageWidth * imageScale', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, imageWidth: 800, imageHeight: 600 },
    });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('800');
  });
});
