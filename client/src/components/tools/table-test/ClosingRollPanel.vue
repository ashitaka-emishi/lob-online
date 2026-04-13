<script setup>
// LOB_CHARTS §3.5 — Closing Roll Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/closing-roll');

const RATINGS = ['A', 'B', 'C', 'D', 'E', 'F'];

const moraleRating = ref('');
const diceRoll = ref('');
const mods = ref({
  hasLeaderMorale2Plus: false,
  isRear: false,
  isShaken: false,
  frontalArtilleryWithCanister: false,
  startsAdjacentToTarget: false,
  targetInBreastworks: false,
});

const canSubmit = computed(
  () => moraleRating.value !== '' && diceRoll.value !== '' && !loading.value
);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    moraleRating: moraleRating.value,
    mods: { ...mods.value },
    diceRoll: Number(diceRoll.value),
  });
}

function reset() {
  moraleRating.value = '';
  diceRoll.value = '';
  mods.value = {
    hasLeaderMorale2Plus: false,
    isRear: false,
    isShaken: false,
    frontalArtilleryWithCanister: false,
    startsAdjacentToTarget: false,
    targetInBreastworks: false,
  };
  fetchReset();
}
</script>

<template>
  <div class="panel closing-roll-panel">
    <div class="panel-header">Closing Roll Table <span class="rule-ref">LOB_CHARTS §3.5</span></div>

    <div class="form">
      <label class="field">
        <span class="field-label">Morale Rating</span>
        <select v-model="moraleRating">
          <option value="" disabled>Select rating…</option>
          <option v-for="r in RATINGS" :key="r" :value="r">{{ r }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Dice Roll (1d6)</span>
        <input v-model="diceRoll" type="number" min="1" max="6" placeholder="1–6" />
      </label>

      <div class="field">
        <span class="field-label">Modifiers</span>
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="mods.hasLeaderMorale2Plus" type="checkbox" />
            Leader Morale Value 2+ in stack (+1)
          </label>
          <label class="checkbox-label">
            <input v-model="mods.isRear" type="checkbox" />
            Charging into Rear hex (+1)
          </label>
          <label class="checkbox-label">
            <input v-model="mods.isShaken" type="checkbox" />
            Charging stack is Shaken (−1)
          </label>
          <label class="checkbox-label">
            <input v-model="mods.frontalArtilleryWithCanister" type="checkbox" />
            Frontal Artillery with Canister (−1)
          </label>
          <label class="checkbox-label">
            <input v-model="mods.startsAdjacentToTarget" type="checkbox" />
            Starts adjacent to target hex (−3)
          </label>
          <label class="checkbox-label">
            <input v-model="mods.targetInBreastworks" type="checkbox" />
            Target in Breastworks (−3, N/A in SM)
          </label>
        </div>
      </div>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing closing roll…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Result</span>
        <span class="pass-badge" :class="result.pass ? 'pass' : 'fail'">
          {{ result.pass ? 'PASS' : 'FAIL' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">Modified Roll</span>
        <span class="value">{{ result.modifiedRoll }}</span>
      </div>
      <div class="data-row">
        <span class="label">Threshold</span>
        <span class="value">{{ result.threshold }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';
</style>
