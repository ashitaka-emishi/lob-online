<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  clickedHexId: { type: String, default: null },
});

const emit = defineEmits(['overlay-update']);

// ── Formation options ─────────────────────────────────────────────────────────

const FORMATIONS = ['line', 'column', 'mounted', 'limbered', 'horseArtillery', 'wagon', 'leader'];

// ── State ──────────────────────────────────────────────────────────────────────

const formation = ref('line');
const startHex = ref(null);
const endHex = ref(null);
const result = ref(null);
const loading = ref(false);
const error = ref(null);

// ── Click accumulation: first click = start, second = end ─────────────────────

watch(
  () => props.clickedHexId,
  (hexId) => {
    if (!hexId) return;
    if (!startHex.value) {
      startHex.value = hexId;
      error.value = null;
      result.value = null;
      emit('overlay-update', {});
    } else if (!endHex.value) {
      endHex.value = hexId;
      runQuery();
    }
  }
);

// ── API call ──────────────────────────────────────────────────────────────────

async function runQuery() {
  if (!startHex.value || !endHex.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const params = new URLSearchParams({
      startHex: startHex.value,
      endHex: endHex.value,
      formation: formation.value,
    });
    const res = await fetch(`/api/tools/map-test/movement-path?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result.value = await res.json();

    // Update map overlay: highlight path hexes
    emit('overlay-update', {
      hexFill: {
        alwaysOn: true,
        fillFn: (cell) => {
          const id = cell.gameId ?? cell.id;
          if (id === startHex.value) return 'rgba(0,180,0,0.45)';
          if (id === endHex.value) return 'rgba(220,60,60,0.45)';
          if (result.value?.path?.includes(id)) return 'rgba(255,200,0,0.35)';
          return null;
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
  startHex.value = null;
  endHex.value = null;
  result.value = null;
  error.value = null;
  emit('overlay-update', {});
}
</script>

<template>
  <div class="panel movement-path-panel">
    <div class="panel-header">Movement Path</div>

    <div class="controls">
      <label class="field">
        <span class="field-label">Formation</span>
        <select v-model="formation" @change="result = null">
          <option v-for="f in FORMATIONS" :key="f" :value="f">{{ f }}</option>
        </select>
      </label>
    </div>

    <div class="click-guide">
      <p v-if="!startHex" class="hint">Click start hex on map</p>
      <p v-else-if="!endHex" class="hint">
        Start: <strong>{{ startHex }}</strong> — click end hex on map
      </p>
      <p v-else class="hint">
        <strong>{{ startHex }}</strong> → <strong>{{ endHex }}</strong>
      </p>
    </div>

    <button v-if="startHex" class="clear-btn" @click="clear">Clear</button>

    <div v-if="loading" class="loading">Computing path…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div v-if="result.impassable" class="impassable">No path — impassable</div>
      <div v-else>
        <div class="total-cost">Total: {{ result.totalCost }} MP</div>
        <table class="cost-table">
          <thead>
            <tr>
              <th>Hex</th>
              <th>Terrain</th>
              <th>Hexside</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result.costs" :key="row.hex">
              <td>{{ row.hex }}</td>
              <td>{{ row.terrainCost }}</td>
              <td>{{ row.hexsideCost }}</td>
              <td>{{ row.total }}</td>
            </tr>
          </tbody>
        </table>
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
.impassable {
  color: #f87171;
  font-weight: 600;
}
.total-cost {
  margin-bottom: 6px;
  font-weight: 600;
  color: #ffd;
}
.cost-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.cost-table th,
.cost-table td {
  text-align: left;
  padding: 2px 6px;
  border-bottom: 1px solid #333;
}
.cost-table th {
  color: #888;
}
</style>
