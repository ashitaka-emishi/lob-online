<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  clickedHexId: { type: String, default: null },
});

const emit = defineEmits(['overlay-update']);

const FORMATIONS = ['line', 'column', 'mounted', 'limbered', 'horseArtillery', 'wagon', 'leader'];

// Colour buckets for MP range shading (0–2, 3–4, 5–6, 7–8, 9+)
const BUCKET_COLORS = [
  'rgba(0,220,0,0.45)', // 0–2 MP
  'rgba(80,200,0,0.40)', // 3–4 MP
  'rgba(200,180,0,0.40)', // 5–6 MP
  'rgba(220,100,0,0.40)', // 7–8 MP
  'rgba(200,50,50,0.40)', // 9+ MP
];

function bucketColor(cost) {
  if (cost <= 2) return BUCKET_COLORS[0];
  if (cost <= 4) return BUCKET_COLORS[1];
  if (cost <= 6) return BUCKET_COLORS[2];
  if (cost <= 8) return BUCKET_COLORS[3];
  return BUCKET_COLORS[4];
}

const formation = ref('line');
const originHex = ref(null);
const result = ref(null);
const loading = ref(false);
const error = ref(null);

watch(
  () => props.clickedHexId,
  (hexId) => {
    if (!hexId) return;
    originHex.value = hexId;
    runQuery();
  }
);

async function runQuery() {
  if (!originHex.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const params = new URLSearchParams({ hex: originHex.value, formation: formation.value });
    const res = await fetch(`/api/tools/map-test/movement-range?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result.value = await res.json();

    // Snapshot all closure data at emit time — reactive refs must not be accessed inside fillFn.
    const costMap = new Map(result.value.reachable.map(({ hex, cost }) => [hex, cost]));
    const origin = originHex.value;
    emit('overlay-update', {
      hexFill: {
        alwaysOn: true,
        fillFn: (cell) => {
          const id = cell.gameId ?? cell.id;
          if (id === origin) return 'rgba(0,180,255,0.5)';
          const cost = costMap.get(id);
          return cost !== undefined ? bucketColor(cost) : null;
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
  originHex.value = null;
  result.value = null;
  error.value = null;
  emit('overlay-update', {});
}

function onFormationChange() {
  result.value = null;
  if (originHex.value) runQuery();
}
</script>

<template>
  <div class="panel movement-range-panel">
    <div class="panel-header">Movement Range</div>

    <div class="controls">
      <label class="field">
        <span class="field-label">Formation</span>
        <select v-model="formation" @change="onFormationChange">
          <option v-for="f in FORMATIONS" :key="f" :value="f">{{ f }}</option>
        </select>
      </label>
    </div>

    <div class="click-guide">
      <p v-if="!originHex" class="hint">Click origin hex on map</p>
      <p v-else class="hint">
        Origin: <strong>{{ originHex }}</strong>
      </p>
    </div>

    <button v-if="originHex" class="clear-btn" @click="clear">Clear</button>

    <div v-if="loading" class="loading">Computing range…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="count">{{ result.reachable.length }} hexes reachable</div>
      <div class="legend">
        <span v-for="(color, i) in BUCKET_COLORS" :key="i" class="legend-item">
          <span class="swatch" :style="{ background: color }" />
          {{ ['0–2', '3–4', '5–6', '7–8', '9+'][i] }} MP
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  padding: 12px;
  font-size: 13px;
  color: #ccc;
}
.panel-header {
  font-weight: 600;
  margin-bottom: 10px;
  color: #fff;
}
.controls {
  margin-bottom: 8px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.field-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
}
select {
  background: #2d2d2d;
  border: 1px solid #444;
  color: #ccc;
  padding: 3px 6px;
  border-radius: 3px;
}
.click-guide {
  margin: 8px 0;
  font-size: 12px;
}
.hint {
  margin: 0;
  color: #aaa;
}
.clear-btn {
  margin-bottom: 8px;
  padding: 3px 10px;
  background: #3a3a3a;
  border: 1px solid #555;
  color: #ccc;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}
.loading {
  color: #888;
  font-style: italic;
}
.error {
  color: #f87171;
}
.count {
  margin-bottom: 6px;
  font-weight: 600;
  color: #ffd;
}
.legend {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid #555;
}
</style>
