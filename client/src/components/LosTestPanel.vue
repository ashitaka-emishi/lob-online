<script setup>
import { ref, watch } from 'vue';
import { evaluateLos } from '../utils/los.js';

const props = defineProps({
  hexA: { type: String, default: null },
  hexB: { type: String, default: null },
  mapData: { type: Object, default: null },
  gridSpec: { type: Object, default: null },
  selectingHex: { type: String, default: null }, // 'A' | 'B' | null
});

const emit = defineEmits(['pick-start', 'pick-cancel', 'set-hex-a', 'set-hex-b', 'los-result']);

const losResult = ref(null);

// Local input values (user can type directly)
const inputA = ref(props.hexA ?? '');
const inputB = ref(props.hexB ?? '');

// Keep inputs in sync with prop updates (e.g. from map pick)
watch(
  () => props.hexA,
  (v) => {
    inputA.value = v ?? '';
  }
);
watch(
  () => props.hexB,
  (v) => {
    inputB.value = v ?? '';
  }
);

function onInputA() {
  emit('set-hex-a', inputA.value.trim() || null);
}

function onInputB() {
  emit('set-hex-b', inputB.value.trim() || null);
}

function onPickA() {
  if (props.selectingHex === 'A') {
    emit('pick-cancel');
  } else {
    emit('pick-start', 'A');
  }
}

function onPickB() {
  if (props.selectingHex === 'B') {
    emit('pick-cancel');
  } else {
    emit('pick-start', 'B');
  }
}

function runLos() {
  if (!props.hexA || !props.hexB || !props.mapData) return;
  const effectiveGridSpec = props.gridSpec ?? props.mapData.gridSpec;
  const mapWithGrid = { ...props.mapData, gridSpec: effectiveGridSpec };
  const result = evaluateLos(props.hexA, props.hexB, mapWithGrid);
  losResult.value = result;
  emit('los-result', result);
}

function roleLabel(role) {
  if (role === 'observer') return 'observer';
  if (role === 'target') return 'target';
  return 'intermediate';
}
</script>

<template>
  <div class="los-panel">
    <!-- From / To inputs -->
    <div class="los-row">
      <label class="los-label">From</label>
      <input
        v-model="inputA"
        class="los-input"
        :placeholder="selectingHex === 'A' ? 'click a hex…' : 'e.g. 19.23'"
        :class="{ picking: selectingHex === 'A' }"
        @change="onInputA"
      />
      <button class="los-pick-btn" :class="{ active: selectingHex === 'A' }" @click="onPickA">
        {{ selectingHex === 'A' ? 'Cancel' : 'Pick A' }}
      </button>
    </div>
    <div class="los-row">
      <label class="los-label">To</label>
      <input
        v-model="inputB"
        class="los-input"
        :placeholder="selectingHex === 'B' ? 'click a hex…' : 'e.g. 24.18'"
        :class="{ picking: selectingHex === 'B' }"
        @change="onInputB"
      />
      <button class="los-pick-btn" :class="{ active: selectingHex === 'B' }" @click="onPickB">
        {{ selectingHex === 'B' ? 'Cancel' : 'Pick B' }}
      </button>
    </div>

    <button class="los-run-btn" :disabled="!hexA || !hexB || !mapData" @click="runLos">
      Test LOS
    </button>

    <!-- Result -->
    <div v-if="losResult" class="los-result">
      <div class="los-badge" :class="losResult.clear ? 'clear' : 'blocked'">
        {{ losResult.clear ? '○ CLEAR' : '● BLOCKED' }}
      </div>

      <div class="los-steps">
        <div
          v-for="step in losResult.steps"
          :key="step.hexId + step.role"
          class="los-step"
          :class="{ 'step-blocked': step.blocked, 'step-no-data': step.noData }"
        >
          <div class="step-header">
            <span class="step-hex">{{ step.hexId }}</span>
            <span class="step-role">{{ roleLabel(step.role) }}</span>
            <span v-if="step.blocked" class="step-blocked-icon">⛔</span>
          </div>
          <div class="step-detail">
            <span v-if="step.noData" class="step-no-data-note">(no data — assumed elev 0)</span>
            <template v-else>
              elev {{ step.elevation ?? 0 }}
              <template v-if="step.terrainBonus > 0"> + {{ step.terrainBonus }}(trees)</template>
              = {{ step.effectiveHeight }}
            </template>
            <template v-if="step.role === 'intermediate'">
              <span class="step-los-line"> | LOS line {{ step.losLineHeight.toFixed(1) }}</span>
            </template>
          </div>
          <div v-if="step.edgeFeatures.length > 0" class="step-edges">
            <span v-for="(ef, i) in step.edgeFeatures" :key="i" class="step-edge-feat">
              {{ ef.dir }} {{ ef.type }}<template v-if="ef.losBlocking"> (blocking)</template
              ><template v-else-if="ef.losHeightBonus"> (+{{ ef.losHeightBonus }})</template>
            </span>
          </div>
          <div v-if="step.blockReason" class="step-block-reason">{{ step.blockReason }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.los-panel {
  padding: 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #c8b88a;
}

.los-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.los-label {
  width: 2rem;
  flex-shrink: 0;
  color: #a09880;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.los-input {
  flex: 1;
  min-width: 0;
  background: #1e1e1e;
  border: 1px solid #444;
  color: #e0d8c8;
  padding: 0.2rem 0.35rem;
  font-size: 0.78rem;
  font-family: monospace;
}

.los-input.picking {
  border-color: #cc8844;
  color: #cc8844;
}

.los-pick-btn {
  padding: 0.18rem 0.4rem;
  background: #2a2a2a;
  border: 1px solid #555;
  color: #a09880;
  cursor: pointer;
  font-size: 0.72rem;
  white-space: nowrap;
}

.los-pick-btn.active {
  background: #3a2a18;
  border-color: #cc8844;
  color: #cc8844;
}

.los-pick-btn:hover {
  background: #333;
  color: #c8b88a;
}

.los-run-btn {
  padding: 0.3rem;
  background: #2a3a2a;
  border: 1px solid #4a6a3a;
  color: #88c080;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: inherit;
  letter-spacing: 0.03em;
}

.los-run-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.los-run-btn:not(:disabled):hover {
  background: #354535;
}

.los-result {
  margin-top: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.los-badge {
  padding: 0.2rem 0.5rem;
  font-weight: bold;
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  text-align: center;
}

.los-badge.clear {
  background: #1a2e1a;
  color: #7acc7a;
  border: 1px solid #3a6a3a;
}

.los-badge.blocked {
  background: #2e1a1a;
  color: #cc7070;
  border: 1px solid #6a3a3a;
}

.los-steps {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 320px;
  overflow-y: auto;
}

.los-step {
  background: #1e1e1e;
  border: 1px solid #333;
  padding: 0.25rem 0.4rem;
}

.los-step.step-blocked {
  border-color: #7a3a3a;
  background: #221818;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.step-hex {
  font-family: monospace;
  color: #ffdd88;
  font-size: 0.8rem;
}

.step-role {
  color: #7a7060;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.step-blocked-icon {
  font-size: 0.75rem;
}

.step-detail {
  margin-top: 0.15rem;
  color: #a09880;
  font-size: 0.72rem;
}

.step-los-line {
  color: #7a8aaa;
}

.step-no-data-note {
  color: #7a7060;
  font-style: italic;
}

.step-edges {
  margin-top: 0.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.step-edge-feat {
  background: #2a2218;
  border: 1px solid #554430;
  padding: 0.05rem 0.3rem;
  font-size: 0.68rem;
  color: #c0a060;
  font-family: monospace;
}

.step-block-reason {
  margin-top: 0.1rem;
  font-size: 0.68rem;
  color: #cc7070;
  font-style: italic;
}
</style>
