<script setup>
import { computed } from 'vue';
import { defineHex, Grid, rectangle, Orientation } from 'honeycomb-grid';

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
});

const emit = defineEmits(['hex-click']);

const TERRAIN_COLORS = {
  clear: '#c8d4a0',
  woods: '#4a7c4e',
  slopingGround: '#c8b88a',
  woodedSloping: '#5a7a3a',
  orchard: '#8fbb6d',
  marsh: '#7aab9e',
  unknown: 'transparent',
};

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

  // Anchor hex: col=0, row=gridRows-1 is the lower-left game hex (01.01)
  const anchorHex = grid.getHex({ col: 0, row: gridRows - 1 });
  const tx = dx - anchorHex.x;
  const ty = props.imageHeight * imageScale - dy - anchorHex.y;

  const cells = [];
  grid.forEach((hex) => {
    const corners = hex.corners;
    const points = corners.map((c) => `${c.x},${c.y}`).join(' ');
    const cx = hex.x;
    const cy = hex.y;
    const gameCol = hex.col + 1;
    const gameRow = gridRows - hex.row;
    const id = `${String(gameCol).padStart(2, '0')}.${String(gameRow).padStart(2, '0')}`;
    const known = hexIndex.value[id];
    const terrain = known?.terrain ?? 'unknown';
    const fill = TERRAIN_COLORS[terrain] ?? 'transparent';
    const isVP = vpHexSet.value.has(id);
    const isLosA = id === props.losHexA;
    const isLosB = id === props.losHexB;
    const isLosPath = losPathSet.value.has(id);
    const isLosBlocked = id === props.losBlockedHex;
    cells.push({ id, points, cx, cy, fill, isVP, isLosA, isLosB, isLosPath, isLosBlocked });
  });

  const visible = cells.filter(
    (cell) =>
      props.calibrationMode ||
      cell.isVP ||
      cell.id === props.selectedHexId ||
      cell.isLosA ||
      cell.isLosB ||
      cell.isLosPath ||
      cell.isLosBlocked
  );

  return { cells: visible, grid, tx, ty };
});

const cells = computed(() => gridData.value.cells);

function onSvgClick(event) {
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
    const gameCol = hex.col + 1;
    const gameRow = gridRows - hex.row;
    const id = `${String(gameCol).padStart(2, '0')}.${String(gameRow).padStart(2, '0')}`;
    emit('hex-click', id);
  }
}
</script>

<template>
  <svg
    :width="imageWidth * calibration.imageScale"
    :height="imageHeight * calibration.imageScale"
    style="position: absolute; top: 0; left: 0; cursor: crosshair"
    @click="onSvgClick"
  >
    <g :transform="`translate(${gridData.tx},${gridData.ty})`">
      <polygon
        v-for="cell in cells"
        :key="cell.id"
        :points="cell.points"
        :fill="cell.isLosBlocked ? '#cc4444' : cell.fill"
        :fill-opacity="cell.isLosBlocked ? 0.5 : cell.fill === 'transparent' ? 0 : 0.45"
        :stroke="
          calibrationMode
            ? '#cc88ff'
            : cell.isLosBlocked
              ? '#cc4444'
              : cell.isLosA
                ? '#44aa44'
                : cell.isLosB
                  ? '#4488cc'
                  : cell.isLosPath
                    ? '#cc8844'
                    : selectedHexId === cell.id
                      ? '#ffdd00'
                      : cell.isVP
                        ? '#cc3333'
                        : '#88776644'
        "
        :stroke-width="
          calibrationMode
            ? calibration.strokeWidth
            : cell.isLosBlocked || cell.isLosA || cell.isLosB || cell.isLosPath
              ? Math.max(calibration.strokeWidth * 2.5, 2)
              : selectedHexId === cell.id
                ? Math.max(calibration.strokeWidth * 3, 2)
                : cell.isVP
                  ? Math.max(calibration.strokeWidth * 2, 1.5)
                  : calibration.strokeWidth
        "
        :stroke-opacity="
          calibrationMode
            ? 0.75
            : cell.isLosBlocked ||
                cell.isLosA ||
                cell.isLosB ||
                cell.isLosPath ||
                selectedHexId === cell.id ||
                cell.isVP
              ? 1
              : 0.6
        "
      />
      <template v-if="calibrationMode">
        <text
          v-for="cell in cells"
          :key="'lbl-' + cell.id"
          :x="cell.cx"
          :y="cell.cy"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="7"
          fill="#ffdd00"
          fill-opacity="0.85"
          pointer-events="none"
        >
          {{ cell.id }}
        </text>
      </template>
    </g>
  </svg>
</template>
