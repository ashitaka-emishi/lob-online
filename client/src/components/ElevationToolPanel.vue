<script setup>
import BaseToolPanel from './BaseToolPanel.vue';

const HELP_TEXT =
  'Click or drag to raise elevation (+1). Right-click to lower (−1). ' +
  'Use Raise all / Lower all to shift the entire map by one level.';

// overlayConfig is passed down from MapEditorView and forwarded to BaseToolPanel
// so that BaseToolPanel can render toggle checkboxes for any non-alwaysOn layers.
// The full elevation-tool overlayConfig (with fillFn) is implemented in #137.
defineProps({
  selectedHex: {
    type: Object,
    default: null,
  },
  elevationLevels: {
    type: Number,
    default: 22,
  },
  paintMode: {
    type: String,
    default: 'click',
  },
  overlayConfig: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['clear-all-elevations', 'raise-all', 'lower-all', 'paint-mode-change']);
</script>

<template>
  <BaseToolPanel
    :overlay-config="overlayConfig"
    :help-text="HELP_TEXT"
    @clear-all="emit('clear-all-elevations')"
  >
    <div class="mode-toggle">
      <button
        class="mode-btn"
        :class="{ active: paintMode === 'click' }"
        @click="emit('paint-mode-change', 'click')"
      >
        Click
      </button>
      <button
        class="mode-btn"
        :class="{ active: paintMode === 'paint' }"
        @click="emit('paint-mode-change', 'paint')"
      >
        Paint
      </button>
    </div>
    <div class="tool-hint">
      <template v-if="paintMode === 'paint'"
        >Drag to raise (+1) continuously. Right-click to lower (−1).</template
      >
      <template v-else>Click to raise (+1). Right-click to lower (−1).</template>
    </div>

    <div v-if="selectedHex" class="selected-hex-info">
      <span class="hex-id">{{ selectedHex.hex }}</span>
      <span class="hex-elev">Elev: {{ selectedHex.elevation ?? 0 }}</span>
      <span class="hex-elev-max">(max: {{ elevationLevels - 1 }})</span>
    </div>
    <div v-else class="no-selection">No hex selected</div>

    <div class="bulk-buttons">
      <button class="bulk-btn" @click="emit('raise-all')">Raise all +1</button>
      <button class="bulk-btn" @click="emit('lower-all')">Lower all −1</button>
    </div>
  </BaseToolPanel>
</template>

<style scoped>
.mode-toggle {
  display: flex;
  gap: 0.25rem;
}

.mode-btn {
  flex: 1;
  padding: 0.25rem 0.4rem;
  background: #333;
  border: 1px solid #555;
  color: #a09880;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: inherit;
}

.mode-btn:hover {
  background: #3a3a3a;
}

.mode-btn.active {
  background: #3a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
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
</style>
