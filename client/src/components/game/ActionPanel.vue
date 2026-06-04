<script setup>
defineProps({
  phase: { type: String, default: null },
  step: { type: String, default: null },
  turn: { type: Number, default: null },
  activePlayer: { type: String, default: null },
  validActions: { type: Array, default: () => [] },
  pending: Boolean,
  localPlayerSide: { type: String, default: null },
});

const emit = defineEmits(['submit-action']);

function toTitleCase(type) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function handleClick(action) {
  emit('submit-action', { type: action.type, payload: action.payload });
}
</script>

<template>
  <div class="action-panel">
    <div class="summary">Turn {{ turn }} — {{ phase }} ({{ step }})</div>
    <div v-if="activePlayer !== localPlayerSide" class="waiting">
      Waiting for {{ activePlayer }}…
    </div>
    <div v-else class="actions">
      <button
        v-for="action in validActions"
        :key="action.type"
        class="action-btn"
        :disabled="pending"
        @click="handleClick(action)"
      >
        <span
          v-if="pending && validActions[0]?.type === action.type"
          class="spinner"
          aria-hidden="true"
        />
        {{ toTitleCase(action.type) }}
      </button>
    </div>
  </div>
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
  color: #6a7a8a;
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

.action-btn:hover:not(:disabled) {
  background: #1e1a14;
  border-color: #5a4a38;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
</style>
