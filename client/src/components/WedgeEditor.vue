<script setup>
import { ref } from 'vue';

const props = defineProps({
  wedgeElevations: {
    type: Array,
    default: () => [0, 0, 0, 0, 0, 0],
  },
});

const emit = defineEmits(['update:wedgeElevations']);

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 80;
const WEDGE_DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

// Compute 6 corners for a flat-top hexagon centred at (CX, CY) with RADIUS.
// Corner i is at angle i*60° (starting East=0°).
function getCorners() {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    corners.push({
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle),
    });
  }
  return corners;
}

const corners = getCorners();

function wedgePoints(i) {
  const a = corners[i];
  const b = corners[(i + 1) % 6];
  return `${CX},${CY} ${a.x},${a.y} ${b.x},${b.y}`;
}

function wedgeFill(i) {
  const v = props.wedgeElevations[i] ?? 0;
  if (v > 0) return 'white';
  if (v < 0) return 'black';
  return 'transparent';
}

function wedgeFillOpacity(i) {
  const v = props.wedgeElevations[i] ?? 0;
  return v !== 0 ? 0.35 : 0;
}

function wedgeCentre(i) {
  const a = corners[i];
  const b = corners[(i + 1) % 6];
  return {
    x: (CX + a.x + b.x) / 3,
    y: (CY + a.y + b.y) / 3,
  };
}

const editingWedge = ref(null);
const editValue = ref('');

function startEdit(i) {
  editingWedge.value = i;
  editValue.value = String(props.wedgeElevations[i] ?? 0);
}

function confirmEdit(i) {
  const newElev = [...props.wedgeElevations];
  newElev[i] = Number(editValue.value);
  emit('update:wedgeElevations', newElev);
  editingWedge.value = null;
  editValue.value = '';
}

function cancelEdit() {
  editingWedge.value = null;
  editValue.value = '';
}
</script>

<template>
  <div class="wedge-editor">
    <svg :width="SIZE" :height="SIZE" class="wedge-svg">
      <!-- Background hex outline -->
      <polygon
        :points="corners.map((c) => `${c.x},${c.y}`).join(' ')"
        fill="none"
        stroke="#555"
        stroke-width="1"
      />

      <!-- Wedge fills (6 triangles) -->
      <polygon
        v-for="i in 6"
        :key="'wedge-' + (i - 1)"
        :points="wedgePoints(i - 1)"
        :fill="wedgeFill(i - 1)"
        :fill-opacity="wedgeFillOpacity(i - 1)"
        stroke="#555"
        stroke-width="0.5"
        style="cursor: pointer"
        @click="startEdit(i - 1)"
      />

      <!-- Wedge labels -->
      <text
        v-for="(v, i) in wedgeElevations"
        :key="'label-' + i"
        :x="wedgeCentre(i).x"
        :y="wedgeCentre(i).y"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="11"
        fill="#e0d8c8"
        pointer-events="none"
      >
        {{ v ?? 0 }}
      </text>

      <!-- Direction labels near perimeter -->
      <text
        v-for="(dir, i) in WEDGE_DIRS"
        :key="'dir-' + i"
        :x="CX + (RADIUS + 12) * Math.cos((Math.PI / 3) * i + Math.PI / 6)"
        :y="CY + (RADIUS + 12) * Math.sin((Math.PI / 3) * i + Math.PI / 6)"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="9"
        fill="#888"
        pointer-events="none"
      >
        {{ dir }}
      </text>
    </svg>

    <!-- Inline edit form -->
    <div v-if="editingWedge !== null" class="wedge-input-row">
      <span class="wedge-input-label">
        Wedge {{ WEDGE_DIRS[editingWedge] }} elevation offset:
      </span>
      <input
        v-model="editValue"
        type="number"
        class="wedge-input"
        @blur="confirmEdit(editingWedge)"
        @keyup.enter="confirmEdit(editingWedge)"
        @keyup.escape="cancelEdit"
      />
    </div>
  </div>
</template>

<style scoped>
.wedge-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.wedge-svg {
  display: block;
}

.wedge-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #a09880;
}

.wedge-input-label {
  white-space: nowrap;
}

.wedge-input {
  width: 70px;
  background: #1a1a1a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.2rem 0.4rem;
  font-size: 0.85rem;
}
</style>
