<script setup>
import { ref, computed, watch } from 'vue';
import BaseToolPanel from './BaseToolPanel.vue';
import { elevationTintPalette, tintForLevel } from '../formulas/elevation.js';

// Stable function references — defined once per component instance (not per computed
// recomputation) so Vue's dependency tracking doesn't see spurious identity changes.
const _labelFn = (hex) => String(hex.elevation ?? 0);
const _nullFillFn = () => null;

const HELP_TEXT =
  'Set a target elevation with the slider, then click or drag to paint that value. ' +
  'Right-click to clear (set to 0). Use Raise all / Lower all to shift the entire map.';

const props = defineProps({
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
  targetElevation: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits([
  'clear-all-elevations',
  'raise-all',
  'lower-all',
  'paint-mode-change',
  'overlay-config',
  'target-elevation-change',
]);

// ── Target elevation slider ────────────────────────────────────────────────────
// targetElevation is owned by the parent (MapEditorView) and passed as a prop.
// The slider emits target-elevation-change so the parent can update its ref.

function onSliderChange(event) {
  emit('target-elevation-change', Number(event.target.value));
}

// ── Overlay config ────────────────────────────────────────────────────────────

const tintEnabled = ref(true);

const palette = computed(() => elevationTintPalette(props.elevationLevels));

// Stable tint fillFn: recomputes only when palette changes (not on every ownOverlayConfig
// recomputation), giving downstream watchers a stable function reference.
const _tintFillFn = computed(() => {
  const p = palette.value;
  return (hex) => tintForLevel(hex.elevation ?? 0, p);
});

const ownOverlayConfig = computed(() => ({
  hexLabel: { alwaysOn: true, labelFn: _labelFn, size: 'large' },
  hexFill: {
    alwaysOn: false,
    toggleLabel: 'Elevation tint',
    fillFn: tintEnabled.value ? _tintFillFn.value : _nullFillFn,
  },
}));

// Emit whenever the config changes so MapEditorView can pass it to HexMapOverlay.
watch(ownOverlayConfig, (cfg) => emit('overlay-config', cfg), { immediate: true });

function onOverlayToggle(key) {
  if (key === 'hexFill') tintEnabled.value = !tintEnabled.value;
}
</script>

<template>
  <BaseToolPanel
    :overlay-config="ownOverlayConfig"
    :help-text="HELP_TEXT"
    @overlay-toggle="onOverlayToggle"
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
    <div class="elevation-slider">
      <label class="slider-label">Target: {{ targetElevation }}</label>
      <input
        type="range"
        class="slider-input"
        :min="0"
        :max="elevationLevels - 1"
        :value="targetElevation"
        @input="onSliderChange"
      />
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

.elevation-slider {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.slider-label {
  font-size: 0.8rem;
  color: #7aab3e;
}

.slider-input {
  width: 100%;
  accent-color: #7aab3e;
  cursor: pointer;
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
