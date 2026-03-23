<script setup>
import { ref, computed, watch } from 'vue';
import EdgeToolPanelShell from './EdgeToolPanelShell.vue';
import { ROAD_GROUPS } from '../config/feature-types.js';
import { useClickHexside } from '../composables/useClickHexside.js';

const ROAD_TYPES = ['trail', 'road', 'pike'];

const HELP_TEXT =
  'Click an edge to paint the selected road type. Right-click to remove it. ' +
  'Switch to Bridge mode to place a bridge on a road edge (requires road, trail, or pike).';

const MODES = [
  { value: 'road', label: 'Paint' },
  { value: 'bridge', label: 'Bridge' },
];

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
  'bridge-place',
  'bridge-remove',
  'overlay-config',
]);

// ── Mode: paint road types vs place bridge ─────────────────────────────────

const mode = ref('road'); // 'road' | 'bridge'

// ── Bridge sub-control ──────────────────────────────────────────────────────

const {
  onEdgeClick: onBridgeClick,
  onEdgeRightClick: onBridgeRightClick,
  validationError,
} = useClickHexside({
  validateFn: (hexId, faceIndex) => {
    const features = props.getEdgeFeatures(hexId, faceIndex);
    return features.some((f) => ROAD_TYPES.includes(f))
      ? { valid: true }
      : { valid: false, reason: 'Bridge requires a road, trail, or pike on this edge.' };
  },
  onPlace: (hexId, faceIndex) => emit('bridge-place', { hexId, faceIndex }),
  onRemove: (hexId, faceIndex) => emit('bridge-remove', { hexId, faceIndex }),
});

// ── Edge event routing ──────────────────────────────────────────────────────

function handleEdgeClick(hexId, faceIndex) {
  if (mode.value === 'bridge') {
    onBridgeClick(hexId, faceIndex);
  } else {
    emit('edge-paint', { hexId, faceIndex, type: props.selectedType });
  }
}

function handleEdgeRightClick(hexId, faceIndex) {
  if (mode.value === 'bridge') {
    onBridgeRightClick(hexId, faceIndex);
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
    featureGroups: ROAD_GROUPS,
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
    @clear-all="emit('edge-clear-all', ROAD_TYPES)"
  >
    <!-- Paint mode: road type chooser -->
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
            background: group.color /* hardcoded hex constant from ROAD_GROUPS */,
            width: `${group.strokeWidth * 4}px`,
            height: '3px',
            borderTop: group.dash ? `2px dashed ${group.color}` : undefined,
          }"
        />
        <span class="type-name">{{ group.types[0] }}</span>
      </button>
    </div>
    <div class="tool-hint">Click an edge to paint. Right-click to remove.</div>

    <!-- Bridge sub-control -->
    <template #sub-control>
      <div class="tool-hint">
        Click an edge with a road/trail/pike to place a bridge.<br />Right-click to remove.
      </div>
      <div v-if="validationError" class="validation-error">{{ validationError }}</div>
    </template>
  </EdgeToolPanelShell>
</template>
