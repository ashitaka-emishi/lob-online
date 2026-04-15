<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  clickedHexId: { type: String, default: null },
});

const emit = defineEmits(['overlay-update']);

const selectedHex = ref(null);
const result = ref(null);
const loading = ref(false);
const error = ref(null);

watch(
  () => props.clickedHexId,
  (hexId) => {
    if (!hexId) return;
    selectedHex.value = hexId;
    runQuery();
  }
);

async function runQuery() {
  if (!selectedHex.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const params = new URLSearchParams({ hex: selectedHex.value });
    const res = await fetch(`/api/tools/map-test/hex-info?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result.value = await res.json();

    emit('overlay-update', {
      hexFill: {
        alwaysOn: true,
        fillFn: (cell) => {
          const id = cell.gameId ?? cell.id;
          return id === selectedHex.value ? 'rgba(0,180,255,0.5)' : null;
        },
      },
    });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function clear() {
  selectedHex.value = null;
  result.value = null;
  error.value = null;
  emit('overlay-update', {});
}
</script>

<template>
  <div class="panel hex-inspector-panel">
    <div class="panel-header">Hex Inspector</div>

    <div class="click-guide">
      <p v-if="!selectedHex" class="hint">Click any hex on map</p>
      <p v-else class="hint">
        Hex: <strong>{{ selectedHex }}</strong>
      </p>
    </div>

    <button v-if="selectedHex" class="clear-btn" @click="clear">Clear</button>

    <div v-if="loading" class="loading">Loading hex data…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Terrain</span>
        <span class="value">{{ result.terrain ?? '—' }}</span>
      </div>
      <div class="data-row">
        <span class="label">Elevation</span>
        <span class="value">{{ result.elevation ?? 0 }}</span>
      </div>
      <div class="data-row">
        <span class="label">Wedge Elevations</span>
        <span class="value">
          {{ result.wedgeElevations?.length ? result.wedgeElevations.join(', ') : 'none' }}
        </span>
      </div>
      <div v-if="result.hexsides && Object.keys(result.hexsides).length" class="data-row">
        <span class="label">Hexsides</span>
        <div class="value hexsides">
          <div v-for="(features, dir) in result.hexsides" :key="dir">
            {{ ['N', 'NE', 'SE'][dir] }}: {{ features.map((f) => f.type).join(', ') }}
          </div>
        </div>
      </div>
      <div v-else class="data-row">
        <span class="label">Hexsides</span>
        <span class="value">none</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-shared.css';

.data-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}
.label {
  color: #888;
  min-width: 100px;
  flex-shrink: 0;
}
.value {
  color: #e0e0e0;
}
.hexsides {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
