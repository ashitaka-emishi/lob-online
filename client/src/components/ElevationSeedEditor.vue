<script setup>
import { computed } from 'vue';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({ seedHexes: [] }),
  },
});

const emit = defineEmits(['seed-remove']);

const ELEVATION_BANDS = [
  { label: 'Lowland (≤300 ft)', min: 0, max: 300 },
  { label: 'Valley (301–450 ft)', min: 301, max: 450 },
  { label: 'Mid-slope (451–600 ft)', min: 451, max: 600 },
  { label: 'High ground (601–750 ft)', min: 601, max: 750 },
  { label: 'Ridge (751+ ft)', min: 751, max: Infinity },
];

const seedHexes = computed(() => props.config?.seedHexes ?? []);

function bandForElevation(elevationFeet) {
  return ELEVATION_BANDS.find((b) => elevationFeet >= b.min && elevationFeet <= b.max);
}

const coverage = computed(() =>
  ELEVATION_BANDS.map((band) => ({
    ...band,
    count: seedHexes.value.filter((s) => {
      const elev = s.confirmedData?.elevation ?? -1;
      return elev >= band.min && elev <= band.max;
    }).length,
  }))
);

const elevationSeeds = computed(() =>
  seedHexes.value.filter((s) => s.confirmedData?.elevation != null)
);
</script>

<template>
  <div class="elevation-seed-editor">
    <h4>Elevation Seed Editor</h4>

    <div class="coverage-grid">
      <div
        v-for="band in coverage"
        :key="band.label"
        class="coverage-cell"
        :class="{ covered: band.count > 0 }"
      >
        <span class="band-label">{{ band.label }}</span>
        <span class="band-count">{{ band.count }}</span>
      </div>
    </div>

    <div v-if="elevationSeeds.length === 0" class="empty-message">No elevation seed hexes yet.</div>

    <ul v-else class="seed-list">
      <li v-for="seed in elevationSeeds" :key="seed.hexId" class="seed-item">
        <span class="seed-id">{{ seed.hexId }}</span>
        <span class="seed-detail">
          {{ seed.confirmedData.terrain }} · {{ seed.confirmedData.elevation }} ft
          <em v-if="bandForElevation(seed.confirmedData.elevation)">
            ({{ bandForElevation(seed.confirmedData.elevation).label }})
          </em>
        </span>
        <button class="delete-btn" @click="emit('seed-remove', seed.hexId)">Remove</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.elevation-seed-editor {
  padding: 8px;
}
.coverage-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.coverage-cell {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background: #3a3a3a;
  border-radius: 4px;
  font-size: 0.85em;
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
