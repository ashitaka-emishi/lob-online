<script setup>
defineProps({
  terrainTypes: {
    type: Array,
    default: () => [
      'unknown',
      'clear',
      'woods',
      'slopingGround',
      'woodedSloping',
      'orchard',
      'marsh',
    ],
  },
  paintTerrain: {
    type: String,
    default: 'clear',
  },
});

const emit = defineEmits(['terrain-change', 'clear-all-terrain']);

const TERRAIN_ICONS = {
  clear: '○',
  woods: '▲',
  slopingGround: '╱',
  woodedSloping: '▲╱',
  orchard: '⬡',
  marsh: '≈',
  unknown: '?',
};
</script>

<template>
  <div class="terrain-tool-panel">
    <div class="tool-hint">Click hex to paint selected terrain. Drag to paint multiple.</div>

    <div class="terrain-palette">
      <button
        v-for="t in terrainTypes"
        :key="t"
        class="terrain-btn"
        :class="{ active: paintTerrain === t }"
        @click="emit('terrain-change', t)"
      >
        <span class="terrain-icon">{{ TERRAIN_ICONS[t] ?? '?' }}</span>
        <span class="terrain-name">{{ t }}</span>
      </button>
    </div>

    <button class="clear-btn" @click="emit('clear-all-terrain')">Clear all terrain</button>
  </div>
</template>

<style scoped>
.terrain-tool-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #222;
  font-size: 0.85rem;
}

.tool-hint {
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
}

.terrain-palette {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.terrain-btn {
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

.terrain-btn:hover {
  background: #3a3a3a;
}

.terrain-btn.active {
  background: #3a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

.terrain-icon {
  font-family: monospace;
  min-width: 1.2rem;
  text-align: center;
}

.terrain-name {
  flex: 1;
}

.clear-btn {
  margin-top: 0.2rem;
  padding: 0.3rem 0.6rem;
  background: #3a1a1a;
  border: 1px solid #7a3333;
  color: #c08080;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
}

.clear-btn:hover {
  background: #4a2020;
}
</style>
