<script setup>
import { computed } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';
import CounterImageWidget from './CounterImageWidget.vue';

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  nodeType: {
    type: String,
    required: true,
  },
  nodePath: {
    type: String,
    default: null,
  },
});

const store = useOobStore();

// ── Type classification ───────────────────────────────────────────────────────

const REGIMENT_TYPES = new Set(['regiment', 'infantry', 'cavalry']);
const BATTERY_TYPE = 'battery';
const BRIGADE_TYPE = 'brigade';
const DIVISION_TYPE = 'division';
const CORPS_TYPE = 'corps';

const isRegiment = computed(() => REGIMENT_TYPES.has(props.nodeType));
const isBattery = computed(() => props.nodeType === BATTERY_TYPE);
const isBrigade = computed(() => props.nodeType === BRIGADE_TYPE);
const isDivision = computed(() => props.nodeType === DIVISION_TYPE);
const isCorps = computed(() => props.nodeType === CORPS_TYPE);
const isEditable = computed(
  () => isRegiment.value || isBattery.value || isBrigade.value || isDivision.value || isCorps.value
);

// ── Field update helpers ──────────────────────────────────────────────────────

function updateField(fieldName, value) {
  if (!props.nodePath) return;
  store.updateField(`${props.nodePath}.${fieldName}`, value);
}

function onTextChange(fieldName, e) {
  updateField(fieldName, e.target.value);
}

function onNumberChange(fieldName, e) {
  const n = Number(e.target.value);
  if (!Number.isNaN(n)) updateField(fieldName, n);
}

function onSelectChange(fieldName, e) {
  updateField(fieldName, e.target.value);
}
</script>

<template>
  <div class="detail-panel-inner">
    <p v-if="!isEditable" class="not-editable">No editable fields for this node type.</p>

    <template v-else>
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="field-row">
        <label class="field-label">ID</label>
        <span class="field-readonly">{{ node.id }}</span>
      </div>

      <div class="field-row">
        <label class="field-label">Name</label>
        <input
          type="text"
          class="field-input"
          :value="node.name ?? ''"
          @change="onTextChange('name', $event)"
        />
      </div>

      <!-- ── Regiment / infantry / cavalry fields ───────────────────────── -->
      <template v-if="isRegiment">
        <div class="field-row">
          <label class="field-label">Type</label>
          <select
            class="field-select"
            :value="node.type ?? ''"
            @change="onSelectChange('type', $event)"
          >
            <option value="infantry">Infantry</option>
            <option value="cavalry">Cavalry</option>
            <option value="artillery">Artillery</option>
          </select>
        </div>

        <div class="field-row">
          <label class="field-label">Morale</label>
          <select
            class="field-select"
            :value="node.morale ?? ''"
            @change="onSelectChange('morale', $event)"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        <div class="field-row">
          <label class="field-label">Weapon</label>
          <select
            class="field-select"
            :value="node.weapon ?? ''"
            @change="onSelectChange('weapon', $event)"
          >
            <option value="R">R — Rifle</option>
            <option value="M">M — Musket</option>
            <option value="SR">SR — Sharpshooter Rifle</option>
            <option value="C">C — Carbine</option>
          </select>
        </div>

        <div class="field-row">
          <label class="field-label">Strength Points</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.strengthPoints ?? 0"
            min="0"
            @change="onNumberChange('strengthPoints', $event)"
          />
        </div>

        <div class="field-row">
          <label class="field-label">Straggler Boxes</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.stragglerBoxes ?? 0"
            min="0"
            @change="onNumberChange('stragglerBoxes', $event)"
          />
        </div>
      </template>

      <!-- ── Battery fields ─────────────────────────────────────────────── -->
      <template v-if="isBattery">
        <div class="field-row">
          <label class="field-label">Gun Type</label>
          <select
            class="field-select"
            :value="node.gunType ?? ''"
            @change="onSelectChange('gunType', $event)"
          >
            <option value="R">R — Rifle</option>
            <option value="N">N — Napoleon</option>
            <option value="H">H — Howitzer</option>
            <option value="L">L — Light Rifle</option>
            <option value="HvR">HvR — Heavy Rifle</option>
          </select>
        </div>

        <div class="field-row">
          <label class="field-label">Strength Points</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.strengthPoints ?? 0"
            min="0"
            @change="onNumberChange('strengthPoints', $event)"
          />
        </div>

        <div class="field-row">
          <label class="field-label">Ammo Class</label>
          <select
            class="field-select"
            :value="node.ammoClass ?? ''"
            @change="onSelectChange('ammoClass', $event)"
          >
            <option value="B">B — High quality</option>
            <option value="C">C — Standard</option>
            <option value="D">D — Depot/reserve</option>
          </select>
        </div>
      </template>

      <!-- ── Brigade fields ─────────────────────────────────────────────── -->
      <template v-if="isBrigade">
        <div class="field-row">
          <label class="field-label">Morale</label>
          <select
            class="field-select"
            :value="node.morale ?? ''"
            @change="onSelectChange('morale', $event)"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        <div class="field-row">
          <label class="field-label">Wreck Threshold</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.wreckThreshold ?? 0"
            min="0"
            @change="onNumberChange('wreckThreshold', $event)"
          />
        </div>

        <div class="field-row">
          <label class="field-label">Wreck Track Total</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.wreckTrackTotal ?? 0"
            min="0"
            @change="onNumberChange('wreckTrackTotal', $event)"
          />
        </div>

        <div class="field-row">
          <label class="field-label">Succession</label>
          <span class="field-placeholder">— SuccessionList (#195) —</span>
        </div>
      </template>

      <!-- ── Division / Corps fields ────────────────────────────────────── -->
      <template v-if="isDivision || isCorps">
        <div class="field-row">
          <label class="field-label">Straggler Boxes</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.divisionStragglerBoxes ?? 0"
            min="0"
            @change="onNumberChange('divisionStragglerBoxes', $event)"
          />
        </div>

        <div class="field-row">
          <label class="field-label">Wreck Threshold</label>
          <input
            type="number"
            class="field-input field-number"
            :value="node.divisionWreckThreshold ?? 0"
            min="0"
            @change="onNumberChange('divisionWreckThreshold', $event)"
          />
        </div>

        <div class="field-row">
          <label class="field-label">Succession</label>
          <span class="field-placeholder">— SuccessionList (#195) —</span>
        </div>
      </template>

      <!-- ── Counter image widget (all editable types) ──────────────────── -->
      <CounterImageWidget
        v-if="nodePath"
        :counter-ref="node.counterRef ?? null"
        :node-path="nodePath"
      />
      <p v-else class="no-path-notice">
        Path not resolvable — counter image editing unavailable for this node.
      </p>
    </template>
  </div>
</template>

<style scoped>
.detail-panel-inner {
  padding: 0.5rem 0;
}

.not-editable,
.no-path-notice {
  color: #6a6050;
  font-style: italic;
  font-size: 0.85rem;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.field-label {
  width: 130px;
  min-width: 130px;
  font-size: 0.8rem;
  color: #8a7860;
  text-align: right;
}

.field-readonly {
  font-size: 0.85rem;
  color: #6a6050;
  font-style: italic;
}

.field-input {
  flex: 1;
  background: #1a1810;
  border: 1px solid #3a3020;
  color: #c8b89a;
  font-size: 0.85rem;
  padding: 0.25rem 0.4rem;
  border-radius: 2px;
}

.field-input:focus {
  outline: none;
  border-color: #6a6050;
}

.field-number {
  max-width: 80px;
  flex: none;
}

.field-select {
  flex: 1;
  background: #1a1810;
  border: 1px solid #3a3020;
  color: #c8b89a;
  font-size: 0.85rem;
  padding: 0.25rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
}

.field-select:focus {
  outline: none;
  border-color: #6a6050;
}

.field-placeholder {
  font-size: 0.8rem;
  color: #6a6050;
  font-style: italic;
}
</style>
