import { describe, it, expect, vi, afterEach } from 'vitest';
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an SVG element', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('renders all hexes (one polygon per hex)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    // 4 cols * 3 rows = 12 hexes
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(12);
  });

  it('vpHighlight does not suppress polygon rendering', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { vpHighlight: { hexIds: ['01.03'] } } },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('overlayConfig.diagnosticMode.active renders full grid of polygons', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { diagnosticMode: { active: true } } },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(12);
  });

  it('selectedHex is highlighted (polygon rendered for it)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { selectedHex: { hexId: '01.03' } } },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('overlayConfig.diagnosticMode.active renders text labels without hexLabel config', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { diagnosticMode: { active: true } } },
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

  it('overlayConfig.los.hexA renders a polygon', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { los: { hexA: '01.03' } } },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('overlayConfig.los.hexB renders a polygon', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { los: { hexB: '01.03' } } },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('overlayConfig.los.pathHexes renders polygons for path hexes', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { los: { pathHexes: ['01.03', '02.03'] } },
      },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThanOrEqual(2);
  });

  it('overlayConfig.los.blockedHex renders a polygon for the blocked hex', () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, overlayConfig: { los: { blockedHex: '01.03' } } },
    });
    expect(wrapper.findAll('polygon').length).toBeGreaterThan(0);
  });

  it('renders svg when all LOS fields are null/empty', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { los: { hexA: null, hexB: null, pathHexes: [], blockedHex: null } },
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
    // Edges are stored by canonical face index (0=N, 1=NE, 2=SE)
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        hexes: [{ hex: '01.03', terrain: 'clear', edges: { 0: [{ type: 'stream' }] } }],
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
        hexes: [{ hex: '01.03', terrain: 'clear', edges: { 0: [{ type: 'stream' }] } }],
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
        overlayConfig: { seedHighlight: { hexIds: ['01.03'] } },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seedPoly = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seedPoly).toBeTruthy();
  });

  it('seed hex polygon has wider stroke-width than default', () => {
    const cal = { ...BASE_CAL, strokeWidth: 0.5 };
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: cal, overlayConfig: { seedHighlight: { hexIds: ['01.03'] } } },
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
        overlayConfig: { seedHighlight: { hexIds: ['01.03'] } },
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

  it('hex-click is NOT emitted when interactionEnabled is false (default)', async () => {
    const { svgX, svgY } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, { props: { calibration: BASE_CAL } });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    expect(wrapper.emitted('hex-click')).toBeFalsy();
  });

  it('hex-click IS emitted when interactionEnabled is true', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true },
    });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('click');
    const emitted = wrapper.emitted('hex-click');
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toBe(expectedId);
  });

  it('hex-right-click is NOT emitted when interactionEnabled is false (default)', async () => {
    const { svgX, svgY } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, { props: { calibration: BASE_CAL } });
    setupSvgPoint(wrapper, svgX, svgY);
    await wrapper.trigger('contextmenu');
    expect(wrapper.emitted('hex-right-click')).toBeFalsy();
  });

  it('hex-right-click IS emitted when interactionEnabled is true', async () => {
    const { svgX, svgY, expectedId } = makeSvgPoint(0, 0);
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true },
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
      props: { calibration: BASE_CAL, interactionEnabled: true },
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
      props: { calibration: BASE_CAL, interactionEnabled: true },
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
      props: { calibration: BASE_CAL, interactionEnabled: true, overlayConfig: WITH_LABELS },
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
      props: { calibration: BASE_CAL, interactionEnabled: true, overlayConfig: WITH_LABELS },
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
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    const polygons = wrapper.findAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter IS emitted on hover after mousedown when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('hex-mouseenter stops firing after mouseup when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    await wrapper.trigger('mouseup');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter is NOT emitted on hover alone in elevation mode when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  it('hex-mouseenter IS emitted after mousedown in elevation mode when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('paint-stroke-start is emitted on mousedown when dragPaintEnabled and interactionEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    expect(wrapper.emitted('paint-stroke-start')).toBeTruthy();
  });

  it('paint-stroke-start is NOT emitted when dragPaintEnabled is false', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: false },
    });
    await wrapper.trigger('mousedown');
    expect(wrapper.emitted('paint-stroke-start')).toBeFalsy();
  });

  it('paint-stroke-start is NOT emitted when interactionEnabled is false', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    expect(wrapper.emitted('paint-stroke-start')).toBeFalsy();
  });

  it('paint-stroke-done is emitted on mouseup after a paint stroke', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    await wrapper.trigger('mousedown');
    await wrapper.trigger('mouseup');
    expect(wrapper.emitted('paint-stroke-done')).toBeTruthy();
  });

  it('paint-stroke-done is NOT emitted on mouseup when no mousedown occurred', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    await wrapper.trigger('mouseup');
    expect(wrapper.emitted('paint-stroke-done')).toBeFalsy();
  });

  it('isPaintMouseDown is false initially and true after mousedown when dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true, dragPaintEnabled: true },
    });
    expect(wrapper.vm.isPaintMouseDown).toBe(false);
    await wrapper.trigger('mousedown');
    expect(wrapper.vm.isPaintMouseDown).toBe(true);
    await wrapper.trigger('mouseup');
    expect(wrapper.vm.isPaintMouseDown).toBe(false);
  });

  it('hex-mouseenter emits unconditionally when dragPaintEnabled is false and interactionEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, interactionEnabled: true },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeTruthy();
  });

  it('hex-mouseenter NOT emitted when interactionEnabled is false even without dragPaintEnabled', async () => {
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL },
    });
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('mouseenter');
    expect(wrapper.emitted('hex-mouseenter')).toBeFalsy();
  });

  // ── rAF gate on edge-hover path (#160) ────────────────────────────────────

  it('onSvgMouseMove schedules at most one rAF per burst (second event is a no-op)', async () => {
    const rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return 1;
    });

    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, edgeInteraction: true, interactionEnabled: true },
    });
    const svgEl = wrapper.find('svg').element;
    svgEl.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 50, y: 50 }) });
    svgEl.getScreenCTM = () => ({ inverse: () => ({}) });

    await wrapper.trigger('mousemove');
    await wrapper.trigger('mousemove');

    expect(rafCallbacks.length).toBe(1);
  });

  it('onSvgMouseMove: a second burst after rAF fires schedules a new rAF', async () => {
    const rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, edgeInteraction: true, interactionEnabled: true },
    });
    const svgEl = wrapper.find('svg').element;
    svgEl.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 50, y: 50 }) });
    svgEl.getScreenCTM = () => ({ inverse: () => ({}) });

    await wrapper.trigger('mousemove');
    expect(rafCallbacks.length).toBe(1);
    // Fire the rAF callback (resets the pending flag)
    rafCallbacks[0]();
    // A new mousemove should schedule another rAF
    await wrapper.trigger('mousemove');
    expect(rafCallbacks.length).toBe(2);
  });

  it('onSvgMouseMove with edgeInteraction=false does not schedule rAF', async () => {
    const rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCallbacks.push(cb);
      return 1;
    });

    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, edgeInteraction: false },
    });

    await wrapper.trigger('mousemove');
    expect(rafCallbacks.length).toBe(0);
  });

  // ── rAF callback output integration test (#170) ────────────────────────────
  // Verifies the full output path: after the rAF fires, hoverInfo contains a
  // correctly resolved hexId, nearHexId/nearDir (always set at threshold=999),
  // and null snap fields when the cursor is at a hex center (>6px from edges).

  it('rAF callback writes hoverInfo with hexId, nearHexId, nearDir, and inProximity=false at hex center', async () => {
    let rafCb;
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      rafCb = cb;
      return 1;
    });

    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, edgeInteraction: true, interactionEnabled: true },
    });

    // Parse tx, ty from the SVG group transform attribute: "translate(tx, ty)"
    const gTransform = wrapper.find('svg g').attributes('transform');
    const [tx, ty] = gTransform.match(/-?[\d.]+/g).map(Number);

    // Get the first hex polygon's corner points (in local / pre-translate space)
    const poly = wrapper.find('polygon');
    const pts = poly
      .attributes('points')
      .trim()
      .split(' ')
      .map((p) => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });

    // Hex center = average of the 6 corners
    const centerX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const centerY = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    // _toLocal subtracts (tx, ty) from svgPt; supply svgPt = center + offset so localX = centerX
    const svgEl = wrapper.find('svg').element;
    svgEl.createSVGPoint = () => ({
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: centerX + tx, y: centerY + ty }),
    });
    svgEl.getScreenCTM = () => ({ inverse: () => ({}) });

    await wrapper.trigger('mousemove');
    expect(rafCb).toBeDefined();
    rafCb(); // execute rAF callback synchronously

    const hi = wrapper.vm.hoverInfo;
    expect(hi).not.toBeNull();

    // hexId: cursor is at the center of a valid hex — game ID must be a non-empty string
    expect(typeof hi.hexId).toBe('string');
    expect(hi.hexId.length).toBeGreaterThan(0);

    // nearHexId / nearDir: findNearestEdge with threshold=999 always resolves to something
    expect(hi.nearHexId).not.toBeNull();
    expect(typeof hi.nearDir).toBe('string');

    // At hex center the cursor is ~hexWidth/2 ≈ 35px from every edge — well above the 6px
    // snap threshold — so no snap should occur.
    expect(hi.inProximity).toBe(false);
    expect(hi.snapHexId).toBeNull();
    expect(hi.snapDir).toBeNull();
  });
});

// ── Unified overlayConfig API — highlight/LOS/calibration state ───────────────
// Verifies the new overlayConfig keys that replaced the removed flat props
// (vpHexIds, selectedHexId, calibrationMode, losHexA/B/pathHexes/blockedHex, seedHexIds).

describe('HexMapOverlay — unified overlayConfig highlight and state API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── overlayConfig.selectedHex replaces selectedHexId flat prop ──────────────

  it('overlayConfig.selectedHex.hexId highlights the hex with yellow stroke', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { selectedHex: { hexId: '01.03' } },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const selected = polygons.find((p) => p.attributes('stroke') === '#ffdd00');
    expect(selected).toBeTruthy();
  });

  it('flat prop selectedHexId is no longer accepted (not in defineProps)', () => {
    // After Phase 2: selectedHexId is removed from defineProps.
    // Passing it as a prop must have no effect (Vue silently ignores unknown props).
    // This test verifies the component still renders without throwing.
    expect(() => {
      mount(HexMapOverlay, {
        props: { calibration: BASE_CAL, selectedHexId: '01.03' },
      });
    }).not.toThrow();
    // After removal, no yellow-stroked polygon should appear from the flat prop alone.
    const wrapper = mount(HexMapOverlay, {
      props: { calibration: BASE_CAL, selectedHexId: '01.03' },
    });
    const polygons = wrapper.findAll('polygon');
    const yellow = polygons.find((p) => p.attributes('stroke') === '#ffdd00');
    expect(yellow).toBeFalsy();
  });

  // ── overlayConfig.diagnosticMode replaces calibrationMode flat prop ─────────

  it('overlayConfig.diagnosticMode.active renders diagnostic stroke (#cc88ff)', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { diagnosticMode: { active: true } },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const diag = polygons.find((p) => p.attributes('stroke') === '#cc88ff');
    expect(diag).toBeTruthy();
  });

  it('overlayConfig.diagnosticMode.active renders hex labels without hexLabel config', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { diagnosticMode: { active: true } },
      },
    });
    expect(wrapper.findAll('text').length).toBeGreaterThan(0);
  });

  // ── overlayConfig.los replaces losHexA/B/pathHexes/blockedHex flat props ────

  it('overlayConfig.los.hexA renders green stroke on that hex', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { los: { hexA: '01.03', hexB: null, pathHexes: [], blockedHex: null } },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const losA = polygons.find((p) => p.attributes('stroke') === '#44aa44');
    expect(losA).toBeTruthy();
  });

  it('overlayConfig.los.blockedHex renders red fill on that hex', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: {
          los: { hexA: null, hexB: null, pathHexes: [], blockedHex: '01.03' },
        },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const blocked = polygons.find((p) => p.attributes('fill') === '#cc4444');
    expect(blocked).toBeTruthy();
  });

  // ── overlayConfig.vpHighlight replaces vpHexIds flat prop ───────────────────

  it('overlayConfig.vpHighlight.hexIds renders red stroke on VP hexes', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { vpHighlight: { hexIds: ['01.03'] } },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const vp = polygons.find((p) => p.attributes('stroke') === '#cc3333');
    expect(vp).toBeTruthy();
  });

  // ── overlayConfig.seedHighlight replaces seedHexIds flat prop ───────────────

  it('overlayConfig.seedHighlight.hexIds renders purple stroke on seed hexes', () => {
    const wrapper = mount(HexMapOverlay, {
      props: {
        calibration: BASE_CAL,
        overlayConfig: { seedHighlight: { hexIds: ['01.03'] } },
      },
    });
    const polygons = wrapper.findAll('polygon');
    const seed = polygons.find((p) => p.attributes('stroke') === '#cc44ee');
    expect(seed).toBeTruthy();
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
