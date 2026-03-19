<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <div class="tool-chooser">
    <button
      v-for="item in items"
      :key="item.value"
      :class="['chooser-btn', { active: item.value === modelValue }]"
      @click="emit('update:modelValue', item.value)"
    >
      <span v-if="item.color" class="color-swatch" :style="{ background: item.color }" />
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.tool-chooser {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chooser-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  background: #2a2a2a;
  border: 1px solid #444;
  color: #c8c0b0;
  cursor: pointer;
  font-size: 0.82rem;
  font-family: inherit;
  text-align: left;
}

.chooser-btn:hover {
  background: #333;
}

.chooser-btn.active {
  background: #2a3a1a;
  border-color: #5a8a2a;
  color: #a8d060;
}

.color-swatch {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border: 1px solid #555;
  flex-shrink: 0;
}
</style>
