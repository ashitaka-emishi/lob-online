<script setup>
import { computed } from 'vue';

// Pre-enriched display unit combining game state + OOB data.
// Shape: { id, name, side, sp, moraleState, orderType }
const props = defineProps({
  unit: {
    type: Object,
    default: null,
  },
});

const MORALE_LABELS = {
  normal: 'Normal',
  bloodLust: 'Blood Lust',
  shaken: 'Shaken',
  DG: 'Disorganized',
  routed: 'Routed',
};

const SIDE_LABELS = {
  union: 'Union',
  confederate: 'Confederate',
};

const moraleLabel = computed(() =>
  props.unit ? (MORALE_LABELS[props.unit.moraleState] ?? props.unit.moraleState) : null
);

const sideLabel = computed(() =>
  props.unit ? (SIDE_LABELS[props.unit.side] ?? props.unit.side) : null
);

const orderLabel = computed(() => {
  if (!props.unit) return null;
  if (!props.unit.orderType) return 'None';
  return props.unit.orderType.charAt(0).toUpperCase() + props.unit.orderType.slice(1);
});
</script>

<template>
  <div class="unit-stats-panel">
    <template v-if="unit">
      <p class="panel-title">{{ unit.name }}</p>
      <dl class="stat-list">
        <div class="stat-row">
          <dt>Side</dt>
          <dd>{{ sideLabel }}</dd>
        </div>
        <div class="stat-row">
          <dt>Strength</dt>
          <dd>{{ unit.sp }} SP</dd>
        </div>
        <div class="stat-row">
          <dt>Morale</dt>
          <dd>{{ moraleLabel }}</dd>
        </div>
        <div class="stat-row">
          <dt>Order</dt>
          <dd>{{ orderLabel }}</dd>
        </div>
      </dl>
    </template>
    <template v-else>
      <p class="empty-state">No unit selected</p>
    </template>
  </div>
</template>

<style scoped>
.unit-stats-panel {
  background: #1a1610;
  border: 1px solid #3a3020;
  border-radius: 4px;
  padding: 0.75rem 1rem;
  color: #c8b89a;
  font-size: 0.85rem;
  min-height: 120px;
}

.panel-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e0d0b0;
  margin: 0 0 0.6rem;
  border-bottom: 1px solid #3a3020;
  padding-bottom: 0.4rem;
}

.stat-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
}

dt {
  color: #8a7860;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
}

dd {
  margin: 0;
  color: #d0c0a0;
}

.empty-state {
  margin: 0;
  color: #6a5a40;
  font-style: italic;
  padding-top: 0.5rem;
}
</style>
