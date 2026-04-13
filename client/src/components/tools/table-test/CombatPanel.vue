<script setup>
// LOB_CHARTS §5.6 — Combat Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/combat');

const effectiveSPs = ref('');
const netColumnShifts = ref('0');
const diceRoll = ref('');

const canSubmit = computed(
  () => effectiveSPs.value !== '' && diceRoll.value !== '' && !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    effectiveSPs: Number(effectiveSPs.value),
    netColumnShifts: Number(netColumnShifts.value),
    diceRoll: Number(diceRoll.value),
  });
}

function reset() {
  effectiveSPs.value = '';
  netColumnShifts.value = '0';
  diceRoll.value = '';
  fetchReset();
}
</script>

<template>
  <div class="panel combat-panel">
    <div class="panel-header">Combat Table <span class="rule-ref">LOB_CHARTS §5.6</span></div>

    <div class="form">
      <label class="field">
        <span class="field-label">Effective SPs</span>
        <input v-model="effectiveSPs" type="number" min="0" placeholder="e.g. 6" />
      </label>

      <label class="field">
        <span class="field-label">Net Column Shifts (+ right / − left)</span>
        <input v-model="netColumnShifts" type="number" placeholder="0" />
      </label>

      <label class="field">
        <span class="field-label">Dice Roll (2d6)</span>
        <input v-model="diceRoll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing combat result…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Final Column</span>
        <span class="value">{{ result.finalColumn }}</span>
      </div>
      <div class="data-row">
        <span class="label">Result Type</span>
        <span class="value" :class="'result-' + result.resultType">{{ result.resultType }}</span>
      </div>
      <div class="data-row">
        <span class="label">SP Loss</span>
        <span class="value">{{ result.spLoss }}</span>
      </div>
      <div class="data-row">
        <span class="label">Morale Check</span>
        <span class="value badge" :class="result.moraleCheckRequired ? 'yes' : 'no'">
          {{ result.moraleCheckRequired ? 'Yes' : 'No' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">Leader Loss Check</span>
        <span class="value badge" :class="result.leaderLossCheckRequired ? 'yes' : 'no'">
          {{ result.leaderLossCheckRequired ? 'Yes' : 'No' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">Depletion Band</span>
        <span class="value">{{ result.depletionBand }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';

.result-none {
  color: #888;
}
.result-morale {
  color: #e0c060;
}
.result-full {
  color: #f87171;
}
</style>
