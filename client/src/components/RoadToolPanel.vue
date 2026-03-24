<script setup>
import { ref, computed, watch } from 'vue';
import EdgeToolPanelShell from './EdgeToolPanelShell.vue';
import { ROAD_GROUPS } from '../config/feature-types.js';

const ROAD_TYPES = ['trail', 'road', 'pike'];

const HELP_TEXT =
  'Click an edge to paint the selected road type. ' +
  'Select Bridge to add a bridge over an existing road edge. ' +
  'Right-click a hex to clear all road features from it.';

const props = defineProps({
  selectedType: {
    type: String,
    default: 'trail',
  },
  /** (hexId, faceIndex) => string[] — returns edge feature types for validation */
  getEdgeFeatures: {
    type: Function,
    default: () => [],
  },
});

const emit = defineEmits([
  'type-change',
  'edge-paint',
  'edge-clear',
  'edge-clear-all',
  'hex-road-clear',
  'overlay-config',
]);

// ── Bridge validation error ─────────────────────────────────────────────────

const validationError = ref(null);

// ── Edge event routing ──────────────────────────────────────────────────────

function handleEdgeClick(hexId, faceIndex) {
  if (props.selectedType === 'bridge') {
    const features = props.getEdgeFeatures(hexId, faceIndex);
    if (!features.some((f) => ROAD_TYPES.includes(f))) {
      validationError.value = 'Bridge requires a road, trail, or pike on this edge.';
      setTimeout(() => {
        validationError.value = null;
      }, 3000);
      return;
    }
    validationError.value = null;
  }
  emit('edge-paint', { hexId, faceIndex, type: props.selectedType });
}

function handleEdgeRightClick(hexId, _faceIndex) {
  // Right-click on any edge clears ALL road features from the hex (not just the clicked edge).
  emit('hex-road-clear', { hexId });
}

// Exposed for test instrumentation.
defineExpose({ handleEdgeClick, handleEdgeRightClick });

// ── Overlay config ─────────────────────────────────────────────────────────

const ownOverlayConfig = computed(() => ({
  grid: { alwaysOn: true, weight: 'faint' },
  edgeLine: {
    alwaysOn: true,
    style: 'through-hex',
    featureGroups: ROAD_GROUPS,
  },
}));

watch(ownOverlayConfig, (cfg) => emit('overlay-config', cfg), { immediate: true });
</script>

<template>
  <EdgeToolPanelShell
    :overlay-config="ownOverlayConfig"
    :help-text="HELP_TEXT"
    @clear-all="emit('edge-clear-all', ['trail', 'road', 'pike', 'bridge'])"
  >
    <!-- Road type chooser including bridge -->
    <div class="type-chooser">
      <button
        v-for="group in ROAD_GROUPS"
        :key="group.types[0]"
        class="type-btn"
        :class="{ active: selectedType === group.types[0] }"
        @click="emit('type-change', group.types[0])"
      >
        <span
          class="type-swatch"
          :style="{
            background: group.color,
            width: `${group.strokeWidth * 4}px`,
            height: '3px',
            borderTop: group.dash ? `2px dashed ${group.color}` : undefined,
          }"
        />
        <span class="type-name">{{ group.types[0] }}</span>
      </button>
      <!-- Bridge as an edge type -->
      <button
        class="type-btn"
        :class="{ active: selectedType === 'bridge' }"
        @click="emit('type-change', 'bridge')"
      >
        <span class="type-swatch bridge-swatch">][</span>
        <span class="type-name">bridge</span>
      </button>
    </div>
    <div class="tool-hint">Click an edge to paint. Right-click a hex to clear all roads.</div>
    <div v-if="validationError" class="validation-error">{{ validationError }}</div>
  </EdgeToolPanelShell>
</template>

<style scoped>
.bridge-swatch {
  font-family: monospace;
  font-size: 0.85rem;
  color: #e0d8c8;
  min-width: 1.5rem;
  text-align: center;
  display: inline-block;
}
</style>
