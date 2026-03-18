<script setup>
defineProps({
  edgeFeatureTypes: {
    type: Array,
    default: () => ['road', 'pike', 'trail', 'stream', 'run', 'stoneWall', 'fence'],
  },
  paintEdgeFeature: {
    type: String,
    default: null,
  },
  traceEdgeCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['feature-change', 'trace-cancel']);
</script>

<template>
  <div class="linear-feature-panel">
    <div class="tool-hint">Drag across hex edges to trace a linear feature.</div>

    <div class="feature-palette">
      <button
        v-for="ft in edgeFeatureTypes"
        :key="ft"
        class="feature-btn"
        :class="{ active: paintEdgeFeature === ft }"
        @click="emit('feature-change', ft)"
      >
        {{ ft }}
      </button>
    </div>

    <div v-if="traceEdgeCount > 0" class="trace-status">
      {{ traceEdgeCount }} edge(s) traced — release to apply
    </div>
  </div>
</template>

<style scoped>
.linear-feature-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #222;
  font-size: 0.85rem;
}

.tool-hint {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}

.feature-palette {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.feature-btn {
  padding: 0.3rem 0.6rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}

.feature-btn:hover {
  background: #3a3a3a;
}

.feature-btn.active {
  background: #2a3a5a;
  border-color: #4a7aab;
  color: #88c0d8;
}

.trace-status {
  font-size: 0.75rem;
  color: #88c0d8;
  padding: 0.3rem 0.5rem;
  background: #1a2a3a;
  border: 1px solid #3a5a7a;
}
</style>
