<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  clickedHexId: { type: String, default: null },
});

const emit = defineEmits(['overlay-update']);

// ── State ──────────────────────────────────────────────────────────────────────

const fromHex = ref(null);
const toHex = ref(null);
const result = ref(null);
const loading = ref(false);
const error = ref(null);

// ── Click accumulation: first click = observer, second = target ───────────────

watch(
  () => props.clickedHexId,
  (hexId) => {
    if (!hexId) return;
    if (!fromHex.value) {
      fromHex.value = hexId;
      error.value = null;
      result.value = null;
      // Snapshot fromHex at emit time — reactive ref must not be accessed inside fillFn.
      const from = hexId;
      emit('overlay-update', {
        hexFill: {
          alwaysOn: true,
          fillFn: (cell) => {
            const id = cell.gameId ?? cell.id;
            return id === from ? 'rgba(0,180,255,0.5)' : null;
          },
        },
      });
    } else if (!toHex.value) {
      toHex.value = hexId;
      runQuery();
    }
  }
);

// ── API call ──────────────────────────────────────────────────────────────────

async function runQuery() {
  if (!fromHex.value || !toHex.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const params = new URLSearchParams({ fromHex: fromHex.value, toHex: toHex.value });
    const res = await fetch(`/api/tools/map-test/los?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result.value = await res.json();

    // Snapshot all closure data at emit time — result.value resets to null on re-query.
    const canSee = result.value.canSee;
    const traceSet = new Set(result.value.trace ?? []);
    const blockedBy = result.value.blockedBy ?? null;
    const from = fromHex.value;
    const to = toHex.value;

    emit('overlay-update', {
      hexFill: {
        alwaysOn: true,
        fillFn: (cell) => {
          const id = cell.gameId ?? cell.id;
          if (id === from) return 'rgba(0,180,255,0.5)';
          if (id === to) return canSee ? 'rgba(0,200,0,0.5)' : 'rgba(220,60,60,0.45)';
          if (traceSet.has(id)) return 'rgba(255,200,0,0.3)';
          if (id === blockedBy) return 'rgba(255,80,0,0.5)';
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
  fromHex.value = null;
  toHex.value = null;
  result.value = null;
  error.value = null;
  emit('overlay-update', {});
}
</script>

<template>
  <div class="panel los-panel">
    <div class="panel-header">LOS</div>

    <div class="click-guide">
      <p v-if="!fromHex" class="hint">Click observer hex on map</p>
      <p v-else-if="!toHex" class="hint">
        Observer: <strong>{{ fromHex }}</strong> — click target hex on map
      </p>
      <p v-else class="hint">
        <strong>{{ fromHex }}</strong> → <strong>{{ toHex }}</strong>
      </p>
    </div>

    <button v-if="fromHex" class="clear-btn" @click="clear">Clear</button>

    <div v-if="loading" class="loading">Computing LOS…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="can-see-badge" :class="result.canSee ? 'can-see' : 'cannot-see'">
        {{ result.canSee ? 'Line of Sight: YES' : 'Line of Sight: NO' }}
      </div>

      <div v-if="!result.canSee && result.blockedBy" class="data-row">
        <span class="label">Blocked by</span>
        <span class="value">{{ result.blockedBy }}</span>
      </div>

      <div v-if="result.trace && result.trace.length" class="data-row">
        <span class="label">Trace hexes</span>
        <span class="value">{{ result.trace.join(', ') }}</span>
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
.can-see-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 3px;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 10px;
}
.can-see {
  background: rgba(0, 160, 0, 0.3);
  border: 1px solid #0a0;
  color: #6f6;
}
.cannot-see {
  background: rgba(160, 0, 0, 0.3);
  border: 1px solid #a00;
  color: #f88;
}
.data-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}
.label {
  color: #888;
  min-width: 80px;
  flex-shrink: 0;
}
.value {
  color: #e0e0e0;
}
</style>
