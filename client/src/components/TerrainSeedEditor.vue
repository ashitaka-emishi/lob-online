<script setup>
import { computed } from 'vue';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({ seedHexes: [] }),
  },
});

const emit = defineEmits(['seed-remove']);

const TERRAIN_TYPES = ['open', 'woods', 'town', 'orchard', 'rough'];

const seedHexes = computed(() => props.config?.seedHexes ?? []);

const coverage = computed(() =>
  TERRAIN_TYPES.map((terrain) => ({
    terrain,
    count: seedHexes.value.filter((s) => s.confirmedData?.terrain === terrain).length,
  }))
);

const terrainSeeds = computed(() =>
  seedHexes.value.filter((s) => s.confirmedData?.terrain != null)
);
</script>

<template>
  <div class="terrain-seed-editor">
    <h4>Terrain Seed Editor</h4>

    <div class="coverage-grid">
      <div
        v-for="band in coverage"
        :key="band.terrain"
        class="coverage-cell"
        :class="{ covered: band.count > 0 }"
      >
        <span class="band-label">{{ band.terrain }}</span>
        <span class="band-count">{{ band.count }}</span>
      </div>
    </div>

    <div v-if="terrainSeeds.length === 0" class="empty-message">No terrain seed hexes yet.</div>

    <ul v-else class="seed-list">
      <li v-for="seed in terrainSeeds" :key="seed.hexId" class="seed-item">
        <span class="seed-id">{{ seed.hexId }}</span>
        <span class="seed-detail">
          {{ seed.confirmedData.terrain }}
          <span v-if="seed.confirmedData.elevation != null">
            · {{ seed.confirmedData.elevation }} ft
          </span>
        </span>
        <button class="delete-btn" @click="emit('seed-remove', seed.hexId)">Remove</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.terrain-seed-editor {
  padding: 8px;
}
.coverage-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.coverage-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 10px;
  background: #3a3a3a;
  border-radius: 4px;
  font-size: 0.85em;
  min-width: 64px;
}
.coverage-cell.covered {
  background: #2a4a2a;
}
.band-count {
  font-weight: bold;
}
.empty-message {
  color: #888;
  font-size: 0.85em;
}
.seed-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.seed-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #333;
  font-size: 0.85em;
}
.seed-id {
  font-family: monospace;
  font-weight: bold;
  min-width: 48px;
}
.seed-detail {
  flex: 1;
  color: #ccc;
}
.delete-btn {
  padding: 2px 8px;
  font-size: 0.8em;
  background: #5a2020;
  border: none;
  border-radius: 3px;
  color: #fff;
  cursor: pointer;
}
.delete-btn:hover {
  background: #7a3030;
}
</style>
