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
  // Rendered counter size as a fraction of hex side length. >1.0 is intentional: counters
  // are meant to slightly overlap hex borders for visual weight (1.1 = 110%).
  sizeRatio: {
    type: Number,
    default: 1.1,
  },
  // Hex side length in SVG user units — matches hexWidth from HexMapOverlay calibration
  // (useCalibration.js default: 35).
  hexSideLength: {
    type: Number,
    default: 35,
  },
  // URL base path prepended to counterFile when building the image href. Must end with '/'.
  counterBasePath: {
    type: String,
    default: '/counters/',
  },
});

const emit = defineEmits(['unit-click']);

// Counter size in SVG user units.
const counterSize = computed(() => props.hexSideLength * props.sizeRatio);

// Horizontal stagger for counters sharing a hex, in SVG user units.
const STACK_OFFSET = 4;

// Allow filenames with alphanumeric, spaces, hyphens, underscores, dots — no path separators.
const SAFE_FILENAME_RE = /^[\w. ()-]+$/;

function counterHref(counterFile) {
  if (!counterFile || !SAFE_FILENAME_RE.test(counterFile)) return null;
  return `${props.counterBasePath}${counterFile}`;
}

// Fallback fill colors for units without a counter image, keyed by side.
const FALLBACK_FILL = { union: '#1a3a6a', confederate: '#5a4a28' };
const FALLBACK_FILL_DEFAULT = '#3a3a3a';

// Max label length for fallback counter text. Labels are intentionally lossy — distinct
// units can produce the same abbreviation (e.g. "2nd Bde" and "2nd Div" both → "2nd").
// These are temporary placeholders until counter images are assigned via the OOB editor.
const MAX_LABEL_CHARS = 4;

// Shorten a display name to at most MAX_LABEL_CHARS characters for the fallback label.
function abbreviate(name) {
  if (!name) return '??';
  const word = name.split(/\s+/)[0];
  return word.length <= MAX_LABEL_CHARS ? word : word.slice(0, MAX_LABEL_CHARS);
}

// Build the render list: one entry per on-board unit with a known hex cell.
// Units with a counter image use an <image>; units without use a fallback rect + label.
// Units at the same hex are sorted by insertion order and offset by STACK_OFFSET * stackIndex.
const renderUnits = computed(() => {
  const size = counterSize.value;
  const stackCount = new Map();

  return props.units.flatMap((unit) => {
    const cell = props.cellById.get(unit.hexId);
    if (!cell) return [];

    const stackIndex = stackCount.get(unit.hexId) ?? 0;
    stackCount.set(unit.hexId, stackIndex + 1);

    const xOffset = stackIndex * STACK_OFFSET;
    const x = cell.cx - size / 2 + xOffset;
    const y = cell.cy - size / 2;
    const href = counterHref(unit.counterFile);

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
    <!-- #434: <g role="button"> is reliably announced by NVDA/JAWS/VoiceOver;
         <image role="button"> is not. Event handlers and ARIA move to the wrapper. -->
    <g
      v-for="entry in renderUnits"
      :key="entry.unit.id"
      :aria-label="`Select ${entry.unit.name ?? entry.unit.id}`"
      role="button"
      tabindex="0"
      class="unit-counter"
      @click.stop="emit('unit-click', entry.unit.id)"
      @keydown="handleKeydown($event, entry.unit.id)"
    >
      <!-- Counter image if one has been assigned -->
      <image
        v-if="entry.href"
        aria-hidden="true"
        :href="entry.href"
        :x="entry.x"
        :y="entry.y"
        :width="entry.size"
        :height="entry.size"
      />
      <!-- Fallback rect + label for units without an assigned counter image -->
      <template v-else>
        <rect
          aria-hidden="true"
          :x="entry.x"
          :y="entry.y"
          :width="entry.size"
          :height="entry.size"
          :fill="FALLBACK_FILL[entry.unit.side] ?? FALLBACK_FILL_DEFAULT"
          stroke="#c8b89a"
          stroke-width="1.5"
          rx="2"
        />
        <text
          aria-hidden="true"
          :x="entry.x + entry.size / 2"
          :y="entry.y + entry.size / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="10"
          font-family="monospace"
          font-weight="bold"
          fill="#e8d8b0"
          pointer-events="none"
          >{{ abbreviate(entry.unit.name) }}</text
        >
      </template>
    </g>
  </g>
</template>

<style scoped>
.unit-counter {
  pointer-events: all;
  cursor: pointer;
}

/* SVG <g> :focus-visible support is browser-dependent; plain :focus is the fallback. */
.unit-counter:focus,
.unit-counter:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}
</style>
