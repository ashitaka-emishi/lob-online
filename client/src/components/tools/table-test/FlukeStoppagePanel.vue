<script setup>
// LOB_CHARTS §10.7b — Fluke Stoppage Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/fluke-stoppage');

const commandValue = ref('');
const hasReserve = ref(false);
const isNight = ref(false);
const step1Roll = ref('');
const step2Roll = ref('7');

const canSubmit = computed(
  () => commandValue.value !== '' && step1Roll.value !== '' && !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    commandValue: Number(commandValue.value),
    hasReserve: hasReserve.value,
    isNight: isNight.value,
    step1Roll: Number(step1Roll.value),
    step2Roll: Number(step2Roll.value),
  });
}

function reset() {
  commandValue.value = '';
  hasReserve.value = false;
  isNight.value = false;
  step1Roll.value = '';
  step2Roll.value = '7';
  fetchReset();
}
</script>

<template>
  <div class="panel fluke-stoppage-panel">
    <div class="panel-header">
      Fluke Stoppage Table <span class="rule-ref">LOB_CHARTS §10.7b</span>
    </div>

    <div class="form">
      <label class="field">
        <span class="field-label">Command Value</span>
        <input v-model="commandValue" type="number" min="0" max="6" placeholder="0–6" />
      </label>

      <div class="field">
        <span class="field-label">Conditions</span>
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="hasReserve" type="checkbox" />
            Has qualifying Reserve (+2 to Step 1, day only)
          </label>
          <label class="checkbox-label">
            <input v-model="isNight" type="checkbox" />
            Night turn (−2 Step 1; −1 Step 2; Reserve bonus suppressed)
          </label>
        </div>
      </div>

      <label class="field">
        <span class="field-label">Step 1 Roll — Base Check (2d6)</span>
        <input v-model="step1Roll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <label class="field">
        <span class="field-label">Step 2 Roll — Leader Roll (2d6, if needed)</span>
        <input v-model="step2Roll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing fluke stoppage…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Step 1 Effective Roll</span>
        <span class="value">{{ result.step1EffectiveRoll }}</span>
      </div>
      <div class="data-row">
        <span class="label">Base Check</span>
        <span class="pass-badge" :class="result.basePass ? 'pass' : 'fail'">
          {{ result.basePass ? 'PASS' : 'FAIL' }}
        </span>
      </div>
      <template v-if="result.step2Required">
        <div class="data-row">
          <span class="label">Step 2 Effective Roll</span>
          <span class="value">{{ result.step2EffectiveRoll }}</span>
        </div>
        <div class="data-row">
          <span class="label">Step 2 Threshold</span>
          <span class="value">{{ result.step2Threshold }}</span>
        </div>
      </template>
      <div class="data-row">
        <span class="label">Stoppage</span>
        <span class="pass-badge" :class="result.stoppage ? 'fail' : 'pass'">
          {{ result.stoppage ? 'STOPPAGE' : 'NO STOPPAGE' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';
</style>
