<script setup>
import { ref, computed, watch } from 'vue';
import EdgeToolPanelShell from './EdgeToolPanelShell.vue';
import { CONTOUR_GROUPS } from '../config/feature-types.js';
import { elevationTintPalette, tintForLevel } from '../formulas/elevation.js';

const CONTOUR_TYPES = ['elevation', 'slope', 'extremeSlope', 'verticalSlope'];

const HELP_TEXT =
  'Click an edge to paint the selected contour type. Right-click to remove it. ' +
  'Toggle "Elevation info" to see elevation levels and gradient while editing.';

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
  'overlay-config',
]);

// ── Elevation info toggle ───────────────────────────────────────────────────

const elevationInfoEnabled = ref(false);

const palette = computed(() => elevationTintPalette(props.elevationLevels));

function onOverlayToggle(key) {
  if (key === 'hexFill') elevationInfoEnabled.value = !elevationInfoEnabled.value;
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

// Stable function reference: reads reactive state at call time so its identity
// doesn't change between ownOverlayConfig invalidations (avoids a new closure
// on every toggle, which would always fail shallow prop equality checks).
const hexFillFn = (hex) =>
  elevationInfoEnabled.value ? tintForLevel(hex.elevation ?? 0, palette.value) : null;

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
      fillFn: hexFillFn,
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
  <EdgeToolPanelShell
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
            background: group.color /* hardcoded hex constant from CONTOUR_GROUPS */,
            height: `${group.strokeWidth}px`,
            width: '24px',
          }"
        />
        <span class="type-name">{{ group.types[0] }}</span>
      </button>
    </div>

    <div class="tool-hint">Click an edge to paint. Right-click to remove.</div>
  </EdgeToolPanelShell>
</template>

<style scoped></style>
