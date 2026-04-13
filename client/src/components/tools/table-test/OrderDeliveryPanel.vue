<script setup>
// LOB_CHARTS §10.6a — Order Delivery Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/order-delivery');

const ARMY_CO_TYPES = [
  { value: 'onFire', label: 'On Fire (+1 turn)' },
  { value: 'normal', label: 'Normal (+2 turns) — SM default' },
  { value: 'notSoSure', label: 'Not So Sure (+4 turns)' },
  { value: 'comatose', label: 'Comatose (+8 turns)' },
];

const DISTANCE_CATEGORIES = [
  { value: 'withinRadius', label: 'Within Command Radius (+1 turn)' },
  { value: 'beyondRadius', label: 'Beyond Command Radius (+2 turns)' },
  { value: 'beyondRadiusFar', label: 'Beyond Radius + 50+ hexes (+3 turns)' },
];

const armyCOType = ref('');
const distanceCategory = ref('');
const isReserveOrder = ref(false);

const canSubmit = computed(
  () => armyCOType.value !== '' && distanceCategory.value !== '' && !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    armyCOType: armyCOType.value,
    distanceCategory: distanceCategory.value,
    isReserveOrder: isReserveOrder.value,
  });
}

function reset() {
  armyCOType.value = '';
  distanceCategory.value = '';
  isReserveOrder.value = false;
  fetchReset();
}
</script>

<template>
  <div class="panel order-delivery-panel">
    <div class="panel-header">
      Order Delivery Table <span class="rule-ref">LOB_CHARTS §10.6a</span>
    </div>

    <div class="form">
      <label class="field">
        <span class="field-label">Army CO Awareness Type</span>
        <select v-model="armyCOType">
          <option value="" disabled>Select awareness type…</option>
          <option v-for="t in ARMY_CO_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Distance Category</span>
        <select v-model="distanceCategory">
          <option value="" disabled>Select distance…</option>
          <option v-for="d in DISTANCE_CATEGORIES" :key="d.value" :value="d.value">
            {{ d.label }}
          </option>
        </select>
      </label>

      <div class="field">
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="isReserveOrder" type="checkbox" />
            Reserve Order (halves delivery time, round down)
          </label>
        </div>
      </div>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Compute</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing order delivery…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Turns to Deliver</span>
        <span class="value turns">{{ result.turnsToDeliver }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';

.turns {
  font-size: 1.5em;
  font-weight: 700;
  color: #e0c060;
}
</style>
