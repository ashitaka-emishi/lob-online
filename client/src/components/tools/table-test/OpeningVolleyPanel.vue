<script setup>
// LOB_CHARTS §5.4 — Opening Volley Table
import { ref, computed } from 'vue';

const CONDITIONS = [
  { value: 'range3', label: 'Range 3' },
  { value: 'range2', label: 'Range 2' },
  { value: 'range1', label: 'Range 1' },
  { value: 'charge', label: 'Charge' },
  { value: 'shiftOnly', label: 'Shift Only' },
];

const condition = ref('');
const diceRoll = ref('');

const result = ref(null);
const loading = ref(false);
const error = ref(null);

const canSubmit = computed(() => condition.value !== '' && diceRoll.value !== '' && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const res = await fetch('/api/tools/table-test/opening-volley', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition: condition.value, diceRoll: Number(diceRoll.value) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    result.value = await res.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function reset() {
  condition.value = '';
  diceRoll.value = '';
  result.value = null;
  error.value = null;
}
</script>

<template>
  <div class="panel opening-volley-panel">
    <div class="panel-header">
      Opening Volley Table <span class="rule-ref">LOB_CHARTS §5.4</span>
    </div>

    <div class="form">
      <label class="field">
        <span class="field-label">Condition / Column</span>
        <select v-model="condition">
          <option value="" disabled>Select condition…</option>
          <option v-for="c in CONDITIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Dice Roll (1d6)</span>
        <input v-model="diceRoll" type="number" min="1" max="6" placeholder="1–6" />
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing opening volley result…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">SP Loss</span>
        <span class="value sp-loss">{{ result.spLoss }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';

.sp-loss {
  font-size: 1.4em;
  font-weight: 700;
  color: #f0c060;
}
</style>
