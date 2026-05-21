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
  // Rendered counter size as a fraction of the hex inradius. 0.8 = 80%.
  sizeRatio: {
    type: Number,
    default: 0.8,
  },
  // Base hex inradius in SVG units — used to compute counter size.
  hexInradius: {
    type: Number,
    default: 28,
  },
});

const emit = defineEmits(['unit-click']);

// Counter size in SVG units
const counterSize = computed(() => props.hexInradius * props.sizeRatio);

// Stack offset step: units sharing a hex are shifted right by this many pixels per index.
const STACK_OFFSET = 4;

// Build the render list: one entry per on-board unit with a known hex cell.
// Units at the same hex are sorted by insertion order and offset by STACK_OFFSET * stackIndex.
const renderUnits = computed(() => {
  const size = counterSize.value;
  // Track stacking index per hexId
  const stackCount = new Map();

  return props.units.flatMap((unit) => {
    const cell = props.cellById.get(unit.hexId);
    if (!cell) return []; // off-board or hex not in grid — skip

    const stackIndex = stackCount.get(unit.hexId) ?? 0;
    stackCount.set(unit.hexId, stackIndex + 1);

    const xOffset = stackIndex * STACK_OFFSET;
    const x = cell.cx - size / 2 + xOffset;
    const y = cell.cy - size / 2;

    return [{ unit, x, y, size, href: `/counters/${unit.counterFile}` }];
  });
});
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
      style="pointer-events: all; cursor: pointer"
      @click.stop="emit('unit-click', entry.unit.id)"
    />
  </g>
</template>
