<script setup>
import { computed, ref } from 'vue';
import { defineHex, Grid, rectangle, Orientation } from 'honeycomb-grid';
import {
  DIRS,
  edgeMidpoint,
  edgeLine20_80,
  wedgePolygonPoints,
  getEdgeLabels,
  findNearestEdge,
  getCellAndNeighbors,
  hexToGameId,
} from '../utils/hexGeometry.js';

// ── Interaction gate ───────────────────────────────────────────────────────────
// Events emitted only when a data-editing tool is active.
const INTERACTIVE_PANELS = new Set(['elevation', 'terrain', 'road', 'stream', 'contour']);
// Edge-click mode: road/stream/contour tools snap clicks to edges; others snap to hexes.
const EDGE_PANELS = new Set(['road', 'stream', 'contour']);

const props = defineProps({
  calibration: {
    type: Object,
    required: true,
  },
  hexes: {
    type: Array,
    default: () => [],
  },
  vpHexIds: {
    type: Array,
    default: () => [],
  },
  selectedHexId: {
    type: String,
    default: null,
  },
  calibrationMode: {
    type: Boolean,
    default: false,
  },
  imageWidth: {
    type: Number,
    default: 1400,
  },
  imageHeight: {
    type: Number,
    default: 900,
  },
  losHexA: {
    type: String,
    default: null,
  },
  losHexB: {
    type: String,
    default: null,
  },
  losPathHexes: {
    type: Array,
    default: () => [],
  },
  losBlockedHex: {
    type: String,
    default: null,
  },
  seedHexIds: {
    type: Array,
    default: () => [],
  },
  // ── New declarative config ─────────────────────────────────────────────────
  // overlayConfig shape (all keys optional):
  //   grid:           { alwaysOn, weight: 'faint'|'diagnostic' }
  //   hexFill:        { alwaysOn, toggleLabel?, fillFn: (cell) => cssColor|null }
  //   hexLabel:       { alwaysOn, toggleLabel?, labelFn: (cell) => string|null, size? }
  //   elevationLabel: { alwaysOn }           — elevation number at bottom of each hex
  //   hexIcon:        { alwaysOn, iconFn: (cell) => string|null }
  //   edgeLine:       { alwaysOn, featureGroups: [{types, color, strokeWidth, dash?}] }
  //   highlight:      { alwaysOn, hexIds: string[], strokeColor }
  //   wedges:         { alwaysOn }           — wedge shading from wedgeElevations
  //   slopeArrows:    { alwaysOn }           — slope direction arrows
  overlayConfig: {
    type: Object,
    default: () => ({}),
  },
  // Active panel name — gates interaction events.
  // Only INTERACTIVE_PANELS values enable hex/edge click, mouseenter events.
  openPanel: {
    type: String,
    default: null,
  },
  // True when the active tool supports drag-paint. Gates hex-mouseenter to mousedown-only.
  dragPaintEnabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'hex-click',
  'hex-right-click',
  'hex-mouseenter',
  'hex-mouseleave',
  'edge-click',
  'edge-hover',
  'paint-stroke-done',
  'paint-stroke-start',
]);

const interactionEnabled = computed(() => INTERACTIVE_PANELS.has(props.openPanel));
const edgeMode = computed(() => EDGE_PANELS.has(props.openPanel));

// Paint mousedown gate — true while the mouse button is held during drag-paint.
const isPaintMouseDown = ref(false);

// ── Derived sets ──────────────────────────────────────────────────────────────
const hexIndex = computed(() => {
  const idx = {};
  for (const h of props.hexes) idx[h.hex] = h;
  return idx;
});

const vpHexSet = computed(() => new Set(props.vpHexIds));
const losPathSet = computed(() => new Set(props.losPathHexes));
const seedHexSet = computed(() => new Set(props.seedHexIds));

// ── Grid computation ──────────────────────────────────────────────────────────
const gridData = computed(() => {
  const { dx, dy, hexWidth, hexHeight, imageScale, orientation, evenColUp, cols, rows } =
    props.calibration;
  const gridCols = cols > 0 ? cols : 64;
  const gridRows = rows > 0 ? rows : 35;
  const orient = orientation === 'pointy' ? Orientation.POINTY : Orientation.FLAT;

  const Hex = defineHex({
    dimensions: { xRadius: hexWidth, yRadius: hexHeight },
    orientation: orient,
    origin: { x: 0, y: 0 },
    offset: evenColUp ? 1 : -1,
  });

  const grid = new Grid(Hex, rectangle({ width: gridCols, height: gridRows }));
  const anchorHex = grid.getHex({ col: 0, row: gridRows - 1 });
  const tx = dx - anchorHex.x;
  const ty = props.imageHeight * imageScale - dy - anchorHex.y;

  const northOffset = props.calibration.northOffset ?? 0;
  const edgeLabels = getEdgeLabels(northOffset);

  const cells = [];
  grid.forEach((hex) => {
    const corners = hex.corners;
    const points = corners.map((c) => `${c.x},${c.y}`).join(' ');
    const cx = hex.x;
    const cy = hex.y;
    const id = hexToGameId(hex, gridRows);
    const known = hexIndex.value[id];
    const terrain = known?.terrain ?? 'unknown';
    const bottomCY = (corners[1].y + corners[2].y) / 2;
    const isVP = vpHexSet.value.has(id);
    const isSeed = seedHexSet.value.has(id);
    const isLosA = id === props.losHexA;
    const isLosB = id === props.losHexB;
    const isLosPath = losPathSet.value.has(id);
    const isLosBlocked = id === props.losBlockedHex;
    const slope = known?.slope ?? null;
    const slopeDir = slope !== null && slope !== undefined ? DIRS[slope] : null;
    const slopeMid = slopeDir ? edgeMidpoint(corners, slopeDir) : null;
    const slopeArrowLine = slopeMid ? { x1: cx, y1: cy, x2: slopeMid.x, y2: slopeMid.y } : null;
    const slopeArrowLabel = slopeDir ? (edgeLabels[slope] ?? null) : null;
    cells.push({
      id,
      col: hex.col,
      row: hex.row,
      points,
      cx,
      cy,
      corners,
      terrain,
      elevation: known?.elevation ?? null,
      slope,
      wedgeElevations: known?.wedgeElevations ?? null,
      edges: known?.edges ?? {},
      hexFeature: known?.hexFeature ?? null,
      bottomCY,
      isVP,
      isSeed,
      isLosA,
      isLosB,
      isLosPath,
      isLosBlocked,
      slopeArrowLine,
      slopeArrowLabel,
    });
  });

  const cellByColRow = new Map(cells.map((c) => [`${c.col},${c.row}`, c]));
  const cellById = new Map(cells.map((c) => [c.id, c]));
  return { cells, grid, tx, ty, cellByColRow, cellById };
});

const cells = computed(() => gridData.value.cells);

const rotationTransform = computed(() => {
  const deg = props.calibration.rotation;
  return deg ? `rotate(${deg})` : '';
});

// ── HexFillLayer helpers ───────────────────────────────────────────────────────

function hexFillColor(cell) {
  // LOS blocked fill overrides everything
  if (cell.isLosBlocked) return '#cc4444';
  const cfg = props.overlayConfig.hexFill;
  if (!cfg) return 'none';
  return cfg.fillFn?.(cell) ?? 'none';
}

function hexFillOpacity(cell) {
  if (cell.isLosBlocked) return 0.5;
  const color = hexFillColor(cell);
  return color !== 'none' ? 0.45 : 0;
}

// ── HexGridLayer / HexHighlightLayer helpers ──────────────────────────────────

function strokeForCell(cell) {
  if (props.calibrationMode) return '#cc88ff';
  if (cell.isLosBlocked) return '#cc4444';
  if (cell.isLosA) return '#44aa44';
  if (cell.isLosB) return '#4488cc';
  if (cell.isLosPath) return '#cc8844';
  if (props.selectedHexId === cell.id) return '#ffdd00';
  if (cell.isSeed) return '#cc44ee';
  if (cell.isVP) return '#cc3333';
  const gridCfg = props.overlayConfig.grid;
  return gridCfg?.weight === 'diagnostic' ? '#cc88ff' : '#88776644';
}

function strokeWidthForCell(cell) {
  if (props.calibrationMode) return props.calibration.strokeWidth;
  if (cell.isLosBlocked || cell.isLosA || cell.isLosB || cell.isLosPath) {
    return Math.max(props.calibration.strokeWidth * 2.5, 2);
  }
  if (props.selectedHexId === cell.id) return Math.max(props.calibration.strokeWidth * 3, 2);
  if (cell.isSeed) return Math.max(props.calibration.strokeWidth * 2, 1.5);
  if (cell.isVP) return Math.max(props.calibration.strokeWidth * 2, 1.5);
  return props.calibration.strokeWidth;
}

function strokeOpacityForCell(cell) {
  if (props.calibrationMode) return 0.75;
  if (
    cell.isLosBlocked ||
    cell.isLosA ||
    cell.isLosB ||
    cell.isLosPath ||
    props.selectedHexId === cell.id ||
    cell.isSeed ||
    cell.isVP
  )
    return 1;
  return 0.6;
}

// ── HexLabelLayer helper ──────────────────────────────────────────────────────

function hexLabelText(cell) {
  const cfg = props.overlayConfig.hexLabel;
  if (cfg) return cfg.labelFn?.(cell) ?? null;
  // calibrationMode fallback: show hex ID without needing overlayConfig
  if (props.calibrationMode) return cell.id;
  return null;
}

// ── HexIconLayer helper ───────────────────────────────────────────────────────

function hexIconText(cell) {
  const cfg = props.overlayConfig.hexIcon;
  return cfg?.iconFn?.(cell) ?? null;
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onSvgClick(event) {
  if (!interactionEnabled.value) return;
  const svg = event.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const { grid, tx, ty, cells: allCells, cellByColRow } = gridData.value;
  const localX = svgPt.x - tx;
  const localY = svgPt.y - ty;

  if (edgeMode.value) {
    const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : allCells;
    const nearest = findNearestEdge(localX, localY, searchCells);
    if (nearest) emit('edge-click', nearest);
  } else {
    const hex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    if (hex) {
      const gridRows = props.calibration.rows > 0 ? props.calibration.rows : 35;
      const id = hexToGameId(hex, gridRows);
      emit('hex-click', id, event);
    }
  }
}

let rafPending = false;

function onSvgMouseMove(event) {
  if (rafPending) return;
  rafPending = true;
  const svg = event.currentTarget;
  const clientX = event.clientX;
  const clientY = event.clientY;
  requestAnimationFrame(() => {
    rafPending = false;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    const { grid, tx, ty, cells: allCells, cellByColRow } = gridData.value;
    const localX = svgPt.x - tx;
    const localY = svgPt.y - ty;

    const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : allCells;
    const nearest = findNearestEdge(localX, localY, searchCells);

    if (props.overlayConfig.edgeLine) {
      emit('edge-hover', nearest);
    }
  });
}

function onSvgContextMenu(event) {
  if (!interactionEnabled.value) return;
  event.preventDefault();
  const svg = event.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const { grid, tx, ty } = gridData.value;
  const localX = svgPt.x - tx;
  const localY = svgPt.y - ty;

  const hex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
  if (hex) {
    const gridRows = props.calibration.rows > 0 ? props.calibration.rows : 35;
    const id = hexToGameId(hex, gridRows);
    emit('hex-right-click', id, event);
  }
}

function onSvgMouseDown() {
  if (props.dragPaintEnabled) {
    isPaintMouseDown.value = true;
    if (interactionEnabled.value) emit('paint-stroke-start');
  }
}

function onSvgMouseUp() {
  if (isPaintMouseDown.value) {
    isPaintMouseDown.value = false;
    if (interactionEnabled.value) emit('paint-stroke-done');
  }
}

// Gate hex-mouseenter: interaction must be enabled; in drag-paint mode also require mousedown.
function onHexMouseenter(hexId) {
  if (!interactionEnabled.value) return;
  if (props.dragPaintEnabled && !isPaintMouseDown.value) return;
  emit('hex-mouseenter', hexId);
}

// Exposed for test instrumentation only.
defineExpose({ isPaintMouseDown });
</script>

<template>
  <svg
    :width="imageWidth * calibration.imageScale"
    :height="imageHeight * calibration.imageScale"
    style="position: absolute; top: 0; left: 0; cursor: crosshair"
    @click="onSvgClick"
    @contextmenu="onSvgContextMenu"
    @mousedown="onSvgMouseDown"
    @mouseup="onSvgMouseUp"
    @mouseleave="onSvgMouseUp"
    @mousemove="onSvgMouseMove"
  >
    <g :transform="`translate(${gridData.tx},${gridData.ty})`">
      <g :transform="rotationTransform">
        <!-- HexGridLayer + HexFillLayer + HexHighlightLayer ─────────────────
             One polygon per hex carries fill (hexFill config), stroke (grid +
             highlight state), and the mouseenter event handler.             -->
        <g class="layer-grid">
          <polygon
            v-for="cell in cells"
            :key="'hex-' + cell.id"
            :points="cell.points"
            :fill="hexFillColor(cell)"
            :fill-opacity="hexFillOpacity(cell)"
            :stroke="strokeForCell(cell)"
            :stroke-width="strokeWidthForCell(cell)"
            :stroke-opacity="strokeOpacityForCell(cell)"
            @mouseenter="onHexMouseenter(cell.id)"
          />
        </g>

        <!-- WedgeLayer — sub-hex elevation shading ─────────────────────────-->
        <g v-if="overlayConfig.wedges" class="layer-wedges">
          <template v-for="cell in cells" :key="'wedges-' + cell.id">
            <template v-if="cell.wedgeElevations">
              <polygon
                v-for="(wv, wi) in cell.wedgeElevations"
                :key="wi"
                :points="wedgePolygonPoints(cell.corners, { x: cell.cx, y: cell.cy })[wi]"
                :fill="wv > 0 ? 'white' : wv < 0 ? 'black' : 'transparent'"
                :fill-opacity="wv !== 0 ? 0.35 : 0"
                stroke="none"
                pointer-events="none"
              />
            </template>
          </template>
        </g>

        <!-- HexLabelLayer — hex ID or custom labels ─────────────────────────
             Renders when overlayConfig.hexLabel is set, or in calibrationMode
             (CalibrationPanel hasn't migrated to overlayConfig yet).         -->
        <g v-if="overlayConfig.hexLabel || calibrationMode" class="layer-hex-labels">
          <text
            v-for="cell in cells"
            :key="'lbl-' + cell.id"
            :x="cell.cx"
            :y="cell.cy"
            text-anchor="middle"
            dominant-baseline="middle"
            :font-size="overlayConfig.hexLabel?.size === 'large' ? '0.95rem' : '0.78rem'"
            fill="#00008b"
            fill-opacity="0.85"
            pointer-events="none"
          >
            {{ hexLabelText(cell) }}
          </text>
        </g>

        <!-- ElevationLabelLayer — elevation numbers ─────────────────────────-->
        <g v-if="overlayConfig.elevationLabel" class="layer-elevation-labels">
          <text
            v-for="cell in cells"
            :key="'elev-' + cell.id"
            :x="cell.cx"
            :y="cell.bottomCY - 2"
            text-anchor="middle"
            dominant-baseline="auto"
            font-size="11"
            fill="#1a6b2a"
            stroke="rgba(255,255,255,0.55)"
            stroke-width="2.5"
            paint-order="stroke"
            fill-opacity="1"
            pointer-events="none"
          >
            {{ cell.elevation !== null ? cell.elevation : '' }}
          </text>
        </g>

        <!-- HexIconLayer — terrain or feature icons ─────────────────────────-->
        <g v-if="overlayConfig.hexIcon" class="layer-hex-icons">
          <text
            v-for="cell in cells"
            :key="'icon-' + cell.id"
            :x="cell.cx"
            :y="cell.cy + 6"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="10"
            fill="#ffffffbb"
            stroke="rgba(0,0,0,0.5)"
            stroke-width="1.5"
            paint-order="stroke"
            pointer-events="none"
          >
            {{ hexIconText(cell) }}
          </text>
        </g>

        <!-- EdgeLineLayer — road, stream, contour, and other edge features ───
             Iterates featureGroups from overlayConfig.edgeLine. Each group
             defines which types it covers and how to render them.            -->
        <g v-if="overlayConfig.edgeLine" class="layer-edge-lines">
          <template v-for="cell in cells" :key="'edges-' + cell.id">
            <template v-for="dir in DIRS" :key="dir">
              <template v-if="cell.edges && cell.edges[dir] && cell.edges[dir].length">
                <template v-for="(group, gi) in overlayConfig.edgeLine.featureGroups" :key="gi">
                  <line
                    v-for="feat in cell.edges[dir].filter((f) => group.types.includes(f.type))"
                    :key="feat.type"
                    v-bind="edgeLine20_80(cell.corners, dir)"
                    :stroke="group.color"
                    :stroke-width="group.strokeWidth"
                    :stroke-dasharray="group.dash ?? null"
                    stroke-linecap="round"
                    pointer-events="none"
                  />
                </template>
              </template>
            </template>
          </template>
        </g>

        <!-- SlopeArrowLayer — slope direction arrows ─────────────────────────-->
        <g v-if="overlayConfig.slopeArrows" class="layer-slope-arrows">
          <template v-for="cell in cells" :key="'slope-' + cell.id">
            <template v-if="cell.slopeArrowLine">
              <line
                v-bind="cell.slopeArrowLine"
                stroke="#ffaa44"
                stroke-width="1.5"
                marker-end="url(#arrow)"
                pointer-events="none"
              />
              <text
                :x="cell.slopeArrowLine.x2"
                :y="cell.slopeArrowLine.y2 - 4"
                text-anchor="middle"
                font-size="8"
                fill="#ffaa44"
                pointer-events="none"
              >
                {{ cell.slopeArrowLabel }}
              </text>
            </template>
          </template>
        </g>
      </g>
    </g>

    <!-- Arrow marker definition -->
    <defs>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#ffaa44" />
      </marker>
    </defs>
  </svg>
</template>
