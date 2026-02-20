<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  hex: {
    type: Object,
    default: null,
  },
  selectedHexId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['hex-update']);

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
      hexsides: { ...hex.hexsides },
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

        <fieldset>
          <legend>Hexsides</legend>
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
</style>
