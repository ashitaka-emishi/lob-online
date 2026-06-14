<script setup>
import { computed, ref, watch, nextTick } from 'vue';

const props = defineProps({
  phase: { type: String, default: null },
  step: { type: String, default: null },
  turn: { type: Number, default: null },
  activePlayer: { type: String, default: null },
  validActions: { type: Array, default: () => [] },
  pending: { type: Boolean, default: false },
  localPlayerSide: { type: String, default: null },
  // Type string of the submitted action — used to target the spinner on the correct
  // button rather than always targeting validActions[0]. (#500)
  pendingActionType: { type: String, default: null },
});

const emit = defineEmits(['submit-action']);

const SUMMARY_ID = 'action-panel-summary';

// Screen reader live region — announces turn-handoff and submission state. (#497)
// Pending state must be announced here because aria-busy suppresses descendant
// announcements without itself being spoken aloud.
const turnAnnouncement = computed(() => {
  if (props.pending) {
    const action = props.pendingActionType ? toTitleCase(props.pendingActionType) : 'action';
    return `Submitting ${action}…`;
  }
  if (!props.phase) return '';
  if (props.activePlayer !== props.localPlayerSide) {
    return `Waiting for ${props.activePlayer}`;
  }
  return `Your turn — ${props.phase}`;
});

function toTitleCase(type) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Returns a human-readable label for an action candidate.
// When multiple candidates share the same type but differ by payload, append a
// distinguishing suffix so buttons are not identically labelled. (#551, #559 review H1/H2)
function actionLabel(action) {
  if (action.type === 'ISSUE_ORDER' && action.payload?.orderType) {
    return `Issue Order — ${toTitleCase(action.payload.orderType)}`;
  }
  if (action.type === 'ACTIVATE_STACK' && action.payload?.hex) {
    return `Activate Stack — ${action.payload.hex}`;
  }
  if (action.type === 'ROLL_INITIATIVE' && action.payload?.leaderId) {
    return `Roll Initiative — ${action.payload.leaderId}`;
  }
  return toTitleCase(action.type);
}

// Stable unique key for a candidate — type alone is not sufficient when multiple candidates
// share the same type but differ by payload. (#559 H1)
// ROLL_INITIATIVE requires leaderId+unitId: keying on unitId alone collides when multiple
// leaders each target the same unit.
function candidateKey(action) {
  const p = action.payload;
  if (!p) return action.type;
  if (p.leaderId != null && p.unitId != null) return `${action.type}:${p.leaderId}:${p.unitId}`;
  return `${action.type}:${p.orderType ?? p.hex ?? p.unitId ?? ''}`;
}

// Track the last-clicked button element so focus can be restored when pending clears. (#505)
// Uses aria-disabled (not native disabled) so the button stays in the tab order and
// remains focusable — native disabled would remove it from the tab order, breaking restore.
// Three-part protection while pending: aria-disabled (AT announcement), pointer-events:none
// (mouse), and the JS guard below (keyboard Enter/Space — the authoritative block).
const _lastClickedBtn = ref(null);

// Restore focus to the button that triggered submission once the pending state clears. (#505)
watch(
  () => props.pending,
  (isPending) => {
    if (!isPending && _lastClickedBtn.value) {
      nextTick(() => {
        _lastClickedBtn.value?.focus();
        _lastClickedBtn.value = null;
      });
    }
  }
);

function handleClick(action, event) {
  if (props.pending) return; // sole keyboard guard — see comment above
  _lastClickedBtn.value = event.currentTarget;
  emit('submit-action', { type: action.type, payload: action.payload });
}
</script>

<template>
  <section class="action-panel" role="region" aria-label="Actions">
    <!-- Screen reader live region: announces turn-handoff (#497) -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ turnAnnouncement }}</div>

    <div v-if="turn !== null && phase" :id="SUMMARY_ID" class="summary">
      Turn {{ turn }} — {{ phase }} ({{ step }})
    </div>
    <div v-if="activePlayer !== localPlayerSide" class="waiting">
      Waiting for {{ activePlayer }}…
    </div>
    <!-- aria-busy signals assistive tech that the action container is processing (#497) -->
    <!-- aria-describedby links buttons to the turn summary for context (#498) -->
    <div
      v-else
      class="actions"
      role="group"
      aria-label="Available actions"
      :aria-busy="pending"
      :aria-describedby="turn !== null && phase ? SUMMARY_ID : undefined"
    >
      <button
        v-for="action in validActions"
        :key="candidateKey(action)"
        class="action-btn"
        :aria-disabled="pending"
        @click="handleClick(action, $event)"
      >
        <!-- Spinner targets the action that was submitted, not always the first button (#500) -->
        <span
          v-if="
            pending &&
            (pendingActionType
              ? pendingActionType === action.type
              : validActions[0]?.type === action.type)
          "
          class="spinner"
          aria-hidden="true"
        />
        {{ actionLabel(action) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.action-panel {
  padding: 0.75rem 0;
  border-top: 1px solid #2a2418;
  color: #c8b89a;
}

.summary {
  font-size: 0.8rem;
  color: #8a7a6a;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
}

.waiting {
  font-size: 0.85rem;
  color: #7a8a9a;
  font-style: italic;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.action-btn {
  background: transparent;
  border: 1px solid #3a3228;
  color: #c8b89a;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  position: relative;
}

.action-btn:hover:not([aria-disabled='true']) {
  background: #1e1a14;
  border-color: #5a4a38;
}

.action-btn:focus-visible {
  outline: 2px solid #c8b89a;
  outline-offset: 2px;
}

.action-btn[aria-disabled='true'] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.spinner {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border: 2px solid #5a4a38;
  border-top-color: #c8b89a;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 0.4rem;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
