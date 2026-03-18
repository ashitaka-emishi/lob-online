<script setup>
import { computed } from 'vue';
import ElevationSystemControls from './ElevationSystemControls.vue';

const props = defineProps({
  calibration: {
    type: Object,
    required: true,
  },
  calibrationMode: {
    type: Boolean,
    default: false,
  },
  elevationSystem: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  'calibration-change',
  'toggle-calibration-mode',
  'elevation-system-change',
]);

function update(field, value) {
  emit('calibration-change', { ...props.calibration, [field]: Number(value) });
}

// 12-position hex picker for northOffset
// Positions 0–11 going clockwise from top (geometric-N edge).
// Even positions = edge midpoints; odd positions = vertices.
// Coordinates are relative to SVG centre (50, 45); R=28 circumradius.
const R = 28;
const Rin = (R * Math.sqrt(3)) / 2; // inradius ≈ 24.25
const PICKER_POSITIONS = [
  { x: 0, y: -Rin }, // 0: N edge (top)
  { x: R / 2, y: (-R * Math.sqrt(3)) / 2 }, // 1: upper-right vertex
  { x: (R * 3) / 4, y: -Rin / 2 }, // 2: NE edge
  { x: R, y: 0 }, // 3: right vertex (E)
  { x: (R * 3) / 4, y: Rin / 2 }, // 4: SE edge
  { x: R / 2, y: Rin }, // 5: lower-right vertex
  { x: 0, y: Rin }, // 6: S edge (bottom)
  { x: -R / 2, y: Rin }, // 7: lower-left vertex
  { x: (-R * 3) / 4, y: Rin / 2 }, // 8: SW edge
  { x: -R, y: 0 }, // 9: left vertex (W)
  { x: (-R * 3) / 4, y: -Rin / 2 }, // 10: NW edge
  { x: -R / 2, y: -Rin }, // 11: upper-left vertex
];
const HEX_CORNERS = [
  { x: R, y: 0 },
  { x: R / 2, y: Rin },
  { x: -R / 2, y: Rin },
  { x: -R, y: 0 },
  { x: -R / 2, y: -Rin },
  { x: R / 2, y: -Rin },
];
const hexPoints = HEX_CORNERS.map((c) => `${c.x},${c.y}`).join(' ');

const CARD_LABELS_HEX = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const LABEL_SCALE = 1.65;

const cardinalLabelPositions = computed(() => {
  const n = props.calibration.northOffset ?? 0;
  return PICKER_POSITIONS.filter((_, i) => i % 2 === 0).map((pos, idx) => {
    const p = idx * 2;
    const steps = Math.floor(((p - n + 12) % 12) / 2) % 6;
    return { x: pos.x * LABEL_SCALE, y: pos.y * LABEL_SCALE, label: CARD_LABELS_HEX[steps] };
  });
});

function setNorthOffset(n) {
  if (props.calibration.locked) return;
  emit('calibration-change', { ...props.calibration, northOffset: n });
}

function toggleOrientation() {
  const next = props.calibration.orientation === 'pointy' ? 'flat' : 'pointy';
  emit('calibration-change', { ...props.calibration, orientation: next });
}

function toggleEvenColUp() {
  emit('calibration-change', { ...props.calibration, evenColUp: !props.calibration.evenColUp });
}

function toggleLocked() {
  emit('calibration-change', { ...props.calibration, locked: !props.calibration.locked });
}
</script>

<template>
  <div class="calibration-controls">
    <label>
      Grid Cols
      <input
        type="number"
        step="1"
        min="1"
        :value="calibration.cols"
        :disabled="calibration.locked ?? false"
        @input="update('cols', $event.target.value)"
      />
    </label>
    <label>
      Grid Rows
      <input
        type="number"
        step="1"
        min="1"
        :value="calibration.rows"
        :disabled="calibration.locked ?? false"
        @input="update('rows', $event.target.value)"
      />
    </label>
    <label>
      Offset X (dx)
      <input
        type="number"
        step="1"
        :value="calibration.dx"
        :disabled="calibration.locked ?? false"
        @input="update('dx', $event.target.value)"
      />
    </label>
    <label>
      Offset Y from bottom (dy)
      <input
        type="number"
        step="1"
        :value="calibration.dy"
        :disabled="calibration.locked ?? false"
        @input="update('dy', $event.target.value)"
      />
    </label>
    <label>
      Hex Width (xRadius)
      <input
        type="number"
        step="0.5"
        min="5"
        max="100"
        :value="calibration.hexWidth"
        :disabled="calibration.locked ?? false"
        @input="update('hexWidth', $event.target.value)"
      />
    </label>
    <label>
      Hex Height (yRadius)
      <input
        type="number"
        step="0.5"
        min="5"
        max="100"
        :value="calibration.hexHeight"
        :disabled="calibration.locked ?? false"
        @input="update('hexHeight', $event.target.value)"
      />
    </label>
    <label>
      Image Scale
      <input
        type="number"
        step="0.01"
        min="0.1"
        max="5"
        :value="calibration.imageScale"
        :disabled="calibration.locked ?? false"
        @input="update('imageScale', $event.target.value)"
      />
    </label>
    <label>
      Line Width
      <input
        type="number"
        step="0.1"
        min="0.1"
        max="5"
        :value="calibration.strokeWidth"
        :disabled="calibration.locked ?? false"
        @input="update('strokeWidth', $event.target.value)"
      />
    </label>
    <label>
      Rotation (°)
      <input
        type="number"
        step="0.5"
        min="-15"
        max="15"
        :value="calibration.rotation ?? 0"
        :disabled="calibration.locked ?? false"
        @input="update('rotation', $event.target.value)"
      />
    </label>
    <div class="north-picker-label">North Offset (0–11)</div>
    <div class="north-picker" :class="{ 'north-picker--locked': calibration.locked }">
      <svg width="100" height="90" class="north-picker-svg">
        <g transform="translate(50,45)">
          <polygon :points="hexPoints" fill="none" stroke="#555" stroke-width="1" />
          <circle
            v-for="(pos, n) in PICKER_POSITIONS"
            :key="n"
            :cx="pos.x"
            :cy="pos.y"
            :r="n % 2 === 0 ? 5 : 4"
            :fill="(calibration.northOffset ?? 0) === n ? '#ffdd00' : '#444'"
            :stroke="(calibration.northOffset ?? 0) === n ? '#ffaa00' : '#666'"
            stroke-width="1"
            :style="calibration.locked ? 'cursor:default' : 'cursor:pointer'"
            :data-north-offset="n"
            @click="setNorthOffset(n)"
          />
          <text
            v-for="(lp, i) in cardinalLabelPositions"
            :key="'cardinal-' + i"
            :x="lp.x"
            :y="lp.y"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="7"
            fill="#6aaa88"
            pointer-events="none"
          >
            {{ lp.label }}
          </text>
          <text
            x="0"
            y="0"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8"
            fill="#888"
            pointer-events="none"
          >
            N={{ calibration.northOffset ?? 0 }}
          </text>
        </g>
      </svg>
    </div>
    <ElevationSystemControls
      :elevation-system="elevationSystem"
      :locked="calibration.locked ?? false"
      @elevation-system-change="$emit('elevation-system-change', $event)"
    />
    <button :class="{ active: calibration.locked }" @click="toggleLocked">
      {{ calibration.locked ? 'Locked 🔒' : 'Lock' }}
    </button>
    <button @click="toggleOrientation">
      {{ calibration.orientation === 'flat' ? 'Flat-top' : 'Pointy-top' }} ⇌
    </button>
    <button :class="{ active: calibrationMode }" @click="$emit('toggle-calibration-mode')">
      {{ calibrationMode ? 'Labels ON' : 'Labels OFF' }}
    </button>
    <button :class="{ active: calibration.evenColUp }" @click="toggleEvenColUp">Even Col ↑</button>
  </div>
</template>

<style scoped>
.calibration-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.6rem;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
}

label {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: #a09880;
  gap: 0.15rem;
}

input[type='number'] {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.2rem 0.3rem;
  font-size: 0.85rem;
  box-sizing: border-box;
}

.north-picker-label {
  font-size: 0.75rem;
  color: #a09880;
}

.north-picker {
  display: flex;
  justify-content: center;
}

.north-picker--locked .north-picker-svg {
  opacity: 0.4;
}

.north-picker-svg {
  display: block;
}

button {
  padding: 0.3rem 0.75rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.8rem;
}

button.active {
  background: #4a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

button:hover {
  background: #3a3a3a;
}
</style>
