import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineHex, Grid, rectangle, Orientation } from 'honeycomb-grid';
import { hexToGameId } from '../utils/hexGeometry.js';
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

  // --- hex ID coordinate-system consistency tests (#114) ---

  it('cell IDs are consistent with los.js adjacentHexId — SE neighbor of 01.03 is 02.03', () => {
    // With evenColUp:false (offset:-1, ODD_Q), hex(col=1,row=0) is at the same visual row
    // as hex(col=0,row=0) but shifted down by half a hex — game row must stay 3, not 2.
    // adjacentHexId('01.03','SE',{rows:3,cols:4}) === '02.03'
    // Before the fix the formula subtracts 1 for even game cols → labels it '02.02' instead.
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
    const labelTexts = wrapper.findAll('text').map((el) => el.text());
    // Odd game column (col=1, hex.col=0): top hex should be row 3 — always holds.
    expect(labelTexts).toContain('01.03');
    // Even game column (col=2, hex.col=1): top-most rendered hex must be row 3 as well,
    // because adjacentHexId('01.03','SE',{rows:3,cols:4}) === '02.03'.
    // Before the fix, the formula subtracted 1 for even game cols → top hex got '02.02'
    // instead of '02.03', shifting the entire column's labels one row down.
    expect(labelTexts).toContain('02.03');
    // The column starts at row 3, so row 4 must NOT appear (would indicate an off-by-one
    // in the other direction).
    expect(labelTexts).not.toContain('02.04');
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

  // --- click/context-menu hex ID emit tests (#119) ---

  // Replicate HexMapOverlay's internal tx/ty computation so we can construct
  // SVG coordinates that land exactly on a known hex centre.
  function makeSvgPoint(hexCol, hexRow, cal = BASE_CAL, imageHeight = 900) {
    const Hex = defineHex({
      dimensions: { xRadius: cal.hexWidth, yRadius: cal.hexHeight },
      orientation: Orientation.FLAT,
      origin: { x: 0, y: 0 },
      offset: cal.evenColUp ? 1 : -1,
    });
    const gridRows = cal.rows > 0 ? cal.rows : 35;
    const gridCols = cal.cols > 0 ? cal.cols : 64;
    const grid = new Grid(Hex, rectangle({ width: gridCols, height: gridRows }));
    const anchorHex = grid.getHex({ col: 0, row: gridRows - 1 });
    const tx = cal.dx - anchorHex.x;
    const ty = imageHeight * cal.imageScale - cal.dy - anchorHex.y;
    const targetHex = grid.getHex({ col: hexCol, row: hexRow });
    return {
      svgX: targetHex.x + tx,
      svgY: targetHex.y + ty,
      expectedId: hexToGameId(targetHex, gridRows),
    };
  }

  it('onSvgClick emits hex-click with hex ID matching hexToGameId formula', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, { props: { calibration: BASE_CAL } });
    const svgEl = wrapper.find('svg').element;
    svgEl.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: svgX, y: svgY }) });
    svgEl.getScreenCTM = () => ({ inverse: () => ({}) });

    await wrapper.trigger('click');

    const emitted = wrapper.emitted('hex-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  it('onSvgContextMenu emits hex-right-click with hex ID matching hexToGameId formula', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, { props: { calibration: BASE_CAL } });
    const svgEl = wrapper.find('svg').element;
    svgEl.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: svgX, y: svgY }) });
    svgEl.getScreenCTM = () => ({ inverse: () => ({}) });

    await wrapper.trigger('contextmenu');

    const emitted = wrapper.emitted('hex-right-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
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

  // --- paint-mode mousedown gate tests (#115) ---

  it('hex-mouseenter is NOT emitted on polygon hover alone in paint editorMode (no mousedown)', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'paint' },
    });
    const polygons = wrapper.findAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter IS emitted on hover after mousedown in paint editorMode', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'paint' },
    });
    await wrapper.trigger('mousedown');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('hex-mouseenter stops firing after mouseup in paint editorMode', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'paint' },
    });
    await wrapper.trigger('mousedown');
    await wrapper.trigger('mouseup');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter is NOT emitted on hover alone in elevation editorMode (no mousedown)', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'elevation' },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter IS emitted on hover after mousedown in elevation editorMode', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'elevation' },
    });
    await wrapper.trigger('mousedown');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('paint-stroke-done is emitted on mouseup after a paint stroke', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'paint' },
    });
    await wrapper.trigger('mousedown');
    await wrapper.trigger('mouseup');
    expect(wrapper.emitted('paint-stroke-done')).toBeTruthy();
  });

  it('paint-stroke-done is NOT emitted on mouseup when no mousedown occurred', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'paint' },
    });
    await wrapper.trigger('mouseup');
    expect(wrapper.emitted('paint-stroke-done')).toBeFalsy();
  });

  it('isPaintMouseDown is false initially and true after mousedown in paint mode', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'paint' },
    });
    expect(wrapper.vm.isPaintMouseDown).toBe(false);
    await wrapper.trigger('mousedown');
    expect(wrapper.vm.isPaintMouseDown).toBe(true);
    await wrapper.trigger('mouseup');
    expect(wrapper.vm.isPaintMouseDown).toBe(false);
  });

  it('hex-mouseenter still emits unconditionally in non-paint/elevation modes (e.g. select)', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, editorMode: 'select' },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });
});
