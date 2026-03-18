<script setup>
defineProps({
  selectedHex: {
    type: Object,
    default: null,
  },
  elevationLevels: {
    type: Number,
    default: 22,
  },
});

const emit = defineEmits(['clear-all-elevations', 'raise-all', 'lower-all']);
</script>

<template>
  <div class="elevation-tool-panel">
    <div class="tool-hint">Click hex to raise (+1). Right-click to lower (−1).</div>

    <div v-if="selectedHex" class="selected-hex-info">
      <span class="hex-id">{{ selectedHex.hex }}</span>
      <span class="hex-elev">Elev: {{ selectedHex.elevation ?? 0 }}</span>
      <span class="hex-elev-max">(max: {{ elevationLevels - 1 }})</span>
    </div>
    <div v-else class="no-selection">No hex selected</div>

    <div class="bulk-buttons">
      <button class="bulk-btn" @click="emit('raise-all')">Raise all +1</button>
      <button class="bulk-btn" @click="emit('lower-all')">Lower all −1</button>
      <button class="bulk-btn danger-btn" @click="emit('clear-all-elevations')">
        Clear all elevations
      </button>
    </div>
  </div>
</template>

<style scoped>
.elevation-tool-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #222;
  font-size: 0.85rem;
}

.tool-hint {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}

.selected-hex-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  background: #1a2a1a;
  border: 1px solid #3a5a3a;
}

.hex-id {
  font-weight: bold;
  color: #ffdd00;
}

.hex-elev {
  color: #7aab3e;
}

.hex-elev-max {
  color: #666;
  font-size: 0.75rem;
}

.no-selection {
  color: #666;
  font-size: 0.8rem;
  text-align: center;
  padding: 0.5rem;
}

.bulk-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.bulk-btn {
  padding: 0.3rem 0.6rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}

.bulk-btn:hover {
  background: #3a3a3a;
}

.danger-btn {
  background: #3a1a1a;
  border-color: #7a3333;
  color: #c08080;
}

.danger-btn:hover {
  background: #4a2020;
}
</style>
