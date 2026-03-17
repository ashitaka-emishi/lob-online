<script setup>
import { computed } from 'vue';
import { defineHex, Grid, rectangle, Orientation } from 'honeycomb-grid';
import {
  DIRS,
  edgeMidpoint,
  edgeLine20_80,
  wedgePolygonPoints,
  getEdgeLabels,
  findNearestEdge,
  getCellAndNeighbors,
} from '../utils/hexGeometry.js';

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
  layers: {
    type: Object,
    default: () => ({
      grid: true,
      terrain: true,
      elevation: false,
      wedges: false,
      edges: true,
      slopeArrows: false,
    }),
  },
  editorMode: {
    type: String,
    default: 'select',
  },
  paintTerrain: {
    type: String,
    default: 'clear',
  },
  seedHexIds: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  'hex-click',
  'hex-mouseenter',
  'hex-mouseleave',
  'edge-click',
  'edge-hover',
]);

const TERRAIN_COLORS = {
  clear: '#c8d4a0',
  woods: '#4a7c4e',
  slopingGround: '#c8b88a',
  woodedSloping: '#5a7a3a',
  orchard: '#8fbb6d',
  marsh: '#7aab9e',
  unknown: '#cccccc',
};

const EDGE_COLORS = {
  road: '#8B6914',
  stream: '#4488aa',
  stoneWall: '#888',
  slope: '#cc8844',
  extremeSlope: '#aa5500',
  verticalSlope: '#cc2222',
};

function edgeColor(type) {
  return EDGE_COLORS[type] ?? '#999';
}

// Index known hexes by id for O(1) lookup
const hexIndex = computed(() => {
  const idx = {};
  for (const h of props.hexes) {
    idx[h.hex] = h;
  }
  return idx;
});

const vpHexSet = computed(() => new Set(props.vpHexIds));
const losPathSet = computed(() => new Set(props.losPathHexes));
const seedHexSet = computed(() => new Set(props.seedHexIds));

// Recompute grid whenever calibration or image size changes
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
    const gameCol = hex.col + 1;
    const gameRow = gridRows - hex.row - (gameCol % 2 === 0 ? 1 : 0);
    const id = `${String(gameCol).padStart(2, '0')}.${String(gameRow).padStart(2, '0')}`;
    const known = hexIndex.value[id];
    const terrain = known?.terrain ?? 'unknown';
    const fill = TERRAIN_COLORS[terrain] ?? '#cccccc';
    const fillOpacity = terrain === 'unknown' ? 0.3 : 0.45;
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
      fill,
      fillOpacity,
      terrain,
      elevation: known?.elevation ?? null,
      slope,
      wedgeElevations: known?.wedgeElevations ?? null,
      edges: known?.edges ?? {},
      features: known?.features ?? [],
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
  return { cells, grid, tx, ty, cellByColRow };
});

const cells = computed(() => gridData.value.cells);

// SVG rotation transform (applied inside the translate group)
const rotationTransform = computed(() => {
  const deg = props.calibration.rotation;
  if (!deg) return '';
  return `rotate(${deg})`;
});

function strokeForCell(cell) {
  if (props.calibrationMode) return '#cc88ff';
  if (cell.isLosBlocked) return '#cc4444';
  if (cell.isLosA) return '#44aa44';
  if (cell.isLosB) return '#4488cc';
  if (cell.isLosPath) return '#cc8844';
  if (props.selectedHexId === cell.id) return '#ffdd00';
  if (cell.isSeed) return '#cc44ee';
  if (cell.isVP) return '#cc3333';
  return '#88776644';
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

function onSvgClick(event) {
  const svg = event.currentTarget;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

  const { grid, tx, ty, cells, cellByColRow } = gridData.value;
  const localX = svgPt.x - tx;
  const localY = svgPt.y - ty;

  if (props.editorMode === 'edge') {
    const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : cells;
    const nearest = findNearestEdge(localX, localY, searchCells);
    if (nearest) emit('edge-click', nearest);
  } else {
    const hex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    if (hex) {
      const gridRows = props.calibration.rows > 0 ? props.calibration.rows : 35;
      const gameCol = hex.col + 1;
      const gameRow = gridRows - hex.row - (gameCol % 2 === 0 ? 1 : 0);
      const id = `${String(gameCol).padStart(2, '0')}.${String(gameRow).padStart(2, '0')}`;
      emit('hex-click', id, event);
    }
  }
}

let rafPending = false;

function onSvgMouseMove(event) {
  if (!props.layers?.edges) return;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const svg = event.currentTarget;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const { grid, tx, ty, cells, cellByColRow } = gridData.value;
    const localX = svgPt.x - tx;
    const localY = svgPt.y - ty;

    const candidateHex = grid.pointToHex({ x: localX, y: localY }, { allowOutside: false });
    const searchCells = candidateHex ? getCellAndNeighbors(candidateHex, cellByColRow) : cells;
    emit('edge-hover', findNearestEdge(localX, localY, searchCells));
  });
}
</script>

<template>
  <svg
    :width="imageWidth * calibration.imageScale"
    :height="imageHeight * calibration.imageScale"
    style="position: absolute; top: 0; left: 0; cursor: crosshair"
    @click="onSvgClick"
    @mousemove="onSvgMouseMove"
  >
    <g :transform="`translate(${gridData.tx},${gridData.ty})`">
      <g :transform="rotationTransform">
        <!-- 1. Terrain fills -->
        <g class="layer-terrain">
          <polygon
            v-for="cell in cells"
            :key="'terrain-' + cell.id"
            :points="cell.points"
            :fill="layers.terrain ? (cell.isLosBlocked ? '#cc4444' : cell.fill) : 'none'"
            :fill-opacity="layers.terrain ? (cell.isLosBlocked ? 0.5 : cell.fillOpacity) : 0"
            :stroke="strokeForCell(cell)"
            :stroke-width="strokeWidthForCell(cell)"
            :stroke-opacity="strokeOpacityForCell(cell)"
            @mouseenter="emit('hex-mouseenter', cell.id)"
            @mouseleave="emit('hex-mouseleave', cell.id)"
          />
        </g>

        <!-- 2. Wedge shading (sub-hex elevation) -->
        <g v-if="layers.wedges" class="layer-wedges">
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

        <!-- 3. Grid (polygon outlines only — already rendered via terrain stroke above) -->
        <!-- Labels (shown when grid layer is on) -->
        <g v-if="layers.grid" class="layer-labels">
          <text
            v-for="cell in cells"
            :key="'lbl-' + cell.id"
            :x="cell.cx"
            :y="cell.cy"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="0.78rem"
            fill="#00008b"
            fill-opacity="0.85"
            pointer-events="none"
          >
            {{ cell.id }}
          </text>
        </g>

        <!-- 4. Elevation labels -->
        <g v-if="layers.elevation" class="layer-elevation">
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

        <!-- 5. Edge feature lines -->
        <g v-if="layers.edges" class="layer-edges">
          <template v-for="cell in cells" :key="'edges-' + cell.id">
            <template v-for="dir in DIRS" :key="dir">
              <template v-if="cell.edges && cell.edges[dir] && cell.edges[dir].length">
                <line
                  v-for="(feat, fi) in cell.edges[dir]"
                  :key="fi"
                  v-bind="edgeLine20_80(cell.corners, dir)"
                  :stroke="edgeColor(feat.type)"
                  stroke-width="2"
                  stroke-linecap="round"
                  pointer-events="none"
                />
              </template>
            </template>
          </template>
        </g>

        <!-- 6. Slope arrows -->
        <g v-if="layers.slopeArrows" class="layer-slope-arrows">
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
