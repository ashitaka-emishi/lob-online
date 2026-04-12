<script setup>
// LOB_CHARTS §10.6 — Command Roll Table
import { ref, computed } from 'vue';

const commandValue = ref('');
const isReserve = ref(false);
const isDeployment = ref(false);
const diceRoll = ref('');

const result = ref(null);
const loading = ref(false);
const error = ref(null);

const canSubmit = computed(
  () => commandValue.value !== '' && diceRoll.value !== '' && !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = null;
  result.value = null;

  try {
    const res = await fetch('/api/tools/table-test/command-roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandValue: Number(commandValue.value),
        isReserve: isReserve.value,
        isDeployment: isDeployment.value,
        diceRoll: Number(diceRoll.value),
      }),
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
  commandValue.value = '';
  isReserve.value = false;
  isDeployment.value = false;
  diceRoll.value = '';
  result.value = null;
  error.value = null;
}
</script>

<template>
  <div class="panel command-roll-panel">
    <div class="panel-header">
      Command Roll Table <span class="rule-ref">LOB_CHARTS §10.6</span>
    </div>

    <div class="form">
      <label class="field">
        <span class="field-label">Command Value</span>
        <input v-model="commandValue" type="number" min="0" max="6" placeholder="0–6" />
      </label>

      <label class="field">
        <span class="field-label">Dice Roll (2d6)</span>
        <input v-model="diceRoll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <div class="field">
        <span class="field-label">Modifiers</span>
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="isReserve" type="checkbox" />
            Formation in Reserve (+2)
          </label>
          <label class="checkbox-label">
            <input v-model="isDeployment" type="checkbox" />
            Deployment from Move Order (+2)
          </label>
        </div>
      </div>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing command roll…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Result</span>
        <span class="pass-badge" :class="result.yes ? 'pass' : 'fail'">
          {{ result.yes ? 'YES' : 'NO' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">Modified Roll</span>
        <span class="value">{{ result.modifiedRoll }}</span>
      </div>
      <div class="data-row">
        <span class="label">Threshold</span>
        <span class="value">10</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';
</style>
