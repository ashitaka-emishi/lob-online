<script setup>
import { ref, computed, watch } from 'vue';
import BaseToolPanel from './BaseToolPanel.vue';
import { ROAD_GROUPS } from '../config/feature-types.js';
import { useClickHexside } from '../composables/useClickHexside.js';

const ROAD_TYPES = ['trail', 'road', 'pike'];

const HELP_TEXT =
  'Click an edge to paint the selected road type. Right-click to remove it. ' +
  'Switch to Bridge mode to place a bridge on a road edge (requires road, trail, or pike).';

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
  <BaseToolPanel
    :overlay-config="ownOverlayConfig"
    :help-text="HELP_TEXT"
    @clear-all="emit('edge-clear-all', ROAD_TYPES)"
  >
    <!-- Mode selector -->
    <div class="mode-toggle">
      <button class="mode-btn" :class="{ active: mode === 'road' }" @click="mode = 'road'">
        Paint
      </button>
      <button class="mode-btn" :class="{ active: mode === 'bridge' }" @click="mode = 'bridge'">
        Bridge
      </button>
    </div>

    <!-- Road type chooser (paint mode) -->
    <template v-if="mode === 'road'">
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
              borderTop: group.dash ? `2px dashed ${group.color}` : undefined,
            }"
          />
          <span class="type-name">{{ group.types[0] }}</span>
        </button>
      </div>
      <div class="tool-hint">Click an edge to paint. Right-click to remove.</div>
    </template>

    <!-- Bridge mode -->
    <template v-else>
      <div class="tool-hint bridge-hint">
        Click an edge with a road/trail/pike to place a bridge.<br />Right-click to remove.
      </div>
      <div v-if="validationError" class="validation-error">{{ validationError }}</div>
    </template>
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
  height: 3px;
  min-width: 12px;
}

.type-name {
  flex: 1;
}

.tool-hint {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}

.bridge-hint {
  line-height: 1.4;
}

.validation-error {
  font-size: 0.75rem;
  color: #c08080;
  padding: 0.25rem 0.4rem;
  background: #2a1a1a;
  border: 1px solid #7a3333;
}
</style>
