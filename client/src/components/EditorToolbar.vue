<script setup>
defineProps({
  layers: {
    type: Object,
    default: () => ({
      grid: true,
      terrain: true,
      elevation: false,
      wedges: false,
      edges: true,
      slopeArrows: false,
    }),
  },
});

const emit = defineEmits(['layer-change']);

const LAYER_KEYS = ['grid', 'terrain', 'elevation', 'wedges', 'edges', 'slopeArrows'];
</script>

<template>
  <div class="editor-toolbar">
    <div class="layer-checkboxes">
      <label v-for="key in LAYER_KEYS" :key="key" class="layer-label">
        <input
          type="checkbox"
          :checked="layers[key]"
          @change="emit('layer-change', { ...layers, [key]: $event.target.checked })"
        />
        {{ key }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
  font-size: 0.8rem;
}

.layer-checkboxes {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.layer-label {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  color: #a09880;
  cursor: pointer;
}
</style>
