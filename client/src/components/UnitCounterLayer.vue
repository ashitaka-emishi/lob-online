<script setup>
import { computed } from 'vue';

const props = defineProps({
  // Array of { id, hexId, counterFile, side } — enriched by parent from game state + OOB
  units: {
    type: Array,
    default: () => [],
  },
  // Map<hexId, { cx, cy }> — subset of gridData.cellById from HexMapOverlay
  cellById: {
    type: Map,
    required: true,
  },
  // Rendered counter size as a fraction of hex inradius (e.g. 0.8 = 80% of the inradius diameter).
  sizeRatio: {
    type: Number,
    default: 0.8,
  },
  // Hex inradius in SVG user units — matches hexHeight from HexMapOverlay calibration.
  hexInradius: {
    type: Number,
    default: 28,
  },
  // URL base path prepended to counterFile when building the image href. Must end with '/'.
  counterBasePath: {
    type: String,
    default: '/counters/',
  },
});

const emit = defineEmits(['unit-click']);

// Counter size in SVG user units.
const counterSize = computed(() => props.hexInradius * props.sizeRatio);

// Horizontal stagger for counters sharing a hex, in SVG user units.
const STACK_OFFSET = 4;

// Allow filenames with alphanumeric, spaces, hyphens, underscores, dots — no path separators.
const SAFE_FILENAME_RE = /^[\w. ()-]+$/;

function counterHref(counterFile) {
  if (!counterFile || !SAFE_FILENAME_RE.test(counterFile)) return null;
  return `${props.counterBasePath}${counterFile}`;
}

// Build the render list: one entry per on-board unit with a known hex cell and a safe href.
// Units at the same hex are sorted by insertion order and offset by STACK_OFFSET * stackIndex.
const renderUnits = computed(() => {
  const size = counterSize.value;
  const stackCount = new Map();

  return props.units.flatMap((unit) => {
    const cell = props.cellById.get(unit.hexId);
    if (!cell) return [];

    const href = counterHref(unit.counterFile);
    if (!href) return [];

    const stackIndex = stackCount.get(unit.hexId) ?? 0;
    stackCount.set(unit.hexId, stackIndex + 1);

    const xOffset = stackIndex * STACK_OFFSET;
    const x = cell.cx - size / 2 + xOffset;
    const y = cell.cy - size / 2;

    return [{ unit, x, y, size, href }];
  });
});

function handleKeydown(event, unitId) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    emit('unit-click', unitId);
  }
}
</script>

<template>
  <g class="layer-units">
    <image
      v-for="entry in renderUnits"
      :key="entry.unit.id"
      :href="entry.href"
      :x="entry.x"
      :y="entry.y"
      :width="entry.size"
      :height="entry.size"
      :aria-label="`Select unit ${entry.unit.id}`"
      role="button"
      tabindex="0"
      style="pointer-events: all; cursor: pointer"
      @click.stop="emit('unit-click', entry.unit.id)"
      @keydown="handleKeydown($event, entry.unit.id)"
    />
  </g>
</template>
