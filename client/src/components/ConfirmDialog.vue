<script setup>
defineProps({
  show: { type: Boolean, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'OK' },
  cancelLabel: { type: String, default: 'Cancel' },
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div v-if="show" class="confirm-overlay" @click.self="emit('cancel')">
    <div class="confirm-box">
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="confirm-cancel-btn" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button class="confirm-ok-btn" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.confirm-box {
  background: #2a2a2a;
  border: 1px solid #555;
  padding: 1.25rem 1.5rem;
  min-width: 300px;
  max-width: 420px;
}

.confirm-message {
  color: #e0d8c8;
  font-size: 0.9rem;
  margin: 0 0 1rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirm-cancel-btn {
  padding: 0.3rem 0.9rem;
  background: #333;
  border: 1px solid #555;
  color: #a09880;
  cursor: pointer;
  font-size: 0.85rem;
}

.confirm-cancel-btn:hover {
  background: #3a3a3a;
}

.confirm-ok-btn {
  padding: 0.3rem 0.9rem;
  background: #3a5a2a;
  border: 1px solid #5a8a3a;
  color: #b0d880;
  cursor: pointer;
  font-size: 0.85rem;
}

.confirm-ok-btn:hover {
  background: #4a6a3a;
}
</style>
