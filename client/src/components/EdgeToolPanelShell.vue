<script setup>
/**
 * EdgeToolPanelShell — shared chrome wrapper for edge-painting tool panels.
 *
 * Slot contract (implicit class names expected by ::v-slotted rules):
 *   default slot (paint mode):
 *     .type-chooser   — container for edge-type buttons
 *     .type-btn       — individual type button (add .active for selected state)
 *     .type-swatch    — color/style preview inside a type button
 *     .type-name      — label text inside a type button
 *     .tool-hint      — italic instructional text below the chooser
 *     .validation-error — error message banner
 *   #sub-control slot (non-paint modes, e.g. bridge/ford):
 *     .tool-hint, .validation-error — same as above
 *
 * Mode array contract:
 *   modes[0] is always the primary "paint" mode (renders the default slot).
 *   Subsequent entries render the #sub-control slot instead.
 *   Do not reorder the modes array without updating isPaintMode().
 */

import BaseToolPanel from './BaseToolPanel.vue';

const props = defineProps({
  /** Overlay config forwarded to BaseToolPanel */
  overlayConfig: {
    type: Object,
    default: () => ({}),
  },
  /** Help text forwarded to BaseToolPanel */
  helpText: {
    type: String,
    default: null,
  },
  /**
   * Mode toggle buttons. Each entry: { value: string, label: string }.
   * IMPORTANT: modes[0] is the primary paint mode (renders default slot).
   * If empty, no toggle is shown and the default slot is always rendered.
   */
  modes: {
    type: Array,
    default: () => [],
  },
  /** Currently active mode value */
  activeMode: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['mode-change', 'clear-all', 'overlay-toggle']);

/**
 * True when in the primary (paint) mode or when no modes are defined.
 * Positional contract: modes[0].value is the paint mode identifier.
 */
function isPaintMode() {
  if (!props.modes.length) return true;
  // modes[0] is always the paint (primary) mode by contract — see component JSDoc.
  return props.activeMode === props.modes[0].value;
}
</script>

<template>
  <BaseToolPanel
    :overlay-config="overlayConfig"
    :help-text="helpText"
    @clear-all="emit('clear-all')"
    @overlay-toggle="emit('overlay-toggle', $event)"
  >
    <!-- Mode toggle -->
    <div v-if="modes.length" class="mode-toggle">
      <button
        v-for="m in modes"
        :key="m.value"
        class="mode-btn"
        :class="{ active: activeMode === m.value }"
        @click="emit('mode-change', m.value)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Paint mode: default slot -->
    <slot v-if="isPaintMode()" />

    <!-- Sub-mode: sub-control slot -->
    <slot v-else name="sub-control" />
  </BaseToolPanel>
</template>

<style scoped>
.mode-toggle {
  display: flex;
  gap: 0.25rem;
}

.mode-btn {
  flex: 1;
  padding: 0.25rem 0.4rem;
  background: #333;
  border: 1px solid #555;
  color: #a09880;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: inherit;
}

.mode-btn:hover {
  background: #3a3a3a;
}

.mode-btn.active {
  background: #3a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

/* Styles for type-chooser buttons rendered in the default slot */
::v-slotted(.type-chooser) {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

::v-slotted(.type-btn) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}

::v-slotted(.type-btn:hover) {
  background: #3a3a3a;
}

::v-slotted(.type-btn.active) {
  background: #3a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

::v-slotted(.type-swatch) {
  display: inline-block;
  min-width: 12px;
  flex-shrink: 0;
}

::v-slotted(.type-name) {
  flex: 1;
}

::v-slotted(.tool-hint) {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}

::v-slotted(.validation-error) {
  font-size: 0.75rem;
  color: #c08080;
  padding: 0.25rem 0.4rem;
  background: #2a1a1a;
  border: 1px solid #7a3333;
}
</style>
