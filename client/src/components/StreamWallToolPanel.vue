<script setup>
import { ref, computed, watch } from 'vue';
import EdgeToolPanelShell from './EdgeToolPanelShell.vue';
import { STREAM_WALL_GROUPS, EDGE_PREREQUISITES } from '../config/feature-types.js';

const HELP_TEXT =
  'Click an edge to paint the selected type. ' +
  'Select Ford to add a ford over an existing stream edge. ' +
  'Right-click a hex to clear all stream, wall, and ford features from it.';

const props = defineProps({
  selectedType: {
    type: String,
    default: 'stream',
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
  'hex-stream-clear',
  'overlay-config',
]);

// ── Ford validation error ───────────────────────────────────────────────────

const validationError = ref(null);

// ── Edge event routing ──────────────────────────────────────────────────────

function handleEdgeClick(hexId, faceIndex) {
  const prereqs = EDGE_PREREQUISITES[props.selectedType];
  if (prereqs) {
    const features = props.getEdgeFeatures(hexId, faceIndex);
    if (!prereqs.some((p) => features.includes(p))) {
      validationError.value = 'Ford requires a stream on this edge.';
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
  // Right-click on any edge clears ALL stream/wall/ford features from the hex.
  emit('hex-stream-clear', { hexId });
}

// Exposed for test instrumentation.
defineExpose({ handleEdgeClick, handleEdgeRightClick });

// ── Overlay config ─────────────────────────────────────────────────────────

const ownOverlayConfig = computed(() => ({
  grid: { alwaysOn: true, weight: 'faint' },
  edgeLine: {
    alwaysOn: true,
    style: 'along-edge',
    featureGroups: STREAM_WALL_GROUPS,
  },
}));

watch(ownOverlayConfig, (cfg) => emit('overlay-config', cfg), { immediate: true });
</script>

<template>
  <EdgeToolPanelShell
    :overlay-config="ownOverlayConfig"
    :help-text="HELP_TEXT"
    @clear-all="emit('edge-clear-all', ['stream', 'stoneWall', 'ford'])"
  >
    <!-- Stream/wall type chooser including ford -->
    <div class="type-chooser">
      <button
        v-for="group in STREAM_WALL_GROUPS"
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
          }"
        />
        <span class="type-name">{{ group.types[0] }}</span>
      </button>
      <!-- Ford as an edge type -->
      <button
        class="type-btn"
        :class="{ active: selectedType === 'ford' }"
        @click="emit('type-change', 'ford')"
      >
        <span class="type-swatch ford-swatch">][</span>
        <span class="type-name">ford</span>
      </button>
    </div>
    <div class="tool-hint">
      Click an edge to paint. Right-click a hex to clear all stream features.
    </div>
    <div v-if="validationError" class="validation-error">{{ validationError }}</div>
  </EdgeToolPanelShell>
</template>

<style scoped>
.ford-swatch {
  font-family: monospace;
  font-size: 0.85rem;
  color: #4a90d9;
  min-width: 1.5rem;
  text-align: center;
  display: inline-block;
}
</style>
