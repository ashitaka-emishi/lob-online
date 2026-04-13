<script setup>
// LOB_CHARTS §10.8c — Attack Recovery Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/attack-recovery');

const DIVISION_STATUSES = [
  { value: 'clean', label: 'Clean — no Wrecked or Dead units (threshold 8)' },
  { value: 'wrecked', label: 'Has Wrecked units, no Dead (threshold 9)' },
  { value: 'dead', label: 'Has Dead (eliminated) units (threshold 10)' },
];

const divisionStatus = ref('');
const commandValue = ref('');
const step1Roll = ref('');
const step2Roll = ref('7');

const canSubmit = computed(
  () =>
    divisionStatus.value !== '' &&
    commandValue.value !== '' &&
    step1Roll.value !== '' &&
    !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    divisionStatus: divisionStatus.value,
    commandValue: Number(commandValue.value),
    step1Roll: Number(step1Roll.value),
    step2Roll: Number(step2Roll.value),
  });
}

function reset() {
  divisionStatus.value = '';
  commandValue.value = '';
  step1Roll.value = '';
  step2Roll.value = '7';
  fetchReset();
}
</script>

<template>
  <div class="panel attack-recovery-panel">
    <div class="panel-header">
      Attack Recovery Table <span class="rule-ref">LOB_CHARTS §10.8c</span>
    </div>

    <div class="form">
      <label class="field">
        <span class="field-label">Division Status</span>
        <select v-model="divisionStatus">
          <option value="" disabled>Select status…</option>
          <option v-for="s in DIVISION_STATUSES" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Command Value</span>
        <input v-model="commandValue" type="number" min="0" max="6" placeholder="0–6" />
      </label>

      <label class="field">
        <span class="field-label">Step 1 Roll — Base Check (2d6, no modifiers)</span>
        <input v-model="step1Roll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <label class="field">
        <span class="field-label">Step 2 Roll — Leader Roll (2d6, if Step 1 passes)</span>
        <input v-model="step2Roll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing attack recovery…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Step 1 Threshold</span>
        <span class="value">{{ result.step1Threshold }}</span>
      </div>
      <div class="data-row">
        <span class="label">Base Check</span>
        <span class="pass-badge" :class="result.basePass ? 'pass' : 'fail'">
          {{ result.basePass ? 'PASS' : 'FAIL' }}
        </span>
      </div>
      <template v-if="result.step2Required">
        <div class="data-row">
          <span class="label">Step 2 Roll</span>
          <span class="value">{{ result.step2EffectiveRoll }}</span>
        </div>
        <div class="data-row">
          <span class="label">Step 2 Threshold</span>
          <span class="value">{{ result.step2Threshold }}</span>
        </div>
      </template>
      <div class="data-row">
        <span class="label">Recovery</span>
        <span class="pass-badge" :class="result.recovered ? 'pass' : 'fail'">
          {{ result.recovered ? 'RECOVERED' : 'NO RECOVERY' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';
</style>
