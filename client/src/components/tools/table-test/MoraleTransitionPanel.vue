<script setup>
// LOB §6.2a — Additive Morale Effects Chart
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/morale-transition');

const STATES = [
  { value: 'bl', label: 'Battle Line (bl)' },
  { value: 'normal', label: 'Normal' },
  { value: 'shaken', label: 'Shaken' },
  { value: 'dg', label: 'Disorganized (dg)' },
  { value: 'rout', label: 'Rout' },
];

const INCOMING_RESULTS = [
  { value: 'bl', label: 'Battle Line (bl)' },
  { value: 'normal', label: 'Normal / No Effect' },
  { value: 'shaken', label: 'Shaken' },
  { value: 'dg', label: 'Disorganized (dg)' },
  { value: 'rout', label: 'Rout' },
  { value: 'townHex', label: 'Town Hex' },
];

const currentState = ref('');
const incomingResult = ref('');

const canSubmit = computed(
  () => currentState.value !== '' && incomingResult.value !== '' && !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({ currentState: currentState.value, incomingResult: incomingResult.value });
}

function reset() {
  currentState.value = '';
  incomingResult.value = '';
  fetchReset();
}
</script>

<template>
  <div class="panel morale-transition-panel">
    <div class="panel-header">Morale State Transition <span class="rule-ref">LOB §6.2a</span></div>

    <div class="form">
      <label class="field">
        <span class="field-label">Current State</span>
        <select v-model="currentState">
          <option value="" disabled>Select current state…</option>
          <option v-for="s in STATES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Incoming Result</span>
        <select v-model="incomingResult">
          <option value="" disabled>Select incoming result…</option>
          <option v-for="r in INCOMING_RESULTS" :key="r.value" :value="r.value">
            {{ r.label }}
          </option>
        </select>
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Resolve</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Resolving transition…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">New State</span>
        <span class="value state-value">{{ result.newState }}</span>
      </div>
      <div class="data-row">
        <span class="label">Suppress Retreats & Losses</span>
        <span class="value badge" :class="result.suppressRetreatsAndLosses ? 'yes' : 'no'">
          {{ result.suppressRetreatsAndLosses ? 'Yes' : 'No' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';

.state-value {
  font-weight: 700;
  font-size: 1.1em;
  color: #e0c060;
}
</style>
