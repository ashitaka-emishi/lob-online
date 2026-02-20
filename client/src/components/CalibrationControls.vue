<script setup>
const props = defineProps({
  calibration: {
    type: Object,
    required: true,
  },
  calibrationMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['calibration-change', 'toggle-calibration-mode']);

function update(field, value) {
  emit('calibration-change', { ...props.calibration, [field]: Number(value) });
}

function toggleOrientation() {
  const next = props.calibration.orientation === 'pointy' ? 'flat' : 'pointy';
  emit('calibration-change', { ...props.calibration, orientation: next });
}

function toggleEvenColUp() {
  emit('calibration-change', { ...props.calibration, evenColUp: !props.calibration.evenColUp });
}
</script>

<template>
  <div class="calibration-controls">
    <label>
      Grid Cols
      <input type="number" :value="calibration.cols" @input="update('cols', $event.target.value)" step="1" min="1" />
    </label>
    <label>
      Grid Rows
      <input type="number" :value="calibration.rows" @input="update('rows', $event.target.value)" step="1" min="1" />
    </label>
    <label>
      Offset X (dx)
      <input type="number" :value="calibration.dx" @input="update('dx', $event.target.value)" step="1" />
    </label>
    <label>
      Offset Y from bottom (dy)
      <input type="number" :value="calibration.dy" @input="update('dy', $event.target.value)" step="1" />
    </label>
    <label>
      Hex Width (xRadius)
      <input type="number" :value="calibration.hexWidth" @input="update('hexWidth', $event.target.value)" step="0.5" min="5" max="100" />
    </label>
    <label>
      Hex Height (yRadius)
      <input type="number" :value="calibration.hexHeight" @input="update('hexHeight', $event.target.value)" step="0.5" min="5" max="100" />
    </label>
    <label>
      Image Scale
      <input type="number" :value="calibration.imageScale" @input="update('imageScale', $event.target.value)" step="0.01" min="0.1" max="5" />
    </label>
    <label>
      Line Width
      <input type="number" :value="calibration.strokeWidth" @input="update('strokeWidth', $event.target.value)" step="0.1" min="0.1" max="5" />
    </label>
    <button @click="toggleOrientation">
      {{ calibration.orientation === 'flat' ? 'Flat-top' : 'Pointy-top' }} ⇌
    </button>
    <button @click="$emit('toggle-calibration-mode')" :class="{ active: calibrationMode }">
      {{ calibrationMode ? 'Labels ON' : 'Labels OFF' }}
    </button>
    <button @click="toggleEvenColUp" :class="{ active: calibration.evenColUp }">
      Even Col ↑
    </button>
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

input[type="number"] {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.2rem 0.3rem;
  font-size: 0.85rem;
  box-sizing: border-box;
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
