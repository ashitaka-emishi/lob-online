<script setup>
import { computed, ref, watch, nextTick, reactive } from 'vue';

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
  if (action.type === 'RALLY_ROLL' && action.payload?.unitId) {
    return `Rally Roll — ${action.payload.unitId}`;
  }
  return toTitleCase(action.type);
}

// LOB §6.4 step 3 — per-unit die input state for RALLY_ROLL forms.
// Keyed by unitId; each entry holds die (1–6) and optional leaderMoraleValue.
const rallyInputs = reactive({});

function getRallyInput(unitId) {
  if (!rallyInputs[unitId]) {
    rallyInputs[unitId] = { die: 1, leaderMoraleValue: 0 };
  }
  return rallyInputs[unitId];
}

function submitRallyRoll(unitId) {
  if (props.pending) return;
  const input = getRallyInput(unitId);
  emit('submit-action', {
    type: 'RALLY_ROLL',
    payload: {
      unitId,
      die: Number(input.die),
      leaderMoraleValue: Number(input.leaderMoraleValue),
    },
  });
}

const rallyRollActions = computed(() => props.validActions.filter((a) => a.type === 'RALLY_ROLL'));
const nonRallyActions = computed(() => props.validActions.filter((a) => a.type !== 'RALLY_ROLL'));

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
      <!-- LOB §6.4 step 3 — die-input forms for pending RALLY_ROLL actions -->
      <div v-for="action in rallyRollActions" :key="candidateKey(action)" class="rally-roll-form">
        <span class="rally-roll-label">{{ actionLabel(action) }}</span>
        <label class="rally-roll-field">
          Die (1–6):
          <input
            v-model.number="getRallyInput(action.payload.unitId).die"
            type="number"
            min="1"
            max="6"
            class="rally-roll-input"
            :disabled="pending"
          />
        </label>
        <label class="rally-roll-field">
          Leader MV:
          <input
            v-model.number="getRallyInput(action.payload.unitId).leaderMoraleValue"
            type="number"
            min="0"
            max="4"
            class="rally-roll-input"
            :disabled="pending"
          />
        </label>
        <button
          class="action-btn"
          :aria-disabled="pending"
          @click="submitRallyRoll(action.payload.unitId)"
        >
          <span
            v-if="pending && pendingActionType === 'RALLY_ROLL'"
            class="spinner"
            aria-hidden="true"
          />
          Roll
        </button>
      </div>

      <!-- Standard action buttons for all non-RALLY_ROLL actions -->
      <button
        v-for="action in nonRallyActions"
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
              : nonRallyActions[0]?.type === action.type)
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

.rally-roll-form {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.5rem;
  border: 1px solid #3a3228;
  background: #0e0c08;
}

.rally-roll-label {
  font-size: 0.8rem;
  color: #8a7a6a;
  font-weight: 600;
}

.rally-roll-field {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #c8b89a;
}

.rally-roll-input {
  width: 3rem;
  background: #1a1610;
  border: 1px solid #3a3228;
  color: #c8b89a;
  padding: 0.2rem 0.3rem;
  font-size: 0.8rem;
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
