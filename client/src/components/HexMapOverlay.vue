<script setup>
import { computed, ref, shallowRef, watch } from 'vue';
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
import { useEdgeLineLayer } from '../composables/useEdgeLineLayer.js';

const props = defineProps({
  calibration: {
    type: Object,
    required: true,
  },
  hexes: {
    type: Array,
    default: () => [],
  },
  imageWidth: {
    type: Number,
    default: 1400,
  },
  imageHeight: {
    type: Number,
    default: 900,
  },
  // ── Declarative rendering config ───────────────────────────────────────────
  // Full shape documented in client/src/utils/overlayConfig.js. All keys optional.
  //   grid:           { alwaysOn, weight: 'faint'|'diagnostic' }
  //   hexFill:        { alwaysOn, fillFn: (cell) => cssColor|null }
  //   hexLabel:       { alwaysOn, labelFn: (cell) => string|null, size? }
  //   elevationLabel: { alwaysOn }
  //   hexIcon:        { alwaysOn, iconFn: (cell) => string|null }
  //   edgeLine:       { alwaysOn, featureGroups: [{types, color, strokeWidth, dash?}] }
  //   wedges:         { alwaysOn }
  //   slopeArrows:    { alwaysOn }
  //   selectedHex:    { hexId: string|null }
  //   diagnosticMode: { active: boolean }
  //   los:            { hexA, hexB, pathHexes, blockedHex }
  //   vpHighlight:    { hexIds: string[] }
  //   seedHighlight:  { hexIds: string[] }
  overlayConfig: {
    type: Object,
    default: () => ({}),
  },
  // True when a data-editing tool panel is open — gates all interaction events.
  // Computed by the parent so this component does not need to know tool panel names.
  interactionEnabled: {
    type: Boolean,
    default: false,
  },
  // True when the active tool snaps clicks to edges rather than hexes.
  edgeInteraction: {
    type: Boolean,
    default: false,
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
  'edge-right-click',
  'paint-stroke-done',
  'paint-stroke-start',
]);

// Paint mousedown gate — true while the mouse button is held during drag-paint.
const isPaintMouseDown = ref(false);

// Hover state — updated on every mousemove when edgeInteraction is active.
// hexId:    hex the cursor is physically inside (for tooltip).
// nearHexId/nearDir: closest edge at large threshold (tooltip label only).
// snapHexId/snapDir: closest edge within snap threshold + tMargin (fuchsia + paint).
// inProximity: true when snapHexId is non-null.
const hoverInfo = ref(null);
// Cell for the fuchsia highlight — tracks the snap result, not the always-nearest result.
const hoverSnapCell = computed(() => {
  if (!hoverInfo.value?.snapHexId) return null;
  return gridData.value.cellById.get(hoverInfo.value.snapHexId) ?? null;
});

// Maps geometric direction strings (N/NE/SE/S/SW/NW) to geographic compass labels
// (e.g. W/NW/NE/E/SE/SW for northOffset=3). Used only for tooltip display — all
// internal edge operations still use geometric face indices.
const geoLabelMap = computed(() => {
  const labels = getEdgeLabels(props.calibration.northOffset ?? 0);
  return Object.fromEntries(DIRS.map((dir, i) => [dir, labels[i]]));
});

// ── Derived sets ──────────────────────────────────────────────────────────────
const hexIndex = computed(() => {
  const idx = {};
  for (const h of props.hexes) idx[h.hex] = h;
  return idx;
});

// Watch the specific array references rather than the top-level overlayConfig object.
// This avoids rebuilding the Sets (and cascading into gridData) when unrelated parts of
// overlayConfig change (e.g. selectedHex, diagnosticMode) but these arrays are unchanged.
const vpHexSet = shallowRef(new Set());
const losPathSet = shallowRef(new Set());
const seedHexSet = shallowRef(new Set());
watch(
  () => props.overlayConfig.vpHighlight?.hexIds,
  (ids) => {
    vpHexSet.value = new Set(ids ?? []);
  },
  { immediate: true }
);
watch(
  () => props.overlayConfig.los?.pathHexes,
  (ids) => {
    losPathSet.value = new Set(ids ?? []);
  },
  { immediate: true }
);
watch(
  () => props.overlayConfig.seedHighlight?.hexIds,
  (ids) => {
    seedHexSet.value = new Set(ids ?? []);
  },
  { immediate: true }
);

// ── Grid computation ──────────────────────────────────────────────────────────
// gridGeometry: expensive honeycomb Grid + per-hex polygon computation.
// Backed by a shallowRef + watch on the 6 shape-affecting calibration fields so
// it only rebuilds when hex size, orientation, or grid dimensions actually change.
// Nudging strokeWidth, northOffset, dx, or dy does NOT trigger a rebuild (#151).
const gridGeometry = shallowRef(null);
watch(
  [
    () => props.calibration.cols,
    () => props.calibration.rows,
    () => props.calibration.hexWidth,
    () => props.calibration.hexHeight,
    () => props.calibration.orientation,
    () => props.calibration.evenColUp,
  ],
  ([cols, rows, hexWidth, hexHeight, orientation, evenColUp]) => {
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
    const geoCells = [];
    grid.forEach((hex) => {
      const corners = hex.corners;
      const cx = hex.x;
      const cy = hex.y;
      geoCells.push({
        col: hex.col,
        row: hex.row,
        id: hexToGameId(hex, gridRows),
        points: corners.map((c) => `${c.x},${c.y}`).join(' '),
        cx,
        cy,
        corners,
        bottomCY: (corners[2].y + corners[3].y) / 2,
        // Pre-computed wedge polygon strings — stable between calibration changes,
        // avoids calling wedgePolygonPoints() inline on every render (#164).
        wedgePoints: wedgePolygonPoints(corners, { x: cx, y: cy }),
      });
    });
    gridGeometry.value = { grid, geoCells, gridRows };
  },
  { immediate: true }
);

// gridData: translation + data enrichment layer. Depends on gridGeometry (cached) plus
// the calibration fields that affect translation/labels and the per-hex data index.
// Rebuilding this is fast: no defineHex/Grid, just arithmetic + a geoCells.map().
// LOS/selection display flags are intentionally absent here — they live in
// cellsWithDisplayAttrs so that selection changes do NOT invalidate this layer
// or the useEdgeLineLayer computeds that depend on `cells` (#151 follow-up).
const gridData = computed(() => {
  const { grid, geoCells, gridRows } = gridGeometry.value;
  const { dx, dy, imageScale } = props.calibration;
  const northOffset = props.calibration.northOffset ?? 0;

  const anchorHex = grid.getHex({ col: 0, row: gridRows - 1 });
  const tx = dx - anchorHex.x;
  const ty = props.imageHeight * imageScale - dy - anchorHex.y;

  const edgeLabels = getEdgeLabels(northOffset);

  const cells = geoCells.map((geoCell) => {
    const { id, corners, cx, cy } = geoCell;
    const known = hexIndex.value[id];
    const slope = known?.slope ?? null;
    const slopeDir = slope !== null && slope !== undefined ? DIRS[slope] : null;
    const slopeMid = slopeDir ? edgeMidpoint(corners, slopeDir) : null;
    return {
      ...geoCell,
      terrain: known?.terrain ?? 'unknown',
      elevation: known?.elevation ?? null,
      slope,
      wedgeElevations: known?.wedgeElevations ?? null,
      edges: known?.edges ?? {},
      hexFeature: known?.hexFeature ?? null,
      slopeArrowLine: slopeMid ? { x1: cx, y1: cy, x2: slopeMid.x, y2: slopeMid.y } : null,
      slopeArrowLabel: slopeDir ? (edgeLabels[slope] ?? null) : null,
    };
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

// ── Grid + highlight display attrs (#177) ─────────────────────────────────────
// Pre-computes fill/stroke per cell into a computed so the template iterates a
// stable array instead of calling four functions per cell on every render.
// Depends on `cells` (calibration/data) and the overlay config properties it reads.
const cellsWithDisplayAttrs = computed(() => {
  const diag = props.overlayConfig.diagnosticMode?.active;
  const selectedHexId = props.overlayConfig.selectedHex?.hexId;
  const gridWeight = props.overlayConfig.grid?.weight;
  const hexFillCfg = props.overlayConfig.hexFill;
  const sw = props.calibration.strokeWidth;
  // LOS/selection flags live here rather than in gridData so that selection and
  // LOS changes only invalidate this display computed, not cells or useEdgeLineLayer.
  const los = props.overlayConfig.los;

  return cells.value.map((cell) => {
    const isVP = vpHexSet.value.has(cell.id);
    const isSeed = seedHexSet.value.has(cell.id);
    const isLosA = cell.id === (los?.hexA ?? null);
    const isLosB = cell.id === (los?.hexB ?? null);
    const isLosPath = losPathSet.value.has(cell.id);
    const isLosBlocked = cell.id === (los?.blockedHex ?? null);

    // fill
    let fill, fillOpacity;
    if (isLosBlocked) {
      fill = '#cc4444';
      fillOpacity = 0.5;
    } else {
      const color = hexFillCfg?.fillFn?.(cell) ?? 'none';
      fill = color;
      fillOpacity = color !== 'none' ? 0.45 : 0;
    }

    // stroke color
    let stroke;
    if (diag) stroke = '#cc88ff';
    else if (isLosBlocked) stroke = '#cc4444';
    else if (isLosA) stroke = '#44aa44';
    else if (isLosB) stroke = '#4488cc';
    else if (isLosPath) stroke = '#cc8844';
    else if (selectedHexId === cell.id) stroke = '#ffdd00';
    else if (isSeed) stroke = '#cc44ee';
    else if (isVP) stroke = '#cc3333';
    else stroke = gridWeight === 'diagnostic' ? '#cc88ff' : '#88776644';

    // stroke width
    let strokeWidth;
    if (diag) strokeWidth = sw;
    else if (isLosBlocked || isLosA || isLosB || isLosPath) strokeWidth = Math.max(sw * 2.5, 2);
    else if (selectedHexId === cell.id) strokeWidth = Math.max(sw * 3, 2);
    else if (isSeed || isVP) strokeWidth = Math.max(sw * 2, 1.5);
    else strokeWidth = sw;

    // stroke opacity
    let strokeOpacity;
    if (diag) strokeOpacity = 0.75;
    else if (
      isLosBlocked ||
      isLosA ||
      isLosB ||
      isLosPath ||
      selectedHexId === cell.id ||
      isSeed ||
      isVP
    )
      strokeOpacity = 1;
    else strokeOpacity = 0.6;

    return { ...cell, fill, fillOpacity, stroke, strokeWidth, strokeOpacity };
  });
});

// ── HexLabelLayer helper ──────────────────────────────────────────────────────

function hexLabelText(cell) {
  const cfg = props.overlayConfig.hexLabel;
  if (cfg) return cfg.labelFn?.(cell) ?? null;
  // calibration.active fallback: show hex ID without needing overlayConfig.hexLabel
  if (props.overlayConfig.diagnosticMode?.active) return cell.id;
  return null;
}

// ── HexIconLayer helper ───────────────────────────────────────────────────────

function hexIconText(cell) {
  const cfg = props.overlayConfig.hexIcon;
  return cfg?.iconFn?.(cell) ?? null;
}

// ── EdgeLineLayer + ThroughHexLayer pre-filtered data (#163, #169) ────────────
// Extracted into useEdgeLineLayer composable (#169). Invalidates only when cells
// or edgeLine config change — LOS/selection state changes do NOT invalidate it.
const { cellsForEdges, throughHexSegments } = useEdgeLineLayer(
  cells,
  computed(() => props.overlayConfig)
);

// ── Coordinate helper ─────────────────────────────────────────────────────────

function _toLocal(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  const { tx, ty } = gridData.value;
  return { localX: svgPt.x - tx, localY: svgPt.y - ty };
}

// ── Event handlers ────────────────────────────────────────────────────────────

function onSvgClick(event) {
  if (!props.interactionEnabled) return;
  // Edge clicks are handled by onSvgMouseDown / onSvgMouseMove to support drag-paint.
  if (props.edgeInteraction) return;
  const svg = event.currentTarget;
  const { localX, localY } = _toLocal(svg, event.clientX, event.clientY);
  const { grid } = gridData.value;
  const hex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
  if (hex) {
    const gridRows = props.calibration.rows > 0 ? props.calibration.rows : 35;
    const id = hexToGameId(hex, gridRows);
    emit('hex-click', id, event);
  }
}

function onSvgContextMenu(event) {
  if (!props.interactionEnabled) return;
  event.preventDefault();
  const svg = event.currentTarget;
  const { localX, localY } = _toLocal(svg, event.clientX, event.clientY);
  const { grid, cells: allCells, cellByColRow } = gridData.value;

  if (props.edgeInteraction) {
    const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : allCells;
    const nearest = findNearestEdge(localX, localY, searchCells, EDGE_SNAP_THRESHOLD_PX);
    if (nearest) emit('edge-right-click', nearest);
    return;
  }

  const hex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
  if (hex) {
    const gridRows = props.calibration.rows > 0 ? props.calibration.rows : 35;
    const id = hexToGameId(hex, gridRows);
    emit('hex-right-click', id, event);
  }
}

function onSvgMouseDown(event) {
  if (props.dragPaintEnabled) {
    isPaintMouseDown.value = true;
  }
  if (props.dragPaintEnabled && props.interactionEnabled) {
    emit('paint-stroke-start');
  }
  if (!props.edgeInteraction || !props.interactionEnabled) return;
  const svg = event.currentTarget;
  const { localX, localY } = _toLocal(svg, event.clientX, event.clientY);
  const { grid, cells: allCells, cellByColRow } = gridData.value;
  const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
  const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : allCells;
  // No tMargin — full edge length is clickable, including near vertices.
  const nearest = findNearestEdge(localX, localY, searchCells, EDGE_SNAP_THRESHOLD_PX);
  if (nearest) {
    emit('edge-click', {
      hexId: nearest.hexId,
      dir: nearest.dir,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }
}

// Snap threshold in pixels — maximum distance from cursor to an edge segment for it to
// be considered "snapped". Used in onSvgContextMenu, onSvgMouseDown, and onSvgMouseMove.
const EDGE_SNAP_THRESHOLD_PX = 6;

// rAF gate — true while a requestAnimationFrame is already queued for the edge-hover update.
// Prevents hoverInfo from being written on every raw mousemove event (#160).
let _edgeHoverRafPending = false;

function onSvgMouseMove(event) {
  if (!props.edgeInteraction) return;
  if (_edgeHoverRafPending) return;
  _edgeHoverRafPending = true;
  const svg = event.currentTarget;
  requestAnimationFrame(() => {
    _edgeHoverRafPending = false;
    const { localX, localY } = _toLocal(svg, event.clientX, event.clientY);
    const { grid, cells: allCells, cellByColRow } = gridData.value;
    const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : allCells;
    const gridRows = props.calibration.rows > 0 ? props.calibration.rows : 35;

    // Single findNearestEdge call (threshold=999 ≙ always find nearest).
    // dist ≤ EDGE_SNAP_THRESHOLD_PX determines snap — avoids a second O(cells×6) traversal (#159).
    const nearest = findNearestEdge(localX, localY, searchCells, 999);
    const nearestSnap = nearest && nearest.dist <= EDGE_SNAP_THRESHOLD_PX ? nearest : null;
    hoverInfo.value = {
      hexId: candidateHex ? hexToGameId(candidateHex, gridRows) : null,
      nearHexId: nearest?.hexId ?? null,
      nearDir: nearest?.dir ?? null,
      snapHexId: nearestSnap?.hexId ?? null,
      snapDir: nearestSnap?.dir ?? null,
      inProximity: !!nearestSnap,
      localX,
      localY,
    };
  });
}

function onSvgMouseUp() {
  if (isPaintMouseDown.value) {
    isPaintMouseDown.value = false;
    if (props.dragPaintEnabled && props.interactionEnabled) emit('paint-stroke-done');
  }
  hoverInfo.value = null;
}

// Gate hex-mouseenter: interaction must be enabled; in drag-paint mode also require mousedown.
function onHexMouseenter(hexId) {
  if (!props.interactionEnabled) return;
  if (props.dragPaintEnabled && !isPaintMouseDown.value) return;
  emit('hex-mouseenter', hexId);
}

// Exposed for test instrumentation only. gridGeometry is @internal — not intended
// for parent component consumption; the raw honeycomb Grid is an implementation detail.
defineExpose({ isPaintMouseDown, hoverInfo, gridGeometry });
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
    @mousemove.passive="onSvgMouseMove"
  >
    <g :transform="`translate(${gridData.tx},${gridData.ty})`">
      <g :transform="rotationTransform">
        <!-- HexGridLayer + HexFillLayer + HexHighlightLayer ─────────────────
             One polygon per hex carries fill (hexFill config), stroke (grid +
             highlight state), and the mouseenter event handler.             -->
        <g class="layer-grid">
          <polygon
            v-for="cell in cellsWithDisplayAttrs"
            :key="'hex-' + cell.id"
            :points="cell.points"
            :fill="cell.fill"
            :fill-opacity="cell.fillOpacity"
            :stroke="cell.stroke"
            :stroke-width="cell.strokeWidth"
            :stroke-opacity="cell.strokeOpacity"
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
                :points="cell.wedgePoints[(wi + 5) % 6]"
                :fill="wv > 0 ? 'white' : wv < 0 ? 'black' : 'transparent'"
                :fill-opacity="wv !== 0 ? 0.35 : 0"
                stroke="none"
                pointer-events="none"
              />
            </template>
          </template>
        </g>

        <!-- HexLabelLayer — hex ID or custom labels ─────────────────────────
             Renders when overlayConfig.hexLabel is set, or when
             overlayConfig.diagnosticMode.active is true (diagnostic mode).   -->
        <g
          v-if="overlayConfig.hexLabel || overlayConfig.diagnosticMode?.active"
          class="layer-hex-labels"
        >
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
             Uses cellsForEdges (computed) to avoid inline .filter() on each
             render. Only canonical faces 0/1/2 (N/NE/SE) are stored per hex;
             faces 3/4/5 live on the neighbour as face 0/1/2.               -->
        <g
          v-if="overlayConfig.edgeLine && overlayConfig.edgeLine.style !== 'through-hex'"
          class="layer-edge-lines"
        >
          <template v-for="cell in cellsForEdges" :key="'edges-' + cell.id">
            <template v-for="face in cell.edgeFaces" :key="face.dir">
              <template v-for="(gd, gi) in face.groups" :key="gi">
                <line
                  v-for="feat in gd.features"
                  :key="feat.type"
                  v-bind="face.lineAttrs"
                  :stroke="gd.group.color"
                  :stroke-width="gd.group.strokeWidth"
                  :stroke-dasharray="gd.group.dash ?? null"
                  stroke-linecap="round"
                  pointer-events="none"
                />
              </template>
            </template>
          </template>
        </g>

        <!-- ThroughHexLayer — road and trail features rendered centre→midpoint (#139) -->
        <g v-if="overlayConfig.edgeLine?.style === 'through-hex'" class="layer-through-hex-lines">
          <template v-for="cell in throughHexSegments" :key="'thru-' + cell.id">
            <template v-for="face in cell.edgeFaces" :key="face.dir">
              <template v-for="(gd, gi) in face.groups" :key="gi">
                <line
                  v-for="feat in gd.features"
                  :key="feat.type"
                  v-bind="face.lineAttrs"
                  :stroke="gd.group.color"
                  :stroke-width="gd.group.strokeWidth"
                  :stroke-dasharray="gd.group.dash ?? null"
                  stroke-linecap="round"
                  pointer-events="none"
                />
              </template>
            </template>
          </template>
        </g>

        <!-- EdgeHoverLayer — fuchsia highlight on the exact edge that will be painted -->
        <line
          v-if="hoverSnapCell && hoverInfo.snapDir && hoverInfo.inProximity"
          v-bind="edgeLine20_80(hoverSnapCell.corners, hoverInfo.snapDir)"
          stroke="#ff00ff"
          stroke-width="4"
          stroke-linecap="round"
          stroke-opacity="0.85"
          pointer-events="none"
        />

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

    <!-- EdgeHoverTooltip — SVG root coords (localX/Y + grid translation offset) -->
    <g v-if="hoverInfo && edgeInteraction" pointer-events="none">
      <rect
        :x="hoverInfo.localX + gridData.tx + 10"
        :y="hoverInfo.localY + gridData.ty - 22"
        width="190"
        height="18"
        rx="2"
        fill="rgba(0,0,0,0.82)"
        :stroke="hoverInfo.inProximity ? '#ff00ff' : '#555555'"
        stroke-width="1"
      />
      <text
        :x="hoverInfo.localX + gridData.tx + 14"
        :y="hoverInfo.localY + gridData.ty - 9"
        font-size="10"
        font-family="monospace"
        :fill="hoverInfo.inProximity ? '#ff66ff' : '#e0d8c8'"
      >
        hex:{{ hoverInfo.hexId ?? '—' }} edge:{{
          hoverInfo.nearHexId
            ? `${hoverInfo.nearHexId}:${geoLabelMap[hoverInfo.nearDir] ?? hoverInfo.nearDir}`
            : '—'
        }}{{ hoverInfo.inProximity ? ' ●' : '' }}
      </text>
    </g>

    <!-- Arrow marker definition -->
    <defs>
      <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#ffaa44" />
      </marker>
    </defs>
  </svg>
</template>
