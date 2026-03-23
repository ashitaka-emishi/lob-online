<script setup>
import { ref, computed, watch } from 'vue';
import BaseToolPanel from './BaseToolPanel.vue';
import { STREAM_WALL_GROUPS } from '../config/feature-types.js';
import { useClickHexside } from '../composables/useClickHexside.js';

const STREAM_WALL_TYPES = ['stream', 'stoneWall'];

const HELP_TEXT =
  'Click an edge to paint the selected type. Right-click to remove it. ' +
  'Switch to Ford mode to place a ford on a stream edge (requires stream).';

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
  <BaseToolPanel
    :overlay-config="ownOverlayConfig"
    :help-text="HELP_TEXT"
    @clear-all="emit('edge-clear-all', STREAM_WALL_TYPES)"
  >
    <!-- Mode selector -->
    <div class="mode-toggle">
      <button class="mode-btn" :class="{ active: mode === 'paint' }" @click="mode = 'paint'">
        Paint
      </button>
      <button class="mode-btn" :class="{ active: mode === 'ford' }" @click="mode = 'ford'">
        Ford
      </button>
    </div>

    <!-- Type chooser (paint mode) -->
    <template v-if="mode === 'paint'">
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
            :style="{ background: group.color, width: `${group.strokeWidth * 4}px` }"
          />
          <span class="type-name">{{ group.types[0] }}</span>
        </button>
      </div>
      <div class="tool-hint">Click an edge to paint. Right-click to remove.</div>
    </template>

    <!-- Ford mode -->
    <template v-else>
      <div class="tool-hint ford-hint">
        Click a stream edge to place a ford.<br />Right-click to remove.
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

.ford-hint {
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
