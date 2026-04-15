<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  clickedHexId: { type: String, default: null },
});

const emit = defineEmits(['overlay-update']);

// ── Commander levels ──────────────────────────────────────────────────────────

const COMMANDER_LEVELS = ['brigade', 'division', 'corps', 'army'];

// Zone fill colours
const ZONE_COLORS = {
  within: 'rgba(0,200,80,0.50)', // within radius — green
  beyond: 'rgba(220,140,0,0.45)', // beyond radius — amber
  beyondFar: 'rgba(160,40,40,0.45)', // beyond radius far — red
};

// ── State ──────────────────────────────────────────────────────────────────────

const commanderLevel = ref('brigade');
const originHex = ref(null);
const result = ref(null);
const loading = ref(false);
const error = ref(null);

// ── Click accumulation: single click = commander position ─────────────────────

watch(
  () => props.clickedHexId,
  (hexId) => {
    if (!hexId) return;
    originHex.value = hexId;
    runQuery();
  }
);

// ── API call ──────────────────────────────────────────────────────────────────

async function runQuery() {
  if (!originHex.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const params = new URLSearchParams({
      hex: originHex.value,
      commanderLevel: commanderLevel.value,
    });
    const res = await fetch(`/api/tools/map-test/command-range?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result.value = await res.json();

    // Snapshot all three zones into Sets at emit time so fillFn never touches
    // the reactive result ref (which resets to null when a new query starts).
    const withinSet = new Set(result.value.withinRadius);
    const beyondSet = new Set(result.value.beyondRadius);
    const beyondFarSet = new Set(result.value.beyondRadiusFar);
    const origin = originHex.value;

    emit('overlay-update', {
      hexFill: {
        alwaysOn: true,
        fillFn: (cell) => {
          const id = cell.gameId ?? cell.id;
          if (id === origin) return 'rgba(0,180,255,0.6)';
          if (withinSet.has(id)) return ZONE_COLORS.within;
          if (beyondSet.has(id)) return ZONE_COLORS.beyond;
          if (beyondFarSet.has(id)) return ZONE_COLORS.beyondFar;
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
  originHex.value = null;
  result.value = null;
  error.value = null;
  emit('overlay-update', {});
}

function onLevelChange() {
  result.value = null;
  if (originHex.value) runQuery();
}
</script>

<template>
  <div class="panel command-range-panel">
    <div class="panel-header">Command Range</div>

    <div class="controls">
      <label class="field">
        <span class="field-label">Commander Level</span>
        <select v-model="commanderLevel" @change="onLevelChange">
          <option v-for="lvl in COMMANDER_LEVELS" :key="lvl" :value="lvl">{{ lvl }}</option>
        </select>
      </label>
    </div>

    <div class="click-guide">
      <p v-if="!originHex" class="hint">Click commander hex on map</p>
      <p v-else class="hint">
        Commander: <strong>{{ originHex }}</strong>
      </p>
    </div>

    <button v-if="originHex" class="clear-btn" @click="clear">Clear</button>

    <div v-if="loading" class="loading">Computing command range…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="counts">
        <div class="count-row">
          <span class="swatch" :style="{ background: ZONE_COLORS.within }" />
          Within radius: {{ result.withinRadius.length }}
        </div>
        <div class="count-row">
          <span class="swatch" :style="{ background: ZONE_COLORS.beyond }" />
          Beyond radius: {{ result.beyondRadius.length }}
        </div>
        <div class="count-row">
          <span class="swatch" :style="{ background: ZONE_COLORS.beyondFar }" />
          Beyond radius (far): {{ result.beyondRadiusFar.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-shared.css';

.counts {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.count-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #e0e0e0;
}
.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid #555;
  flex-shrink: 0;
}
</style>
