<script setup>
// LOB §6.1 — Morale Table
import { ref, computed } from 'vue';

import { useTableFetch } from './useTableFetch.js';

const {
  result,
  loading,
  error,
  submit: fetchSubmit,
  reset: fetchReset,
} = useTableFetch('/api/tools/table-test/morale');

const RATINGS = ['A', 'B', 'C', 'D', 'E', 'F'];

const rating = ref('');
const diceRoll = ref('');

// #309 — single source of truth for modifier initial state
function defaultModifiers() {
  return {
    leaderMoraleValue: 0,
    isShakenOrDG: false,
    isWrecked: false,
    isRear: false,
    isSmall: false,
    cowardlyLegs: false,
    isNight: false,
    isArtilleryOrCavalryFromSmallArms: false,
    hasProtectiveTerrain: false,
    range: 0,
  };
}

// Modifier flags — LOB §6.1 Morale Table Modifiers
const modifiers = ref(defaultModifiers());

const canSubmit = computed(() => rating.value !== '' && diceRoll.value !== '' && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  await fetchSubmit({
    rating: rating.value,
    modifiers: { ...modifiers.value },
    diceRoll: Number(diceRoll.value),
  });
}

function reset() {
  rating.value = '';
  diceRoll.value = '';
  modifiers.value = defaultModifiers();
  fetchReset();
}
</script>

<template>
  <div class="panel morale-panel">
    <div class="panel-header">Morale Table <span class="rule-ref">LOB §6.1</span></div>

    <div class="form">
      <label class="field">
        <span class="field-label">Morale Rating</span>
        <select v-model="rating">
          <option value="" disabled>Select rating…</option>
          <option v-for="r in RATINGS" :key="r" :value="r">{{ r }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Dice Roll (2d6)</span>
        <input v-model="diceRoll" type="number" min="2" max="12" placeholder="2–12" />
      </label>

      <div class="field">
        <span class="field-label">Modifiers</span>
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="modifiers.isShakenOrDG" type="checkbox" />
            Shaken or DG (+{{ 1 }})
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.isWrecked" type="checkbox" />
            Wrecked (+2)
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.isRear" type="checkbox" />
            Rear Attack (+2)
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.isSmall" type="checkbox" />
            Small Unit (+1)
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.cowardlyLegs" type="checkbox" />
            Cowardly Legs (+2)
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.isNight" type="checkbox" />
            Night (+2)
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.isArtilleryOrCavalryFromSmallArms" type="checkbox" />
            Arty/Cav from Small Arms (+1)
          </label>
          <label class="checkbox-label">
            <input v-model="modifiers.hasProtectiveTerrain" type="checkbox" />
            Protective Terrain (−2)
          </label>
        </div>
      </div>

      <label class="field">
        <span class="field-label">Leader Morale Value (subtracts)</span>
        <input
          v-model="modifiers.leaderMoraleValue"
          type="number"
          min="0"
          max="4"
          placeholder="0"
        />
      </label>

      <label class="field">
        <span class="field-label">Range (for range 10+ rule)</span>
        <input v-model="modifiers.range" type="number" min="0" placeholder="0" />
      </label>

      <div class="actions">
        <button :disabled="!canSubmit" @click="submit">Roll</button>
        <button class="reset-btn" @click="reset">Reset</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Computing morale result…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="data-row">
        <span class="label">Effective Roll</span>
        <span class="value">{{ result.effectiveRoll }}</span>
      </div>
      <div class="data-row">
        <span class="label">Result Type</span>
        <span class="value">{{ result.type }}</span>
      </div>
      <div class="data-row">
        <span class="label">Retreat Hexes</span>
        <span class="value">{{ result.retreatHexes }}</span>
      </div>
      <div class="data-row">
        <span class="label">SP Loss</span>
        <span class="value">{{ result.spLoss }}</span>
      </div>
      <div class="data-row">
        <span class="label">Leader Loss Check</span>
        <span class="value badge" :class="result.leaderLossCheck ? 'yes' : 'no'">
          {{ result.leaderLossCheck ? 'Yes' : 'No' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './panel-base.css';
</style>
