<script setup>
import { ref, watch, computed } from 'vue';
import WedgeEditor from './WedgeEditor.vue';
import EdgeEditPanel from './EdgeEditPanel.vue';

const props = defineProps({
  hex: {
    type: Object,
    default: null,
  },
  selectedHexId: {
    type: String,
    default: null,
  },
  hexFeatureTypes: {
    type: Array,
    default: () => [],
  },
  edgeFeatureTypes: {
    type: Array,
    default: () => ['road', 'stream', 'stoneWall', 'slope', 'extremeSlope', 'verticalSlope'],
  },
  isSeedHex: {
    type: Boolean,
    default: false,
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
const HEXSIDE_TYPES = [
  '',
  'stream',
  'road',
  'pike',
  'trail',
  'slope',
  'extremeSlope',
  'verticalSlope',
  'stoneWall',
];
const HEXSIDE_DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

const form = ref(null);
const showWedgeEditor = ref(false);
const addFeatureType = ref('');

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
      features: hex.features ? [...hex.features] : [],
      edges: hex.edges ? JSON.parse(JSON.stringify(hex.edges)) : {},
      wedgeElevations: hex.wedgeElevations ? [...hex.wedgeElevations] : null,
      hexsides: { ...hex.hexsides },
      vpHex: hex.vpHex ?? false,
      entryHex: hex.entryHex ?? false,
      side: hex.side ?? '',
      _note: hex._note ?? '',
      setupUnits: hex.setupUnits ?? [],
    };
    showWedgeEditor.value = false;
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
  if (form.value.features && form.value.features.length) {
    updated.features = form.value.features;
  }
  if (form.value.edges && Object.keys(form.value.edges).length) {
    updated.edges = form.value.edges;
  }
  if (form.value.wedgeElevations) {
    updated.wedgeElevations = form.value.wedgeElevations;
  }
  const hexsides = {};
  for (const dir of HEXSIDE_DIRS) {
    if (form.value.hexsides[dir]) hexsides[dir] = form.value.hexsides[dir];
  }
  if (Object.keys(hexsides).length) updated.hexsides = hexsides;
  if (form.value.vpHex) updated.vpHex = true;
  if (form.value.entryHex) {
    updated.entryHex = true;
    if (form.value.side) updated.side = form.value.side;
  }
  if (form.value._note) updated._note = form.value._note;
  if (form.value.setupUnits.length) updated.setupUnits = form.value.setupUnits;
  emit('hex-update', updated);
}

function setSlope(dirOrNull) {
  if (!form.value) return;
  if (dirOrNull === null) {
    form.value.slope = null;
  } else {
    form.value.slope = HEXSIDE_DIRS.indexOf(dirOrNull);
  }
  emitUpdate();
}

function addFeature() {
  if (!form.value || !addFeatureType.value) return;
  form.value.features = [...form.value.features, { type: addFeatureType.value }];
  addFeatureType.value = '';
  emitUpdate();
}

function removeFeature(idx) {
  if (!form.value) return;
  form.value.features = form.value.features.filter((_, i) => i !== idx);
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

function onWedgeUpdate(newElev) {
  if (!form.value) return;
  form.value.wedgeElevations = newElev;
  emitUpdate();
}

function toggleWedgeEditor() {
  if (!form.value) return;
  if (!showWedgeEditor.value && !form.value.wedgeElevations) {
    form.value.wedgeElevations = [0, 0, 0, 0, 0, 0];
  }
  showWedgeEditor.value = !showWedgeEditor.value;
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
      features: (form.value.features ?? []).map((f) => f.type),
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
              v-for="dir in HEXSIDE_DIRS"
              :key="dir"
              class="slope-btn"
              :class="{ active: form.slope === HEXSIDE_DIRS.indexOf(dir) }"
              @click="setSlope(dir)"
            >
              {{ dir }}
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

        <!-- Hex Features -->
        <div class="features-section">
          <div class="section-label">Features</div>
          <div v-for="(feat, fi) in form.features" :key="fi" class="feature-row">
            <span class="feature-type">{{ feat.type }}</span>
            <button class="small-remove-btn" @click="removeFeature(fi)">✕</button>
          </div>
          <div class="add-feature-row">
            <select v-model="addFeatureType" class="feature-select">
              <option value="">— add feature —</option>
              <option v-for="ft in hexFeatureTypes" :key="ft" :value="ft">{{ ft }}</option>
            </select>
            <button class="small-add-btn" :disabled="!addFeatureType" @click="addFeature">
              Add
            </button>
          </div>
        </div>

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

        <!-- Wedge elevations -->
        <div class="wedge-section">
          <button class="toggle-wedge-btn" @click="toggleWedgeEditor">
            {{ showWedgeEditor ? 'Hide Wedge Editor' : 'Show Wedge Editor' }}
          </button>
          <WedgeEditor
            v-if="showWedgeEditor && form.wedgeElevations"
            :wedge-elevations="form.wedgeElevations"
            @update:wedge-elevations="onWedgeUpdate"
          />
        </div>

        <fieldset>
          <legend>Hexsides (legacy)</legend>
          <div class="hexsides-grid">
            <label v-for="dir in HEXSIDE_DIRS" :key="dir">
              {{ dir }}
              <select v-model="form.hexsides[dir]" @change="emitUpdate">
                <option v-for="t in HEXSIDE_TYPES" :key="t" :value="t">{{ t || '—' }}</option>
              </select>
            </label>
          </div>
        </fieldset>

        <label class="checkbox-label">
          <input v-model="form.vpHex" type="checkbox" @change="emitUpdate" />
          VP Hex
        </label>

        <label class="checkbox-label">
          <input v-model="form.entryHex" type="checkbox" @change="emitUpdate" />
          Entry Hex
        </label>

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

        <div class="seed-toggle">
          <button
            class="seed-btn"
            :class="{ 'seed-btn--active': isSeedHex }"
            :disabled="!canMarkAsSeed"
            @click="toggleSeed"
          >
            {{ isSeedHex ? '★ Seed Hex' : '☆ Mark as Seed Hex' }}
          </button>
          <span v-if="!canMarkAsSeed" class="seed-hint">Set terrain and elevation to enable</span>
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

fieldset {
  border: 1px solid #444;
  padding: 0.4rem 0.5rem;
  color: #a09880;
}

legend {
  font-size: 0.75rem;
  padding: 0 0.3rem;
}

.hexsides-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.hexsides-grid label {
  font-size: 0.75rem;
}

.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  color: #e0d8c8;
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
.features-section,
.edges-section,
.wedge-section {
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

.feature-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.1rem 0;
}

.feature-type {
  flex: 1;
  color: #c8b88a;
  font-size: 0.8rem;
}

.small-remove-btn {
  background: none;
  border: none;
  color: #c06060;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0;
}

.add-feature-row {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.feature-select {
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #555;
  color: #e0d8c8;
  padding: 0.15rem 0.3rem;
  font-size: 0.78rem;
}

.small-add-btn {
  padding: 0.15rem 0.4rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.78rem;
}

.small-add-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.toggle-wedge-btn {
  padding: 0.2rem 0.5rem;
  background: #333;
  border: 1px solid #555;
  color: #c8b88a;
  cursor: pointer;
  font-size: 0.78rem;
  width: 100%;
  text-align: left;
}

.toggle-wedge-btn:hover {
  background: #3a3a3a;
}

.seed-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.4rem;
  border-top: 1px solid #333;
}

.seed-btn {
  padding: 0.3rem 0.6rem;
  background: #2a3a2a;
  border: 1px solid #4a7a4a;
  color: #a0c8a0;
  cursor: pointer;
  font-size: 0.85rem;
  text-align: left;
}

.seed-btn:hover:not(:disabled) {
  background: #3a4a3a;
}

.seed-btn--active {
  background: #1a4a1a;
  border-color: #6aaa6a;
  color: #c0e8c0;
}

.seed-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.seed-hint {
  font-size: 0.75rem;
  color: #888;
}
</style>
