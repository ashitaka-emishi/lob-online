<script setup>
import { ref, watch, computed } from 'vue';
import EdgeEditPanel from './EdgeEditPanel.vue';
import { getEdgeLabels } from '../utils/hexGeometry.js';

const props = defineProps({
  hex: {
    type: Object,
    default: null,
  },
  selectedHexId: {
    type: String,
    default: null,
  },
  edgeFeatureTypes: {
    type: Array,
    default: () => ['road', 'stream', 'stoneWall', 'slope', 'extremeSlope', 'verticalSlope'],
  },
  isSeedHex: {
    type: Boolean,
    default: false,
  },
  northOffset: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['hex-update', 'seed-toggle']);

const TERRAIN_TYPES = [
  'unknown',
  'clear',
  'woods',
  'slopingGround',
  'woodedSloping',
  'orchard',
  'marsh',
];

const form = ref(null);

const edgeLabels = computed(() => getEdgeLabels(props.northOffset ?? 0));

watch(
  () => props.hex,
  (hex) => {
    if (!hex) {
      form.value = null;
      return;
    }
    form.value = {
      terrain: hex.terrain ?? 'unknown',
      elevation: hex.elevation ?? '',
      slope: hex.slope ?? null,
      hexFeature: hex.hexFeature ?? null,
      edges: hex.edges ? JSON.parse(JSON.stringify(hex.edges)) : {},
      wedgeElevations: hex.wedgeElevations ? [...hex.wedgeElevations] : null,
      vpHex: hex.vpHex ?? false,
      entryHex: hex.entryHex ?? false,
      side: hex.side ?? '',
      _note: hex._note ?? '',
      setupUnits: hex.setupUnits ?? [],
    };
  },
  { immediate: true }
);

function emitUpdate() {
  if (!props.hex || !form.value) return;
  const updated = {
    hex: props.hex.hex,
    terrain: form.value.terrain,
  };
  if (form.value.elevation !== '') updated.elevation = Number(form.value.elevation);
  if (form.value.slope !== null && form.value.slope !== undefined) {
    updated.slope = form.value.slope;
  }
  if (form.value.hexFeature) updated.hexFeature = form.value.hexFeature;
  if (form.value.edges && Object.keys(form.value.edges).length) {
    updated.edges = form.value.edges;
  }
  if (props.hex.wedgeElevations) {
    updated.wedgeElevations = props.hex.wedgeElevations;
  }
  if (form.value.vpHex) updated.vpHex = true;
  if (form.value.entryHex) {
    updated.entryHex = true;
    if (form.value.side) updated.side = form.value.side;
  }
  if (form.value._note) updated._note = form.value._note;
  if (form.value.setupUnits.length) updated.setupUnits = form.value.setupUnits;
  emit('hex-update', updated);
}

function setSlope(idxOrNull) {
  if (!form.value) return;
  form.value.slope = idxOrNull;
  emitUpdate();
}

function toggleBuilding() {
  if (!form.value) return;
  form.value.hexFeature = form.value.hexFeature ? null : { type: 'building' };
  emitUpdate();
}

function onEdgeUpdate({ dir, features }) {
  if (!form.value) return;
  const edges = { ...form.value.edges };
  if (features.length) {
    edges[dir] = features;
  } else {
    delete edges[dir];
  }
  form.value.edges = edges;
  emitUpdate();
}

const canMarkAsSeed = computed(
  () =>
    !!form.value &&
    form.value.terrain !== 'unknown' &&
    form.value.elevation !== '' &&
    form.value.elevation != null
);

function toggleSeed() {
  if (!props.hex || !form.value || !canMarkAsSeed.value) return;
  emit('seed-toggle', {
    hexId: props.hex.hex,
    confirmedData: {
      terrain: form.value.terrain,
      elevation: Number(form.value.elevation),
    },
  });
}
</script>

<template>
  <div class="hex-edit-panel">
    <div v-if="!selectedHexId" class="empty">
      <p>Click a hex to edit</p>
    </div>
    <template v-else>
      <div class="hex-id">Hex {{ selectedHexId }}</div>

      <template v-if="form">
        <label>
          Terrain
          <select v-model="form.terrain" @change="emitUpdate">
            <option v-for="t in TERRAIN_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>

        <label>
          Elevation
          <input v-model="form.elevation" type="number" placeholder="e.g. 2" @change="emitUpdate" />
        </label>

        <!-- Slope picker -->
        <div class="slope-section">
          <div class="section-label">Slope Direction</div>
          <div class="slope-buttons">
            <button
              v-for="(label, i) in edgeLabels"
              :key="i"
              class="slope-btn"
              :class="{ active: form.slope === i }"
              @click="setSlope(i)"
            >
              {{ label }}
            </button>
            <button
              class="slope-btn"
              :class="{ active: form.slope === null || form.slope === undefined }"
              @click="setSlope(null)"
            >
              None
            </button>
          </div>
        </div>

        <!-- Hex Feature -->
        <label class="checkbox-label">
          <input type="checkbox" :checked="!!form.hexFeature" @change="toggleBuilding" />
          Building
        </label>

        <!-- Edges -->
        <div class="edges-section">
          <div class="section-label">Edges</div>
          <EdgeEditPanel
            v-if="selectedHexId"
            :hex-id="selectedHexId"
            :edges="form.edges"
            :edge-feature-types="edgeFeatureTypes"
            @edge-update="onEdgeUpdate"
          />
        </div>

        <label class="checkbox-label">
          <input v-model="form.vpHex" type="checkbox" @change="emitUpdate" />
          VP Hex
        </label>

        <label class="checkbox-label">
          <input v-model="form.entryHex" type="checkbox" @change="emitUpdate" />
          Entry Hex
        </label>

        <label class="checkbox-label" :class="{ 'checkbox-disabled': !canMarkAsSeed }">
          <input
            type="checkbox"
            :checked="isSeedHex"
            :disabled="!canMarkAsSeed"
            @change="toggleSeed"
          />
          Seed Hex
        </label>
        <span v-if="!canMarkAsSeed && selectedHexId" class="seed-hint"
          >Set terrain and elevation to enable</span
        >

        <label v-if="form.entryHex">
          Side
          <select v-model="form.side" @change="emitUpdate">
            <option value="">—</option>
            <option value="union">union</option>
            <option value="confederate">confederate</option>
          </select>
        </label>

        <label>
          Note
          <textarea v-model="form._note" rows="3" @change="emitUpdate" />
        </label>

        <div v-if="form.setupUnits.length" class="setup-units">
          <div class="setup-units-label">Setup Units</div>
          <div v-for="u in form.setupUnits" :key="u" class="unit-id">{{ u }}</div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.hex-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #222;
  height: 100%;
  overflow-y: auto;
  font-size: 0.85rem;
}

.empty {
  color: #666;
  text-align: center;
  padding: 2rem 0;
}

.hex-id {
  font-size: 1rem;
  font-weight: bold;
  color: #e0d8c8;
  border-bottom: 1px solid #444;
  padding-bottom: 0.4rem;
  margin-bottom: 0.2rem;
}

label {
  display: flex;
  flex-direction: column;
  color: #a09880;
  gap: 0.15rem;
}

select,
input[type='number'],
textarea {
  background: #1a1a1a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.25rem 0.4rem;
  font-size: 0.85rem;
  font-family: inherit;
}

textarea {
  resize: vertical;
}

.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  color: #e0d8c8;
}

.checkbox-disabled {
  opacity: 0.5;
}

.setup-units-label {
  color: #a09880;
  font-size: 0.75rem;
  margin-bottom: 0.2rem;
}

.unit-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #c8b88a;
  padding: 0.1rem 0.3rem;
  background: #1a1a1a;
  border: 1px solid #333;
  margin-bottom: 0.15rem;
}

.section-label {
  font-size: 0.75rem;
  color: #a09880;
  margin-bottom: 0.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.slope-section,
.edges-section {
  border: 1px solid #333;
  padding: 0.4rem 0.5rem;
}

.slope-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.slope-btn {
  padding: 0.2rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.75rem;
}

.slope-btn.active {
  background: #4a5a2a;
  border-color: #7aab3e;
  color: #b0d880;
}

.seed-hint {
  font-size: 0.75rem;
  color: #888;
}
</style>
