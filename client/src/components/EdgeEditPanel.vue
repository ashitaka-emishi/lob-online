<script setup>
import { ref } from 'vue';

const props = defineProps({
  hexId: {
    type: String,
    required: true,
  },
  edges: {
    type: Object,
    default: () => ({}),
  },
  edgeFeatureTypes: {
    type: Array,
    default: () => ['road', 'stream', 'stoneWall', 'slope', 'extremeSlope', 'verticalSlope'],
  },
});

const emit = defineEmits(['edge-update']);

const DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

// Per-direction add-type dropdowns
const addTypeForDir = ref(Object.fromEntries(DIRS.map((d) => [d, ''])));

function featuresForDir(dir) {
  return props.edges[dir] ?? [];
}

function removeFeature(dir, idx) {
  const features = [...featuresForDir(dir)];
  features.splice(idx, 1);
  emit('edge-update', { hexId: props.hexId, dir, features });
}

function addFeature(dir) {
  const type = addTypeForDir.value[dir];
  if (!type) return;
  const features = [...featuresForDir(dir), { type }];
  addTypeForDir.value[dir] = '';
  emit('edge-update', { hexId: props.hexId, dir, features });
}
</script>

<template>
  <div class="edge-edit-panel">
    <div v-for="dir in DIRS" :key="dir" class="dir-row">
      <div class="dir-label">{{ dir }}</div>
      <div class="features-list">
        <span v-for="(feat, fi) in featuresForDir(dir)" :key="fi" class="feature-chip">
          {{ feat.type }}
          <button class="remove-btn" @click="removeFeature(dir, fi)">✕</button>
        </span>
      </div>
      <div class="add-row">
        <select v-model="addTypeForDir[dir]" class="type-select">
          <option value="">— add —</option>
          <option v-for="et in edgeFeatureTypes" :key="et" :value="et">{{ et }}</option>
        </select>
        <button class="add-btn" :disabled="!addTypeForDir[dir]" @click="addFeature(dir)">
          Add
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edge-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.82rem;
}

.dir-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid #333;
}

.dir-label {
  font-weight: bold;
  color: #c8b88a;
  font-size: 0.75rem;
}

.features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  min-height: 1.2rem;
}

.feature-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.4rem;
  background: #2a3a4a;
  border: 1px solid #3a6a8a;
  color: #88c0d8;
  font-size: 0.78rem;
}

.remove-btn {
  background: none;
  border: none;
  color: #c06060;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 0;
  line-height: 1;
}

.add-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.type-select {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.15rem 0.3rem;
  font-size: 0.78rem;
}

.add-btn {
  padding: 0.15rem 0.4rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.78rem;
}

.add-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
