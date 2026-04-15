<script setup>
// LOB_CHARTS §9.1e — Zero Rule
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/zero-rule');

const diceRoll = ref('');

const canSubmit = computed(() => diceRoll.value !== '' && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({ diceRoll: Number(diceRoll.value) });
}

function reset() {
  diceRoll.value = '';
  fetchReset();
}

const MA_LABELS = { none: 'No MA', half: 'Half MA', full: 'Full MA' };
const MA_CLASS = { none: 'ma-none', half: 'ma-half', full: 'ma-full' };
</script>

<template>
  <div class="panel zero-rule-panel">
    <div class="panel-header">Zero Rule <span class="rule-ref">LOB_CHARTS §9.1e</span></div>

    <p class="description">
      Applies to brigade leaders with Command Value 0 on Attack orders (not if Zero was just gained
      this phase).
    </p>

    <div class="form">
      <label class="field">
        <span class="field-label">Dice Roll (1d6)</span>
        <input v-model="diceRoll" type="number" min="1" max="6" placeholder="1–6" />
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing zero rule result…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Movement Allowance</span>
        <span class="value ma-result" :class="MA_CLASS[result.ma]">
          {{ MA_LABELS[result.ma] ?? result.ma }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';

.description {
  font-size: 11px;
  color: #888;
  margin-bottom: 12px;
  font-style: italic;
}

.ma-result {
  font-size: 1.3em;
  font-weight: 700;
}

.ma-none {
  color: #f87171;
}
.ma-half {
  color: #e0c060;
}
.ma-full {
  color: #7dd87d;
}
</style>
