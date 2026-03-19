<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  overlayConfig: {
    type: Object,
    default: () => ({}),
  },
  helpText: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['overlay-toggle', 'clear-all']);

// ── Overlay toggles ───────────────────────────────────────────────────────────

// Track enabled state for each toggleable layer; default all on.
const toggleStates = ref({});

const toggleableLayers = computed(() =>
  Object.entries(props.overlayConfig)
    .filter(([, layer]) => layer && layer.alwaysOn === false && layer.toggleLabel)
    .map(([key, layer]) => {
      if (!(key in toggleStates.value)) toggleStates.value[key] = true;
      return { key, label: layer.toggleLabel };
    })
);

function onToggle(key) {
  toggleStates.value[key] = !toggleStates.value[key];
  emit('overlay-toggle', key, toggleStates.value[key]);
}

// ── Clear-all confirmation ────────────────────────────────────────────────────

const showClearConfirm = ref(false);

function onClearAllClick() {
  showClearConfirm.value = true;
}

function onClearConfirm() {
  showClearConfirm.value = false;
  emit('clear-all');
}

function onClearCancel() {
  showClearConfirm.value = false;
}

// ── Help popup ────────────────────────────────────────────────────────────────

const showHelp = ref(false);
</script>

<template>
  <div class="base-tool-panel">
    <!-- Slot: tool-specific content -->
    <slot />

    <!-- Overlay toggles -->
    <div v-if="toggleableLayers.length" class="overlay-toggles">
      <label v-for="layer in toggleableLayers" :key="layer.key" class="toggle-label">
        <input
          type="checkbox"
          :checked="toggleStates[layer.key] !== false"
          @change="onToggle(layer.key)"
        />
        {{ layer.label }}
      </label>
    </div>

    <!-- Clear all -->
    <div class="panel-footer">
      <button class="clear-all-btn" @click="onClearAllClick">Clear all</button>
      <button v-if="helpText" class="help-btn" @click="showHelp = true">?</button>
    </div>

    <!-- Clear confirmation -->
    <div v-if="showClearConfirm" class="confirm-dialog">
      <span class="confirm-msg">Clear all painted data?</span>
      <button @click="onClearConfirm">Clear</button>
      <button @click="onClearCancel">Cancel</button>
    </div>

    <!-- Help modal -->
    <div v-if="showHelp" class="help-modal">
      <p>{{ helpText }}</p>
      <button @click="showHelp = false">Close</button>
    </div>
  </div>
</template>

<style scoped>
.base-tool-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #222;
  font-size: 0.85rem;
}

.overlay-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4rem 0;
  border-top: 1px solid #333;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #a09880;
  font-size: 0.78rem;
  cursor: pointer;
}

.toggle-label input[type='checkbox'] {
  accent-color: #7aab3e;
  cursor: pointer;
}

.panel-footer {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  border-top: 1px solid #333;
  padding-top: 0.5rem;
}

.clear-all-btn {
  flex: 1;
  padding: 0.3rem 0.5rem;
  background: #3a1a1a;
  border: 1px solid #7a3333;
  color: #c08080;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: inherit;
  text-align: left;
}

.clear-all-btn:hover {
  background: #4a2020;
}

.help-btn {
  width: 1.6rem;
  height: 1.6rem;
  background: #2a3a4a;
  border: 1px solid #3a6a8a;
  color: #88c0d8;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  border-radius: 50%;
}

.help-btn:hover {
  background: #3a4a5a;
}

.confirm-dialog {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem;
  background: #2a1a1a;
  border: 1px solid #7a3333;
}

.confirm-msg {
  flex: 1;
  font-size: 0.78rem;
  color: #c08080;
}

.confirm-dialog button {
  padding: 0.2rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
}

.help-modal {
  padding: 0.6rem;
  background: #2a2a3a;
  border: 1px solid #3a4a6a;
  font-size: 0.8rem;
  color: #c8d8e8;
  line-height: 1.5;
}

.help-modal p {
  margin: 0 0 0.5rem;
}

.help-modal button {
  padding: 0.2rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
}
</style>
