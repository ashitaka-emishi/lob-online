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
  evenColUp: true,
};

// Helper: overlayConfig that shows hex ID labels (mirrors layers.grid=true in old API)
const WITH_LABELS = {
  hexLabel: { alwaysOn: true, labelFn: (cell) => cell.id },
};

describe('HexMapOverlay', () => {
  it('renders an SVG element', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('renders all hexes (one polygon per hex)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, vpHexIds: [] },
    });
    // 4 cols * 3 rows = 12 hexes
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(12);
  });

  it('vpHexIds does not suppress polygon rendering', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, vpHexIds: ['01.03'] },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('calibrationMode=true renders full grid of polygons', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, calibrationMode: true },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(12);
  });

  it('selectedHexId is highlighted (polygon rendered for it)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, selectedHexId: '01.03', vpHexIds: [] },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('calibrationMode=true renders text labels without overlayConfig', () => {
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
      props: { calibration: BASE_CAL, vpHexIds: [], losHexA: '01.03' },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('LOS hex B renders a polygon when losHexB is set', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, vpHexIds: [], losHexB: '01.03' },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('losPathHexes renders polygons for path hexes', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        vpHexIds: [],
        losPathHexes: ['01.03', '02.03'],
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(2);
  });

  it('losBlockedHex renders a polygon for the blocked hex', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, vpHexIds: [], losBlockedHex: '01.03' },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('accepts LOS props when all are null/empty', () => {
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

  it('applies rotation transform when calibration.rotation is set', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: { ...BASE_CAL, rotation: 5 } },
    });
    expect(wrapper.html()).toContain('rotate(5)');
  });

  it('no rotation transform when calibration.rotation is absent', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    const innerGs = wrapper.findAll('g');
    const hasRotate = innerGs.some((g) => g.attributes('transform')?.includes('rotate('));
    expect(hasRotate).toBe(false);
  });

  // ── HexFillLayer (overlayConfig.hexFill) ──────────────────────────────────

  it('hexFill.fillFn return value is used as polygon fill color', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'unknown' }],
        overlayConfig: {
          hexFill: {
            alwaysOn: true,
            fillFn: (cell) => (cell.terrain === 'unknown' ? '#cccccc' : null),
          },
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const coloredPoly = polygons.find((p) => p.attributes('fill') === '#cccccc');
    expect(coloredPoly).toBeTruthy();
  });

  it('polygons render with fill="none" when overlayConfig.hexFill is absent', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear' }],
        overlayConfig: {},
      },
    });
    const polygons = wrapper.findAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    const nonePoly = polygons.find((p) => p.attributes('fill') === 'none');
    expect(nonePoly).toBeTruthy();
  });

  // ── ElevationLabelLayer (overlayConfig.elevationLabel) ───────────────────

  it('overlayConfig.elevationLabel renders elevation numbers with dark green fill', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', elevation: 500 }],
        overlayConfig: { elevationLabel: { alwaysOn: true } },
      },
    });
    expect(wrapper.text()).toContain('500');
    const elevTexts = wrapper.findAll('text').filter((t) => t.text().trim() === '500');
    expect(elevTexts.length).toBeGreaterThan(0);
    expect(elevTexts[0].attributes('fill')).toBe('#1a6b2a');
  });

  it('no overlayConfig.elevationLabel → elevation numbers not rendered', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', elevation: 500 }],
        overlayConfig: {},
      },
    });
    expect(wrapper.text()).not.toContain('500');
  });

  // ── HexLabelLayer (overlayConfig.hexLabel) ───────────────────────────────

  it('overlayConfig.hexLabel.labelFn output is rendered as text', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: WITH_LABELS,
      },
    });
    const labels = wrapper.findAll('text');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0].attributes('fill')).toBe('#00008b');
    expect(labels[0].attributes('font-size')).toBe('0.78rem');
  });

  it('no layer-hex-labels group when overlayConfig.hexLabel absent and not calibrationMode', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: {} },
    });
    expect(wrapper.find('.layer-hex-labels').exists()).toBe(false);
  });

  // ── HexIconLayer (overlayConfig.hexIcon) ────────────────────────────────

  it('overlayConfig.hexIcon.iconFn output is rendered as text in layer-hex-icons', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'woods' }],
        overlayConfig: {
          hexIcon: { alwaysOn: true, iconFn: (cell) => (cell.terrain === 'woods' ? '▲' : null) },
        },
      },
    });
    const iconGroup = wrapper.find('.layer-hex-icons');
    expect(iconGroup.exists()).toBe(true);
    expect(wrapper.text()).toContain('▲');
  });

  it('no layer-hex-icons group when overlayConfig.hexIcon is absent', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: {} },
    });
    expect(wrapper.find('.layer-hex-icons').exists()).toBe(false);
  });

  // ── EdgeLineLayer (overlayConfig.edgeLine) ───────────────────────────────

  it('overlayConfig.edgeLine renders <line> elements for matching edge features', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', edges: { N: [{ type: 'stream' }] } }],
        overlayConfig: {
          edgeLine: {
            alwaysOn: true,
            featureGroups: [{ types: ['stream'], color: '#4a90d9', strokeWidth: 2 }],
          },
        },
      },
    });
    expect(wrapper.findAll('line').length).toBeGreaterThan(0);
  });

  it('no overlayConfig.edgeLine → no edge <line> elements rendered', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', edges: { N: [{ type: 'stream' }] } }],
        overlayConfig: {},
      },
    });
    expect(wrapper.findAll('line').length).toBe(0);
  });

  // ── SlopeArrowLayer (overlayConfig.slopeArrows) ──────────────────────────

  it('overlayConfig.slopeArrows renders a <line> for hex with slope', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', slope: 0 }],
        overlayConfig: { slopeArrows: { alwaysOn: true } },
      },
    });
    expect(wrapper.findAll('line').length).toBeGreaterThan(0);
  });

  it('slope arrow with northOffset=3 shows W geographic label for slope=0', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: { ...BASE_CAL, northOffset: 3 },
        hexes: [{ hex: '02.02', terrain: 'clear', slope: 0 }],
        overlayConfig: { slopeArrows: { alwaysOn: true } },
      },
    });
    expect(wrapper.text()).toContain('W');
  });

  it('slope arrow with northOffset=0 shows N geographic label for slope=0', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: { ...BASE_CAL, northOffset: 0 },
        hexes: [{ hex: '02.02', terrain: 'clear', slope: 0 }],
        overlayConfig: { slopeArrows: { alwaysOn: true } },
      },
    });
    expect(wrapper.text()).toContain('N');
  });

  // ── WedgeLayer (overlayConfig.wedges) ────────────────────────────────────

  it('overlayConfig.wedges renders 6 wedge polygons for hex with wedgeElevations', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', wedgeElevations: [10, 20, 30, -10, -20, 0] }],
        overlayConfig: { wedges: { alwaysOn: true } },
      },
    });
    // 12 grid polygons + 6 wedge polygons
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(18);
  });

  // ── HexHighlightLayer (seed/VP/LOS — explicit props) ─────────────────────

  it('seed hex polygon renders with purple (#cc44ee) stroke', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        calibrationMode: false,
        vpHexIds: [],
        seedHexIds: ['01.03'],
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seedPoly = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seedPoly).toBeTruthy();
  });

  it('seed hex polygon has wider stroke-width than default', () => {
    const cal = { ...BASE_CAL, strokeWidth: 0.5 };
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: cal, calibrationMode: false, vpHexIds: [], seedHexIds: ['01.03'] },
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
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seedPoly = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seedPoly).toBeTruthy();
    expect(Number(seedPoly.attributes('stroke-opacity'))).toBe(1);
  });

  // ── Hex ID coordinate-system consistency (#114) ────────────────────────────

  it('cell IDs are consistent — NE neighbor of 01.03 is 02.03', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: WITH_LABELS },
    });
    const labelTexts = wrapper.findAll('text').map((el) => el.text());
    expect(labelTexts).toContain('01.03');
    expect(labelTexts).toContain('02.03');
    expect(labelTexts).not.toContain('02.04');
  });

  // ── Interaction gate (Task 4.3) ────────────────────────────────────────────

  it('hex-click is NOT emitted when openPanel is null', async () => {
    const { svgX, svgY } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, { props: { calibration: BASE_CAL } });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    expect(wrapper.emitted('hex-click')).toBeFalsy();
  });

  it('hex-click is NOT emitted when openPanel is "calibration"', async () => {
    const { svgX, svgY } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'calibration' },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    expect(wrapper.emitted('hex-click')).toBeFalsy();
  });

  it('hex-click IS emitted when openPanel is "elevation"', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'elevation' },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    const emitted = wrapper.emitted('hex-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  it('hex-click IS emitted when openPanel is "terrain"', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain' },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    const emitted = wrapper.emitted('hex-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  it('hex-right-click is NOT emitted when openPanel is null', async () => {
    const { svgX, svgY } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, { props: { calibration: BASE_CAL } });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('contextmenu');
    expect(wrapper.emitted('hex-right-click')).toBeFalsy();
  });

  it('hex-right-click IS emitted when openPanel is "terrain"', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain' },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('contextmenu');
    const emitted = wrapper.emitted('hex-right-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  // ── Click hex-ID accuracy (#119 regression) ───────────────────────────────

  it('onSvgClick emits hex-click with hex ID matching hexToGameId formula', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'elevation' },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    const emitted = wrapper.emitted('hex-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  it('onSvgContextMenu emits hex-right-click with hex ID matching hexToGameId formula', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain' },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('contextmenu');
    const emitted = wrapper.emitted('hex-right-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  it('onSvgClick emits correct hex ID for an even game column (hexCol=1)', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(1, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'elevation', overlayConfig: WITH_LABELS },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    const emitted = wrapper.emitted('hex-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
    const labelTexts = wrapper.findAll('text').map((el) => el.text());
    expect(labelTexts).toContain(expectedId);
  });

  it('onSvgContextMenu emits correct hex ID for an even game column (hexCol=1)', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(1, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', overlayConfig: WITH_LABELS },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('contextmenu');
    const emitted = wrapper.emitted('hex-right-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
    const labelTexts = wrapper.findAll('text').map((el) => el.text());
    expect(labelTexts).toContain(expectedId);
  });

  // ── Paint-mode mousedown gate (#115) ──────────────────────────────────────

  it('hex-mouseenter is NOT emitted on hover alone when dragPaintEnabled (no mousedown)', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    const polygons = wrapper.findAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter IS emitted on hover after mousedown when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('hex-mouseenter stops firing after mouseup when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    await wrapper.trigger('mouseup');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter is NOT emitted on hover alone in elevation mode when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'elevation', dragPaintEnabled: true },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter IS emitted after mousedown in elevation mode when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'elevation', dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('paint-stroke-start is emitted on mousedown when dragPaintEnabled and openPanel active', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    expect(wrapper.emitted('paint-stroke-start')).toBeTruthy();
  });

  it('paint-stroke-start is NOT emitted when dragPaintEnabled is false', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: false },
    });
    await wrapper.trigger('mousedown');
    expect(wrapper.emitted('paint-stroke-start')).toBeFalsy();
  });

  it('paint-stroke-start is NOT emitted when openPanel is not active (no interaction)', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: null, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    expect(wrapper.emitted('paint-stroke-start')).toBeFalsy();
  });

  it('paint-stroke-done is emitted on mouseup after a paint stroke', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    await wrapper.trigger('mouseup');
    expect(wrapper.emitted('paint-stroke-done')).toBeTruthy();
  });

  it('paint-stroke-done is NOT emitted on mouseup when no mousedown occurred', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    await wrapper.trigger('mouseup');
    expect(wrapper.emitted('paint-stroke-done')).toBeFalsy();
  });

  it('isPaintMouseDown is false initially and true after mousedown when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain', dragPaintEnabled: true },
    });
    expect(wrapper.vm.isPaintMouseDown).toBe(false);
    await wrapper.trigger('mousedown');
    expect(wrapper.vm.isPaintMouseDown).toBe(true);
    await wrapper.trigger('mouseup');
    expect(wrapper.vm.isPaintMouseDown).toBe(false);
  });

  it('hex-mouseenter emits unconditionally when dragPaintEnabled is false and openPanel active', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: 'terrain' },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('hex-mouseenter NOT emitted when openPanel is inactive even without dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, openPanel: null },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Replicates HexMapOverlay's internal tx/ty computation so tests can construct
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

function setupSvgPoint(wrapper, svgX, svgY) {
  const svgEl = wrapper.find('svg').element;
  svgEl.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: svgX, y: svgY }) });
  svgEl.getScreenCTM = () => ({ inverse: () => ({}) });
}
