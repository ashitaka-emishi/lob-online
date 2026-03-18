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

  it('renders all hexes regardless of calibrationMode (visibility filter removed)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, calibrationMode: false, vpHexIds: [] },
    });
    // 4 cols * 3 rows = 12 hexes always render now
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(12);
  });

  it('calibrationMode=false with vpHexIds still renders polygons', () => {
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
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(12);
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

  it('LOS hex A renders a polygon when losHexA is set', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        losHexA: '01.03',
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('LOS hex B renders a polygon when losHexB is set', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        losHexB: '01.03',
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('losPathHexes renders polygons for path hexes', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        losPathHexes: ['01.03', '02.03'],
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(2);
  });

  it('losBlockedHex renders a polygon for the blocked hex', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        losBlockedHex: '01.03',
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('accepts new LOS props without errors when all are null/empty', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        losHexA: null,
        losHexB: null,
        losPathHexes: [],
        losBlockedHex: null,
      },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  // --- New layer system tests ---

  it('unknown terrain renders with #cccccc fill', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'unknown' }],
        layers: {
          terrain: true,
          grid: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const unknownPoly = polygons.find((p) => p.attributes('fill') === '#cccccc');
    expect(unknownPoly).toBeTruthy();
  });

  it('layers.terrain=false renders polygons with fill="none"', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear' }],
        layers: {
          terrain: false,
          grid: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    // All terrain polygons should have fill=none
    const nonePoly = polygons.find((p) => p.attributes('fill') === 'none');
    expect(nonePoly).toBeTruthy();
  });

  it('layers.elevation=true renders elevation text labels with dark green fill', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', elevation: 500 }],
        layers: {
          terrain: true,
          grid: true,
          elevation: true,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    expect(wrapper.text()).toContain('500');
    const elevTexts = wrapper.findAll('text').filter((t) => t.text().trim() === '500');
    expect(elevTexts.length).toBeGreaterThan(0);
    expect(elevTexts[0].attributes('fill')).toBe('#1a6b2a');
  });

  it('layers.elevation=false does not render elevation text', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', elevation: 500 }],
        layers: {
          terrain: true,
          grid: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    // calibration labels may render if calibrationMode=true, but we're not in calibrationMode
    expect(wrapper.text()).not.toContain('500');
  });

  it('layers.edges=true renders <line> elements for hex with edge features', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', edges: { N: [{ type: 'stream' }] } }],
        layers: {
          terrain: true,
          grid: true,
          elevation: false,
          wedges: false,
          edges: true,
          slopeArrows: false,
        },
      },
    });
    expect(wrapper.findAll('line').length).toBeGreaterThan(0);
  });

  it('layers.edges=false renders no edge <line> elements', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', edges: { N: [{ type: 'stream' }] } }],
        layers: {
          terrain: true,
          grid: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    expect(wrapper.findAll('line').length).toBe(0);
  });

  it('layers.slopeArrows=true renders a <line> for hex with slope', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', slope: 0 }],
        layers: {
          terrain: true,
          grid: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: true,
        },
      },
    });
    expect(wrapper.findAll('line').length).toBeGreaterThan(0);
  });

  it('layers.wedges=true renders 6 wedge polygons for hex with wedgeElevations', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [
          {
            hex: '01.03',
            terrain: 'clear',
            wedgeElevations: [10, 20, 30, -10, -20, 0],
          },
        ],
        layers: {
          terrain: true,
          grid: true,
          elevation: false,
          wedges: true,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    // 12 terrain polygons + 6 wedge polygons
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(18);
  });

  it('applies rotation transform when calibration.rotation is set', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: { ...BASE_CAL, rotation: 5 } },
    });
    const html = wrapper.html();
    expect(html).toContain('rotate(5)');
  });

  it('hex ID labels are dark blue (#00008b) and use 0.78rem font size', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        layers: {
          grid: true,
          terrain: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    const labels = wrapper.findAll('text');
    expect(labels.length).toBeGreaterThan(0);
    const label = labels[0];
    expect(label.attributes('fill')).toBe('#00008b');
    expect(label.attributes('font-size')).toBe('0.78rem');
  });

  it('labels hidden when layers.grid is false', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        layers: {
          grid: false,
          terrain: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    // No layer-labels group rendered
    const labelGroup = wrapper.find('.layer-labels');
    expect(labelGroup.exists()).toBe(false);
  });

  it('even-column hex IDs display row value decremented by one', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        layers: {
          grid: true,
          terrain: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    // BASE_CAL: rows=3, cols=4
    // hex(col=1, row=0) → gameCol=2 (even) → with fix: gameRow = 3-0-1 = 2 → "02.02"
    // Without fix it would be "02.03"
    const labelTexts = wrapper.findAll('text').map((el) => el.text());
    expect(labelTexts).toContain('02.02');
    expect(labelTexts).not.toContain('02.03');
    // Odd column is unaffected: hex(col=0, row=0) → gameCol=1 (odd) → gameRow=3-0=3 → "01.03"
    expect(labelTexts).toContain('01.03');
  });

  it('seed hex polygon renders with purple (#cc44ee) stroke', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        seedHexIds: ['01.03'],
        layers: {
          grid: true,
          terrain: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seedPoly = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seedPoly).toBeTruthy();
  });

  it('seed hex polygon has wider stroke-width than default', () => {
    const cal = { ...BASE_CAL, strokeWidth: 0.5 };
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: cal,
        calibrationMode: false,
        vpHexIds: [],
        seedHexIds: ['01.03'],
        layers: {
          grid: true,
          terrain: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seedPoly = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seedPoly).toBeTruthy();
    // strokeWidth for seed = max(0.5*2, 1.5) = 1.5
    expect(Number(seedPoly.attributes('stroke-width'))).toBeGreaterThanOrEqual(1.5);
  });

  it('seed hex polygon has full stroke-opacity (1)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        seedHexIds: ['01.03'],
        layers: {
          grid: true,
          terrain: true,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: false,
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seedPoly = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seedPoly).toBeTruthy();
    expect(Number(seedPoly.attributes('stroke-opacity'))).toBe(1);
  });

  it('no rotation transform when calibration.rotation is absent', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    // Should not contain a rotate transform (empty string transform is ok)
    const innerGs = wrapper.findAll('g');
    const hasRotate = innerGs.some((g) => g.attributes('transform')?.includes('rotate('));
    expect(hasRotate).toBe(false);
  });

  it('slope arrow with northOffset=3 shows W geographic label for slope=0', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: { ...BASE_CAL, northOffset: 3 },
        hexes: [{ hex: '02.02', terrain: 'clear', slope: 0 }],
        layers: {
          grid: false,
          terrain: false,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: true,
        },
      },
    });
    // slope index 0 with northOffset=3 → geographic label 'W'
    expect(wrapper.text()).toContain('W');
  });

  it('slope arrow with northOffset=0 shows N geographic label for slope=0', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: { ...BASE_CAL, northOffset: 0 },
        hexes: [{ hex: '02.02', terrain: 'clear', slope: 0 }],
        layers: {
          grid: false,
          terrain: false,
          elevation: false,
          wedges: false,
          edges: false,
          slopeArrows: true,
        },
      },
    });
    expect(wrapper.text()).toContain('N');
  });

  // --- Trace highlight layer tests ---

  it('trace highlight renders exactly traceEdges.length lines (not cells × 6)', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    // Set internal trace state directly via defineExpose (auto-unwrapped on vm)
    // line values are pre-computed coords (matching the {hexId,dir,line} shape from onSvgMouseMove)
    const mockLine = { x1: 0, y1: 0, x2: 10, y2: 10 };
    wrapper.vm.isDrawing = true;
    wrapper.vm.traceEdges = [
      { hexId: '01.03', dir: 'N', line: mockLine },
      { hexId: '01.03', dir: 'NE', line: mockLine },
    ];
    await wrapper.vm.$nextTick();

    const traceGroup = wrapper.find('.layer-trace');
    expect(traceGroup.exists()).toBe(true);
    // Must render exactly 2 lines — one per traceEdge, not one per cell×dir
    expect(traceGroup.findAll('line').length).toBe(2);
  });

  it('trace highlight renders 0 lines when traceEdges is empty', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    wrapper.vm.isDrawing = true;
    wrapper.vm.traceEdges = [];
    await wrapper.vm.$nextTick();

    const traceGroup = wrapper.find('.layer-trace');
    expect(traceGroup.exists()).toBe(true);
    expect(traceGroup.findAll('line').length).toBe(0);
  });
});
