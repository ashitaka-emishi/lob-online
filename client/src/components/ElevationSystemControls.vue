<script setup>
const props = defineProps({
  elevationSystem: {
    type: Object,
    default: null,
  },
  locked: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['elevation-system-change']);

function update(field, value) {
  if (!props.elevationSystem || props.locked) return;
  emit('elevation-system-change', { ...props.elevationSystem, [field]: Number(value) });
}
</script>

<template>
  <div class="elevation-system-controls">
    <div class="section-label">Elevation System</div>
    <label>
      Base Elevation (ft)
      <input
        data-testid="base-elevation-input"
        type="number"
        step="1"
        min="0"
        :value="elevationSystem?.baseElevation ?? ''"
        :disabled="!elevationSystem || locked"
        @input="update('baseElevation', $event.target.value)"
      />
    </label>
    <label>
      Elevation Levels (1–99)
      <input
        data-testid="elevation-levels-input"
        type="number"
        step="1"
        min="1"
        max="99"
        :value="elevationSystem?.elevationLevels ?? ''"
        :disabled="!elevationSystem || locked"
        @input="update('elevationLevels', $event.target.value)"
      />
    </label>
  </div>
</template>

<style src="../assets/editor-form.css"></style>

<style scoped>
.elevation-system-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.75rem;
  color: #a09880;
  border-top: 1px solid #3a3a3a;
  padding-top: 0.4rem;
  margin-top: 0.2rem;
}
</style>
