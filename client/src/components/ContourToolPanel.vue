<script setup>
import { ref, computed, watch } from 'vue';
import BaseToolPanel from './BaseToolPanel.vue';
import { CONTOUR_GROUPS } from '../config/feature-types.js';
import { elevationTintPalette, tintForLevel } from '../formulas/elevation.js';

const CONTOUR_TYPES = ['elevation', 'slope', 'extremeSlope', 'verticalSlope'];

const HELP_TEXT =
  'Click an edge to paint the selected contour type. Right-click to remove it. ' +
  'Toggle "Elevation info" to see elevation levels and gradient while editing. ' +
  'Use Auto-detect to derive contour types from adjacent elevation differences.';

const props = defineProps({
  selectedType: {
    type: String,
    default: 'elevation',
  },
  elevationLevels: {
    type: Number,
    default: 22,
  },
});

const emit = defineEmits([
  'type-change',
  'edge-paint',
  'edge-clear',
  'edge-clear-all',
  'auto-detect-contours',
  'overlay-config',
]);

// ── Elevation info toggle ───────────────────────────────────────────────────

const elevationInfoEnabled = ref(false);

const palette = computed(() => elevationTintPalette(props.elevationLevels));

function onOverlayToggle(key) {
  if (key === 'hexFill') elevationInfoEnabled.value = !elevationInfoEnabled.value;
}

// ── Auto-detect confirmation ────────────────────────────────────────────────

const showAutoDetectConfirm = ref(false);

function onAutoDetectClick() {
  showAutoDetectConfirm.value = true;
}

function onAutoDetectConfirm() {
  showAutoDetectConfirm.value = false;
  emit('auto-detect-contours');
}

// ── Edge event routing ──────────────────────────────────────────────────────

function handleEdgeClick(hexId, faceIndex) {
  emit('edge-paint', { hexId, faceIndex, type: props.selectedType });
}

function handleEdgeRightClick(hexId, faceIndex) {
  emit('edge-clear', { hexId, faceIndex, type: props.selectedType });
}

// Exposed for test instrumentation. MapEditorView routes edge events through
// its own onEdgeClick/onEdgeRightClick handlers, not via these methods directly.
defineExpose({ handleEdgeClick, handleEdgeRightClick });

// ── Overlay config ─────────────────────────────────────────────────────────
// hexFill drives the toggle checkbox (toggleLabel: 'Elevation info').
// hexLabel is added/removed from the config when elevationInfoEnabled changes —
// both layers respond to a single checkbox in BaseToolPanel (via hexFill's toggleLabel).

const ownOverlayConfig = computed(() => {
  const cfg = {
    grid: { alwaysOn: true, weight: 'faint' },
    edgeLine: {
      alwaysOn: true,
      style: 'along-edge',
      featureGroups: CONTOUR_GROUPS,
    },
    hexFill: {
      alwaysOn: false,
      toggleLabel: 'Elevation info',
      fillFn: (hex) =>
        elevationInfoEnabled.value ? tintForLevel(hex.elevation ?? 0, palette.value) : null,
    },
  };
  if (elevationInfoEnabled.value) {
    cfg.hexLabel = {
      alwaysOn: true,
      labelFn: (hex) => String(hex.elevation ?? 0),
      size: 'large',
    };
  }
  return cfg;
});

watch(ownOverlayConfig, (cfg) => emit('overlay-config', cfg), { immediate: true });
</script>

<template>
  <BaseToolPanel
    :overlay-config="ownOverlayConfig"
    :help-text="HELP_TEXT"
    @overlay-toggle="onOverlayToggle"
    @clear-all="emit('edge-clear-all', CONTOUR_TYPES)"
  >
    <!-- Contour type chooser -->
    <div class="type-chooser">
      <button
        v-for="group in CONTOUR_GROUPS"
        :key="group.types[0]"
        class="type-btn"
        :class="{ active: selectedType === group.types[0] }"
        @click="emit('type-change', group.types[0])"
      >
        <span
          class="type-swatch"
          :style="{
            background: group.color,
            height: `${group.strokeWidth}px`,
            width: '24px',
          }"
        />
        <span class="type-name">{{ group.types[0] }}</span>
      </button>
    </div>

    <div class="tool-hint">Click an edge to paint. Right-click to remove.</div>

    <!-- Auto-detect -->
    <div class="auto-detect-section">
      <button class="auto-detect-btn" @click="onAutoDetectClick">Auto-detect from elevation</button>
    </div>

    <!-- Auto-detect confirmation -->
    <div v-if="showAutoDetectConfirm" class="confirm-dialog">
      <span class="confirm-msg">Clear all contour edges and re-derive from elevation data?</span>
      <button @click="onAutoDetectConfirm">Detect</button>
      <button @click="showAutoDetectConfirm = false">Cancel</button>
    </div>
  </BaseToolPanel>
</template>

<style scoped>
.type-chooser {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}

.type-btn:hover {
  background: #3a3a3a;
}

.type-btn.active {
  background: #3a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

.type-swatch {
  display: inline-block;
  min-width: 24px;
  flex-shrink: 0;
}

.type-name {
  flex: 1;
}

.tool-hint {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}

.auto-detect-section {
  padding-top: 0.25rem;
  border-top: 1px solid #333;
}

.auto-detect-btn {
  width: 100%;
  padding: 0.3rem 0.5rem;
  background: #1a2a3a;
  border: 1px solid #3a6a8a;
  color: #88c0d8;
  cursor: pointer;
  font-size: 0.78rem;
  text-align: left;
  font-family: inherit;
}

.auto-detect-btn:hover {
  background: #2a3a4a;
}

.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem;
  background: #2a1a1a;
  border: 1px solid #7a3333;
}

.confirm-msg {
  font-size: 0.75rem;
  color: #c08080;
  line-height: 1.4;
}

.confirm-dialog button {
  padding: 0.2rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
}
</style>
