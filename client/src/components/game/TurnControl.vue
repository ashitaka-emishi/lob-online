<script setup>
import { computed } from 'vue';
import { computeTurnTime } from '../../utils/turnTime.js';

const props = defineProps({
  turn: { type: Number, default: null },
  phase: { type: String, default: null },
  activeSide: { type: String, default: null },
  scenario: { type: Object, default: null },
});

const turnInfo = computed(() => {
  if (props.turn == null || !props.scenario) return null;
  return computeTurnTime(props.turn, props.scenario);
});
</script>

<template>
  <div v-if="turn !== null && scenario" class="turn-control" data-testid="turn-control">
    <div class="turn-row">
      <span class="turn-label">Turn</span>
      <span class="turn-number" data-testid="turn-number">{{ turn }}</span>
      <span v-if="turnInfo" class="turn-time" data-testid="turn-time">{{ turnInfo.time }}</span>
    </div>
    <div v-if="turnInfo" class="condition-row">
      <span class="condition" :data-condition="turnInfo.condition" data-testid="turn-condition">
        {{ turnInfo.condition }}
      </span>
      <span class="visibility" data-testid="turn-visibility">
        {{ turnInfo.visibilityHexes === 999 ? 'Unlimited' : turnInfo.visibilityHexes + ' hex' }}
      </span>
    </div>
    <div v-if="turnInfo?.date" class="date-row" data-testid="turn-date">
      {{ turnInfo.date }}
    </div>
    <div v-if="activeSide" class="side-row" data-testid="turn-active-side">
      {{ activeSide }}
    </div>
    <div v-if="phase" class="phase-row" data-testid="turn-phase">
      {{ phase }}
    </div>
  </div>
</template>

<style scoped>
.turn-control {
  padding: 0.5rem 0;
  border-bottom: 1px solid #2a2418;
  color: #c8b89a;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.turn-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.turn-label {
  color: #7a6a5a;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
}

.turn-number {
  font-weight: 600;
  color: #e8d8b8;
}

.turn-time {
  color: #a89a7a;
}

.condition-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.condition {
  text-transform: capitalize;
  color: #a89a7a;
}

.condition[data-condition='night'] {
  color: #7a8aa0;
}

.condition[data-condition='twilight'] {
  color: #9a8a6a;
}

.visibility {
  color: #7a6a5a;
  font-size: 0.75rem;
}

.date-row {
  color: #6a5a4a;
  font-size: 0.75rem;
}

.side-row {
  color: #a89a7a;
  text-transform: capitalize;
}

.phase-row {
  color: #8a7a6a;
  text-transform: capitalize;
}
</style>
