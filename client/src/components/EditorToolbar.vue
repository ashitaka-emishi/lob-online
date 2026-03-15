<script setup>
defineProps({
  editorMode: {
    type: String,
    default: 'select',
  },
  paintTerrain: {
    type: String,
    default: 'clear',
  },
  paintEdgeFeature: {
    type: String,
    default: null,
  },
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
  terrainTypes: {
    type: Array,
    default: () => [],
  },
  edgeFeatureTypes: {
    type: Array,
    default: () => [],
  },
  hasMapData: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'mode-change',
  'terrain-change',
  'edge-feature-change',
  'layer-change',
  'export-click',
]);

const MODES = ['select', 'paint', 'elevation', 'edge'];
const LAYER_KEYS = ['grid', 'terrain', 'elevation', 'wedges', 'edges', 'slopeArrows'];
</script>

<template>
  <div class="editor-toolbar">
    <div class="mode-buttons">
      <button
        v-for="mode in MODES"
        :key="mode"
        class="mode-btn"
        :class="{ active: editorMode === mode }"
        @click="emit('mode-change', mode)"
      >
        {{ mode }}
      </button>
    </div>

    <div v-if="editorMode === 'paint' && terrainTypes.length" class="terrain-palette">
      <button
        v-for="t in terrainTypes"
        :key="t"
        class="palette-btn"
        :class="{ active: paintTerrain === t }"
        @click="emit('terrain-change', t)"
      >
        {{ t }}
      </button>
    </div>

    <div v-if="editorMode === 'edge' && edgeFeatureTypes.length" class="edge-palette">
      <button
        v-for="ef in edgeFeatureTypes"
        :key="ef"
        class="palette-btn"
        :class="{ active: paintEdgeFeature === ef }"
        @click="emit('edge-feature-change', ef)"
      >
        {{ ef }}
      </button>
    </div>

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

    <button class="export-btn" :disabled="!hasMapData" @click="emit('export-click')">Export</button>
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

.mode-buttons {
  display: flex;
  gap: 0.25rem;
}

.mode-btn,
.palette-btn {
  padding: 0.2rem 0.6rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.78rem;
}

.mode-btn.active,
.palette-btn.active {
  background: #4a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

.mode-btn:hover,
.palette-btn:hover {
  background: #3a3a3a;
}

.terrain-palette,
.edge-palette {
  display: flex;
  gap: 0.2rem;
  flex-wrap: wrap;
}

.layer-checkboxes {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: 0.5rem;
}

.layer-label {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  color: #a09880;
  cursor: pointer;
}

.export-btn {
  padding: 0.2rem 0.6rem;
  background: #2a3a4a;
  border: 1px solid #3a6a8a;
  color: #88c0d8;
  cursor: pointer;
  font-size: 0.78rem;
  margin-left: auto;
}

.export-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
