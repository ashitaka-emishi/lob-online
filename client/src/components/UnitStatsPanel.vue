<script setup>
import { computed, ref, watch } from 'vue';

// Pre-enriched display unit combining game state + OOB data.
// Shape: { id, name, side, sp, moraleState, orderType, weapon, counterFile }
const props = defineProps({
  unit: {
    type: Object,
    default: null,
  },
  // All enriched units at the selected hex — enables paging when length > 1. (#408)
  // Takes precedence over `unit`: when hexUnits is non-empty, displayUnit is hexUnits[pageIndex].
  // `unit` is the single-selection fallback used only when hexUnits is empty.
  hexUnits: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['select-unit']);

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

// ── Paging ────────────────────────────────────────────────────────────────────

const pageIndex = ref(0);

// Reset to first unit whenever the hex changes — compare by unit ID list so that
// calling gameStore.selectUnit() during paging (same hex, new array reference) does
// not spuriously reset the page index. (#408)
watch(
  () => props.hexUnits.map((u) => u.id).join(','),
  () => {
    pageIndex.value = 0;
  }
);

const isPaging = computed(() => props.hexUnits.length > 1);

// When paging is active, show hexUnits[pageIndex]; otherwise fall back to unit prop.
const displayUnit = computed(() => {
  if (props.hexUnits.length > 0) return props.hexUnits[pageIndex.value] ?? null;
  return props.unit;
});

const pageLabel = computed(() => `${pageIndex.value + 1} / ${props.hexUnits.length}`);

function nextUnit() {
  pageIndex.value = (pageIndex.value + 1) % props.hexUnits.length;
  emit('select-unit', props.hexUnits[pageIndex.value]?.id ?? null);
}

function prevUnit() {
  pageIndex.value = (pageIndex.value - 1 + props.hexUnits.length) % props.hexUnits.length;
  emit('select-unit', props.hexUnits[pageIndex.value]?.id ?? null);
}

// ── Derived display values ────────────────────────────────────────────────────

const moraleLabel = computed(() =>
  displayUnit.value
    ? (MORALE_LABELS[displayUnit.value.moraleState] ?? displayUnit.value.moraleState)
    : null
);

const sideLabel = computed(() => {
  if (!displayUnit.value) return null;
  return SIDE_LABELS[displayUnit.value.side] ?? displayUnit.value.side ?? 'Unknown';
});

const orderLabel = computed(() => {
  if (!displayUnit.value) return null;
  if (!displayUnit.value.orderType) return 'None';
  const t = displayUnit.value.orderType;
  return t.charAt(0).toUpperCase() + t.slice(1);
});

// CSS modifier class for faction header color. (#408)
const titleClass = computed(() => {
  const side = displayUnit.value?.side;
  if (side === 'confederate') return 'panel-title panel-title--confederate';
  if (side === 'union') return 'panel-title panel-title--union';
  return 'panel-title';
});

const counterSrc = computed(() => {
  const cf = displayUnit.value?.counterFile;
  return cf ? `/counters/${cf}` : null;
});

// Announced to screen readers when selection changes. Including page position ensures the
// live region re-fires even when adjacent units share a name (polite regions only fire on
// text change). (#a11y)
const selectionAnnouncement = computed(() => {
  if (!displayUnit.value) return '';
  const base = `${displayUnit.value.name} selected`;
  return isPaging.value ? `${base}, ${pageLabel.value}` : base;
});
</script>

<template>
  <div class="unit-stats-panel">
    <!-- Screen reader live region: announces unit selection changes -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ selectionAnnouncement }}
    </div>
    <template v-if="displayUnit">
      <div class="panel-header">
        <img
          v-if="counterSrc"
          :src="counterSrc"
          :alt="`${displayUnit.name} counter`"
          class="counter-image"
        />
        <p :class="titleClass">{{ displayUnit.name }}</p>
      </div>

      <!-- Multi-unit paging controls (#408) -->
      <div v-if="isPaging" class="paging-controls" role="group" aria-label="Unit paging">
        <button
          data-testid="paging-prev"
          class="paging-btn"
          aria-label="Previous unit"
          @click="prevUnit"
        >
          ‹
        </button>
        <span class="paging-label">{{ pageLabel }}</span>
        <button
          data-testid="paging-next"
          class="paging-btn"
          aria-label="Next unit"
          @click="nextUnit"
        >
          ›
        </button>
      </div>

      <dl class="stat-list">
        <div class="stat-row">
          <dt>Side</dt>
          <dd>{{ sideLabel }}</dd>
        </div>
        <div class="stat-row">
          <dt>Strength</dt>
          <dd>{{ displayUnit.sp }} SP</dd>
        </div>
        <div v-if="displayUnit.weapon != null" class="stat-row stat-row--weapon">
          <dt>Weapon</dt>
          <dd>{{ displayUnit.weapon }}</dd>
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

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid #3a3020;
  padding-bottom: 0.4rem;
}

.counter-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
  border: 1px solid #3a3020;
}

.panel-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e0d0b0;
  margin: 0;
  flex: 1;
}

/* Faction header colors (#408) */
.panel-title--confederate {
  color: #d46060;
}

.panel-title--union {
  color: #6090d4;
}

/* Multi-unit paging (#408) */
.paging-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  font-size: 0.78rem;
  color: #a09278;
}

.paging-btn {
  background: none;
  border: 1px solid #3a3020;
  border-radius: 3px;
  color: #c8b89a;
  cursor: pointer;
  padding: 0 0.35rem;
  line-height: 1.4;
  font-size: 0.9rem;
}

.paging-btn:hover {
  background: #2a2418;
}

.paging-label {
  min-width: 2.5rem;
  text-align: center;
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
  /* #a09278 on #1a1610 meets WCAG AA at this font-size when bold (4.6:1 contrast) */
  color: #a09278;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

dd {
  margin: 0;
  color: #d0c0a0;
}

.empty-state {
  margin: 0;
  /* #8a7860 on #1a1610 ≈ 3.8:1 — acceptable for italic body text */
  color: #8a7860;
  font-style: italic;
  padding-top: 0.5rem;
}

/* Visually hidden but readable by screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
