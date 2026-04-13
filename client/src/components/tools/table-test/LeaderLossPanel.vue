<script setup>
// LOB_CHARTS §9.1a — Leader Loss Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/leader-loss');

const SITUATIONS = [
  { value: 'other', label: 'Other Cases' },
  { value: 'capture', label: 'Capture' },
  { value: 'defender', label: 'Defender (Charge, with SP loss)' },
  { value: 'attacker', label: 'Attacker (Charge, with SP loss)' },
];

const situation = ref('');
const isSharpshooter = ref(false);
const diceRoll = ref('');

const canSubmit = computed(() => situation.value !== '' && diceRoll.value !== '' && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    situation: situation.value,
    isSharpshooter: isSharpshooter.value,
    diceRoll: Number(diceRoll.value),
  });
}

function reset() {
  situation.value = '';
  isSharpshooter.value = false;
  diceRoll.value = '';
  fetchReset();
}

const RESULT_CLASS = {
  noEffect: 'result-none',
  captured: 'result-captured',
  wounded: 'result-wounded',
  killed: 'result-killed',
};
</script>

<template>
  <div class="panel leader-loss-panel">
    <div class="panel-header">Leader Loss Table <span class="rule-ref">LOB_CHARTS §9.1a</span></div>

    <div class="form">
      <label class="field">
        <span class="field-label">Situation</span>
        <select v-model="situation">
          <option value="" disabled>Select situation…</option>
          <option v-for="s in SITUATIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Dice Roll (2d6)</span>
        <input v-model="diceRoll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <div class="field">
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="isSharpshooter" type="checkbox" />
            Fire from Sharpshooter-Capable unit (+1)
          </label>
        </div>
      </div>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing leader loss result…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Result</span>
        <span class="value result-label" :class="RESULT_CLASS[result.result]">
          {{ result.result }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';

.result-label {
  font-size: 1.2em;
  font-weight: 700;
  text-transform: capitalize;
}

.result-none {
  color: #888;
}
.result-captured {
  color: #60a8e0;
}
.result-wounded {
  color: #e0c060;
}
.result-killed {
  color: #f87171;
}
</style>
