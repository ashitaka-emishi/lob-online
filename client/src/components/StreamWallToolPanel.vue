<script setup>
import { ref, computed, watch } from 'vue';
import EdgeToolPanelShell from './EdgeToolPanelShell.vue';
import { STREAM_WALL_GROUPS } from '../config/feature-types.js';
import { useClickHexside } from '../composables/useClickHexside.js';

const STREAM_WALL_TYPES = ['stream', 'stoneWall'];

const HELP_TEXT =
  'Click an edge to paint the selected type. Right-click to remove it. ' +
  'Switch to Ford mode to place a ford on a stream edge (requires stream).';

const MODES = [
  { value: 'paint', label: 'Paint' },
  { value: 'ford', label: 'Ford' },
];

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
  'ford-place',
  'ford-remove',
  'overlay-config',
]);

// ── Mode: paint stream/wall types vs place ford ─────────────────────────────

const mode = ref('paint'); // 'paint' | 'ford'

// ── Ford sub-control ────────────────────────────────────────────────────────

const {
  onEdgeClick: onFordClick,
  onEdgeRightClick: onFordRightClick,
  validationError,
} = useClickHexside({
  validateFn: (hexId, faceIndex) => {
    const features = props.getEdgeFeatures(hexId, faceIndex);
    return features.includes('stream')
      ? { valid: true }
      : { valid: false, reason: 'Ford requires a stream on this edge.' };
  },
  onPlace: (hexId, faceIndex) => emit('ford-place', { hexId, faceIndex }),
  onRemove: (hexId, faceIndex) => emit('ford-remove', { hexId, faceIndex }),
});

// ── Edge event routing ──────────────────────────────────────────────────────

function handleEdgeClick(hexId, faceIndex) {
  if (mode.value === 'ford') {
    onFordClick(hexId, faceIndex);
  } else {
    emit('edge-paint', { hexId, faceIndex, type: props.selectedType });
  }
}

function handleEdgeRightClick(hexId, faceIndex) {
  if (mode.value === 'ford') {
    onFordRightClick(hexId, faceIndex);
  } else {
    emit('edge-clear', { hexId, faceIndex, type: props.selectedType });
  }
}

// Exposed for test instrumentation. MapEditorView routes edge events through
// its own onEdgeClick/onEdgeRightClick handlers, not via these methods directly.
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
    :modes="MODES"
    :active-mode="mode"
    @mode-change="mode = $event"
    @clear-all="emit('edge-clear-all', STREAM_WALL_TYPES)"
  >
    <!-- Paint mode: stream/wall type chooser -->
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
          :style="{ background: group.color, width: `${group.strokeWidth * 4}px`, height: '3px' }"
        />
        <span class="type-name">{{ group.types[0] }}</span>
      </button>
    </div>
    <div class="tool-hint">Click an edge to paint. Right-click to remove.</div>

    <!-- Ford sub-control -->
    <template #sub-control>
      <div class="tool-hint">Click a stream edge to place a ford.<br />Right-click to remove.</div>
      <div v-if="validationError" class="validation-error">{{ validationError }}</div>
    </template>
  </EdgeToolPanelShell>
</template>
