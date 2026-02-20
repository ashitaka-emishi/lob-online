<script setup>
import { ref, computed, onMounted } from 'vue';
import HexMapOverlay from '../../components/HexMapOverlay.vue';
import HexEditPanel from '../../components/HexEditPanel.vue';
import CalibrationControls from '../../components/CalibrationControls.vue';

const STORAGE_KEY = 'lob-map-editor-calibration-v4';
const MAP_IMAGE = '/tools/map-editor/assets/SM_Map.jpg';

// ── Calibration ───────────────────────────────────────────────────────────────

const DEFAULT_CALIBRATION = { cols: 64, rows: 35, dx: 0, dy: 0, hexWidth: 35, hexHeight: 35, imageScale: 1, orientation: 'flat', strokeWidth: 0.5, evenColUp: false };

function loadCalibration() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CALIBRATION, ...JSON.parse(stored) };
  } catch (_) { /* ignore */ }
  return { ...DEFAULT_CALIBRATION };
}

const calibration = ref(loadCalibration());
const calibrationMode = ref(false);
const showExportOverlay = ref(false);
const calibrationOpen = ref(true);
const hexEditOpen = ref(true);

const exportData = computed(() =>
  mapData.value ? { ...mapData.value, gridSpec: calibration.value } : null
);

function copyMapData() {
  navigator.clipboard.writeText(JSON.stringify(exportData.value, null, 2));
}

function onCalibrationChange(val) {
  calibration.value = val;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  if (mapData.value) {
    mapData.value.gridSpec = val;
    unsaved.value = true;
  }
}

function toggleCalibrationMode() {
  calibrationMode.value = !calibrationMode.value;
}

// ── Map image size ────────────────────────────────────────────────────────────

const imgNaturalWidth = ref(1400);
const imgNaturalHeight = ref(900);

function onImageLoad(event) {
  imgNaturalWidth.value = event.target.naturalWidth;
  imgNaturalHeight.value = event.target.naturalHeight;
}

// ── Map data ──────────────────────────────────────────────────────────────────

const mapData = ref(null);
const fetchError = ref('');
const unsaved = ref(false);
const saveStatus = ref(''); // '' | 'saving' | 'saved' | 'error'

async function fetchMapData() {
  try {
    const res = await fetch('/api/tools/map-editor/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mapData.value = await res.json();
    if (mapData.value.gridSpec) {
      calibration.value = { ...DEFAULT_CALIBRATION, ...mapData.value.gridSpec };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration.value));
    }
  } catch (err) {
    fetchError.value = err.message;
  }
}

onMounted(fetchMapData);

// ── VP hex IDs ────────────────────────────────────────────────────────────────

const vpHexIds = computed(() => {
  if (!mapData.value) return [];
  return (mapData.value.vpHexes ?? []).map((v) => v.hex);
});

// ── Hex selection ─────────────────────────────────────────────────────────────

const selectedHexId = ref(null);

const selectedHex = computed(() => {
  if (!selectedHexId.value || !mapData.value) return null;
  return mapData.value.hexes.find((h) => h.hex === selectedHexId.value) ?? null;
});

function onHexClick(hexId) {
  selectedHexId.value = hexId;
  // If hex not in data yet, don't create it — user must edit to create
}

function onHexUpdate(updatedHex) {
  if (!mapData.value) return;
  const idx = mapData.value.hexes.findIndex((h) => h.hex === updatedHex.hex);
  if (idx >= 0) {
    mapData.value.hexes[idx] = updatedHex;
  } else {
    mapData.value.hexes.push(updatedHex);
  }
  unsaved.value = true;
}

// ── Save ──────────────────────────────────────────────────────────────────────

const saveErrors = ref([]);

async function save() {
  saveStatus.value = 'saving';
  saveErrors.value = [];
  // Always persist calibration to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration.value));
  if (!mapData.value) {
    saveStatus.value = 'saved';
    setTimeout(() => { saveStatus.value = ''; }, 2000);
    return;
  }
  try {
    const res = await fetch('/api/tools/map-editor/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapData.value),
    });
    const body = await res.json();
    if (res.ok) {
      unsaved.value = false;
      saveStatus.value = 'saved';
      setTimeout(() => { saveStatus.value = ''; }, 2000);
    } else {
      saveStatus.value = 'error';
      saveErrors.value = body.issues ?? [];
    }
  } catch (err) {
    saveStatus.value = 'error';
    saveErrors.value = [{ message: err.message }];
  }
}
</script>

<template>
  <div class="map-editor">
    <!-- Header -->
    <header class="editor-header">
      <span class="title">Map Editor</span>
      <span v-if="selectedHexId" class="selected-hex">Hex: {{ selectedHexId }}</span>
      <span class="spacer" />
      <span v-if="saveStatus === 'saved'" class="save-flash">Saved</span>
      <span v-if="saveStatus === 'error'" class="save-error">Error</span>
      <span v-if="unsaved" class="unsaved-marker">* unsaved</span>
      <button class="export-btn" :disabled="!exportData" @click="showExportOverlay = true">
        Export
      </button>
      <button class="save-btn" :disabled="saveStatus === 'saving'" @click="save">
        {{ saveStatus === 'saving' ? 'Saving…' : 'Save' }}
      </button>
    </header>

    <!-- Load / validation errors -->
    <div v-if="fetchError" class="errors">
      <div class="error-line">Failed to load map data: {{ fetchError }}</div>
    </div>
    <div v-if="saveErrors.length" class="errors">
      <div v-for="(issue, i) in saveErrors" :key="i" class="error-line">
        {{ issue.path?.join('.') ?? '' }}: {{ issue.message }}
      </div>
    </div>

    <!-- Body -->
    <div class="editor-body">
      <!-- Left: map + overlay -->
      <div class="map-pane">
        <div class="map-container" :style="{ width: (imgNaturalWidth * calibration.imageScale) + 'px', height: (imgNaturalHeight * calibration.imageScale) + 'px' }">
          <img
            :src="MAP_IMAGE"
            :width="imgNaturalWidth * calibration.imageScale"
            :height="imgNaturalHeight * calibration.imageScale"
            @load="onImageLoad"
            alt="South Mountain map"
            draggable="false"
          />
          <HexMapOverlay
            :calibration="calibration"
            :hexes="mapData?.hexes ?? []"
            :vp-hex-ids="vpHexIds"
            :selected-hex-id="selectedHexId"
            :calibration-mode="calibrationMode"
            :image-width="imgNaturalWidth"
            :image-height="imgNaturalHeight"
            @hex-click="onHexClick"
          />
        </div>
      </div>

      <!-- Right: accordion panels -->
      <div class="panel-pane">
        <!-- Grid Calibration -->
        <div class="accordion-section">
          <button class="accordion-header" @click="calibrationOpen = !calibrationOpen">
            <span>Grid Calibration</span>
            <span class="accordion-chevron">{{ calibrationOpen ? '▾' : '▸' }}</span>
          </button>
          <div v-if="calibrationOpen">
            <CalibrationControls
              :calibration="calibration"
              :calibration-mode="calibrationMode"
              @calibration-change="onCalibrationChange"
              @toggle-calibration-mode="toggleCalibrationMode"
            />
          </div>
        </div>
        <!-- Hex Edit -->
        <div class="accordion-section accordion-hex">
          <button class="accordion-header" @click="hexEditOpen = !hexEditOpen">
            <span>{{ selectedHexId ? `Hex ${selectedHexId}` : 'Hex Edit' }}</span>
            <span class="accordion-chevron">{{ hexEditOpen ? '▾' : '▸' }}</span>
          </button>
          <div v-if="hexEditOpen" class="accordion-hex-content">
            <HexEditPanel
              :hex="selectedHex"
              :selected-hex-id="selectedHexId"
              @hex-update="onHexUpdate"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Export overlay -->
    <div v-if="showExportOverlay" class="export-overlay" @click.self="showExportOverlay = false">
      <div class="export-box">
        <div class="export-header">
          <span>Map Data JSON</span>
          <button @click="copyMapData">Copy</button>
          <button @click="showExportOverlay = false">✕</button>
        </div>
        <pre class="export-pre">{{ JSON.stringify(exportData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-editor {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #1a1a1a;
  color: #e0d8c8;
  font-family: Georgia, serif;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: #2a2a2a;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.title {
  font-size: 1rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

.selected-hex {
  color: #ffdd00;
  font-size: 0.85rem;
}

.spacer {
  flex: 1;
}

.unsaved-marker {
  color: #c8a840;
  font-size: 0.8rem;
}

.save-flash {
  color: #7aab6e;
  font-size: 0.8rem;
}

.save-error {
  color: #c06060;
  font-size: 0.8rem;
}

.save-btn {
  padding: 0.3rem 0.9rem;
  background: #3a5a2a;
  border: 1px solid #5a8a3a;
  color: #b0d880;
  cursor: pointer;
  font-size: 0.85rem;
}

.save-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.export-btn {
  padding: 0.3rem 0.9rem;
  background: #2a3a4a;
  border: 1px solid #3a6a8a;
  color: #88c0d8;
  cursor: pointer;
  font-size: 0.85rem;
}

.export-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.errors {
  padding: 0.4rem 1rem;
  background: #3a1a1a;
  border-bottom: 1px solid #663333;
  font-size: 0.8rem;
  color: #c06060;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.map-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
  position: relative;
}

.map-container {
  position: relative;
  flex-shrink: 0;
}

.map-container img {
  display: block;
}

.panel-pane {
  width: 260px;
  flex-shrink: 0;
  border-left: 1px solid #444;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.accordion-section {
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.accordion-hex {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.accordion-hex-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.45rem 0.75rem;
  background: #252525;
  border: none;
  border-bottom: 1px solid #3a3a3a;
  color: #a09880;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: inherit;
  text-align: left;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.accordion-header:hover {
  background: #2e2e2e;
  color: #c8b88a;
}

.accordion-chevron {
  font-size: 0.75rem;
  color: #666;
}

.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.export-box {
  background: #2a2a2a;
  border: 1px solid #555;
  width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.export-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #444;
  font-size: 0.85rem;
  color: #e0d8c8;
}

.export-header span {
  flex: 1;
}

.export-header button {
  padding: 0.2rem 0.6rem;
  background: #333;
  border: 1px solid #555;
  color: #e0d8c8;
  cursor: pointer;
  font-size: 0.8rem;
}

.export-header button:hover {
  background: #3a3a3a;
}

.export-pre {
  margin: 0;
  padding: 0.75rem;
  overflow-y: auto;
  font-size: 0.8rem;
  color: #b0d880;
  font-family: monospace;
  line-height: 1.4;
}
</style>
