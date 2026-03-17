<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import HexMapOverlay from '../../components/HexMapOverlay.vue';
import HexEditPanel from '../../components/HexEditPanel.vue';
import CalibrationControls from '../../components/CalibrationControls.vue';
import LosTestPanel from '../../components/LosTestPanel.vue';
import EditorToolbar from '../../components/EditorToolbar.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import { adjacentHexId } from '../../utils/hexGeometry.js';

const PANEL_DISPLAY_NAMES = {
  calibration: 'Grid Calibration',
  hexEdit: 'Hex Edit',
  losTest: 'LOS Test',
};

const STORAGE_KEY = 'lob-map-editor-calibration-v4';
const MAP_DRAFT_KEY_V1 = 'lob-map-editor-mapdata-v1';
const MAP_DRAFT_KEY = 'lob-map-editor-mapdata-south-mountain-v2';
const MAP_IMAGE = '/tools/map-editor/assets/reference/sm-map.jpg';

// ── Calibration ───────────────────────────────────────────────────────────────

const DEFAULT_CALIBRATION = {
  cols: 64,
  rows: 35,
  dx: 0,
  dy: 0,
  hexWidth: 35,
  hexHeight: 35,
  imageScale: 1,
  orientation: 'flat',
  strokeWidth: 0.5,
  evenColUp: false,
  northOffset: 0,
};

function loadCalibration() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CALIBRATION, ...JSON.parse(stored) };
  } catch (_) {
    /* ignore */
  }
  return { ...DEFAULT_CALIBRATION };
}

const calibration = ref(loadCalibration());
const calibrationMode = ref(false);
const showExportOverlay = ref(false);

// Accordion: only one panel open at a time
const openPanel = ref('hexEdit'); // 'calibration' | 'hexEdit' | 'losTest' | null
const activeToolName = computed(() =>
  openPanel.value ? (PANEL_DISPLAY_NAMES[openPanel.value] ?? openPanel.value) : null
);

function togglePanel(name) {
  openPanel.value = openPanel.value === name ? null : name;
}

// ── Editor modes and layers ───────────────────────────────────────────────────

const editorMode = ref('select');
const paintTerrain = ref('clear');
const paintEdgeFeature = ref(null);
const selectedHexIds = ref(new Set());
const selectedEdge = ref(null);
const layers = ref({
  grid: true,
  terrain: true,
  elevation: false,
  wedges: false,
  edges: true,
  slopeArrows: false,
});
const draftBannerVisible = ref(false);

// ── Export ────────────────────────────────────────────────────────────────────

const exportData = computed(() =>
  mapData.value ? { ...mapData.value, gridSpec: calibration.value } : null
);

function stripPrivateFields(obj) {
  if (Array.isArray(obj)) return obj.map(stripPrivateFields);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!k.startsWith('_')) out[k] = stripPrivateFields(v);
    }
    return out;
  }
  return obj;
}

const computedEngineExport = computed(() => {
  if (!exportData.value) return null;
  return stripPrivateFields(exportData.value);
});

function copyMapData() {
  navigator.clipboard.writeText(JSON.stringify(computedEngineExport.value, null, 2));
}

function downloadExport() {
  if (!computedEngineExport.value) return;
  const blob = new Blob([JSON.stringify(computedEngineExport.value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map-export.json';
  a.click();
  URL.revokeObjectURL(url);
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
const isOffline = ref(false);
const serverSavedAt = ref(0);
const showPushConfirm = ref(false);
const showPullConfirm = ref(false);
const isPulling = ref(false);
const pullError = ref('');

function saveMapDraft() {
  if (!mapData.value) return;
  try {
    const draft = { ...mapData.value, _savedAt: Date.now() };
    localStorage.setItem(MAP_DRAFT_KEY, JSON.stringify(draft));
  } catch (_) {
    /* ignore storage errors */
  }
}

function restoreDraft() {
  try {
    const draftStr = localStorage.getItem(MAP_DRAFT_KEY);
    if (!draftStr) return;
    const draft = JSON.parse(draftStr);
    delete draft._savedAt;
    mapData.value = draft;
    draftBannerVisible.value = false;
  } catch (_) {
    /* ignore */
  }
}

function dismissDraft() {
  localStorage.removeItem(MAP_DRAFT_KEY);
  draftBannerVisible.value = false;
}

async function fetchServerData() {
  const res = await fetch('/api/tools/map-editor/data');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function executePull() {
  isPulling.value = true;
  pullError.value = '';
  try {
    const serverData = await fetchServerData();
    mapData.value = serverData;
    serverSavedAt.value = serverData._savedAt ?? 0;
    localStorage.removeItem(MAP_DRAFT_KEY);
    unsaved.value = false;
    isOffline.value = false;
    if (serverData.gridSpec) {
      calibration.value = { ...DEFAULT_CALIBRATION, ...serverData.gridSpec };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration.value));
    }
  } catch (err) {
    pullError.value = err.message;
  } finally {
    isPulling.value = false;
  }
}

async function pullFromServer() {
  if (unsaved.value) {
    showPullConfirm.value = true;
    return;
  }
  await executePull();
}

async function fetchMapData() {
  try {
    const serverData = await fetchServerData();

    serverSavedAt.value = serverData._savedAt ?? 0;

    // Check for a local draft newer than server data
    try {
      const draftStr = localStorage.getItem(MAP_DRAFT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if ((draft._savedAt ?? 0) > serverSavedAt.value) {
          draftBannerVisible.value = true;
        } else {
          localStorage.removeItem(MAP_DRAFT_KEY);
        }
      }
    } catch (_) {
      /* ignore */
    }

    mapData.value = serverData;
    if (mapData.value.gridSpec) {
      calibration.value = { ...DEFAULT_CALIBRATION, ...mapData.value.gridSpec };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration.value));
    }
  } catch (err) {
    // Offline fallback: try loading local draft
    try {
      const draftStr = localStorage.getItem(MAP_DRAFT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        mapData.value = draft;
        if (draft.gridSpec) {
          calibration.value = { ...DEFAULT_CALIBRATION, ...draft.gridSpec };
        }
        isOffline.value = true;
        return;
      }
    } catch (_) {
      /* ignore */
    }
    fetchError.value = err.message;
  }
}

// ── VP hex IDs ────────────────────────────────────────────────────────────────

const vpHexIds = computed(() => {
  if (!mapData.value) return [];
  return (mapData.value.vpHexes ?? []).map((v) => v.hex);
});

// ── Seed hex IDs ──────────────────────────────────────────────────────────────

const seedHexIds = ref(new Set());
const seedHexIdsArray = computed(() => [...seedHexIds.value]);

function onSeedToggle({ hexId }) {
  const s = new Set(seedHexIds.value);
  if (s.has(hexId)) s.delete(hexId);
  else s.add(hexId);
  seedHexIds.value = s;
}

// ── Terrain + edge feature type lists ────────────────────────────────────────

const terrainTypes = computed(() => {
  if (mapData.value?.terrainTypes) return mapData.value.terrainTypes;
  return ['unknown', 'clear', 'woods', 'slopingGround', 'woodedSloping', 'orchard', 'marsh'];
});

const edgeFeatureTypes = computed(() => {
  if (mapData.value?.edgeFeatureTypes) return mapData.value.edgeFeatureTypes;
  return ['road', 'stream', 'stoneWall', 'slope', 'extremeSlope', 'verticalSlope'];
});

// ── Hex selection ─────────────────────────────────────────────────────────────

const selectedHexId = ref(null);

const selectedHex = computed(() => {
  if (!selectedHexId.value || !mapData.value) return null;
  return (
    mapData.value.hexes.find((h) => h.hex === selectedHexId.value) ?? {
      hex: selectedHexId.value,
      terrain: 'unknown',
    }
  );
});

// ── LOS pick mode ─────────────────────────────────────────────────────────────

const losHexA = ref(null);
const losHexB = ref(null);
const losSelectingHex = ref(null); // 'A' | 'B' | null
const losResult = ref(null);

function onLosPickStart(side) {
  losSelectingHex.value = side;
}
function onLosPickCancel() {
  losSelectingHex.value = null;
}
function onLosSetHexA(id) {
  losHexA.value = id;
}
function onLosSetHexB(id) {
  losHexB.value = id;
}
function onLosResult(r) {
  losResult.value = r;
}

const losPathHexes = computed(() => {
  if (!losResult.value) return [];
  return losResult.value.steps.filter((s) => s.role === 'intermediate').map((s) => s.hexId);
});

const losBlockedHex = computed(() => {
  if (!losResult.value) return null;
  return losResult.value.steps.find((s) => s.blocked)?.hexId ?? null;
});

// ── Hex interaction ───────────────────────────────────────────────────────────

const CONTOUR_INTERVAL = 50;

const OPPOSITE_DIR = { N: 'S', S: 'N', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };

function onHexClick(hexId, nativeEvent) {
  if (losSelectingHex.value === 'A') {
    losHexA.value = hexId;
    losSelectingHex.value = null;
    openPanel.value = 'losTest';
  } else if (losSelectingHex.value === 'B') {
    losHexB.value = hexId;
    losSelectingHex.value = null;
    openPanel.value = 'losTest';
  } else if (editorMode.value === 'elevation') {
    const existing = mapData.value?.hexes.find((h) => h.hex === hexId);
    const currentElev = existing?.elevation ?? 0;
    const delta = nativeEvent?.shiftKey ? -CONTOUR_INTERVAL : CONTOUR_INTERVAL;
    const updatedHex = existing
      ? { ...existing, elevation: currentElev + delta }
      : { hex: hexId, terrain: 'unknown', elevation: currentElev + delta };
    onHexUpdate(updatedHex);
  } else if (editorMode.value === 'select') {
    if (nativeEvent?.shiftKey) {
      const ids = new Set(selectedHexIds.value);
      if (ids.has(hexId)) ids.delete(hexId);
      else ids.add(hexId);
      selectedHexIds.value = ids;
    } else {
      selectedHexId.value = hexId;
    }
  }
}

function onHexMouseenter(hexId) {
  if (editorMode.value === 'paint') {
    const existing = mapData.value?.hexes.find((h) => h.hex === hexId);
    const updatedHex = existing
      ? { ...existing, terrain: paintTerrain.value }
      : { hex: hexId, terrain: paintTerrain.value };
    onHexUpdate(updatedHex);
  }
}

function onEdgeClick({ hexId, dir }) {
  if (!mapData.value) return;
  const featureType = paintEdgeFeature.value ?? 'road';
  selectedEdge.value = { hexId, dir };

  function toggleEdgeFeature(hex, d, ft) {
    const edges = hex.edges ? { ...hex.edges } : {};
    const features = edges[d] ? [...edges[d]] : [];
    const existingIdx = features.findIndex((f) => f.type === ft);
    if (existingIdx >= 0) {
      features.splice(existingIdx, 1);
    } else {
      features.push({ type: ft });
    }
    if (features.length) edges[d] = features;
    else delete edges[d];
    return { ...hex, edges };
  }

  // Update this hex
  const thisHex = mapData.value.hexes.find((h) => h.hex === hexId) ?? {
    hex: hexId,
    terrain: 'unknown',
  };
  onHexUpdate(toggleEdgeFeature(thisHex, dir, featureType));

  // Mirror on adjacent hex
  const adjId = adjacentHexId(hexId, dir, calibration.value);
  if (adjId) {
    const oppDir = OPPOSITE_DIR[dir];
    const adjHex = mapData.value.hexes.find((h) => h.hex === adjId) ?? {
      hex: adjId,
      terrain: 'unknown',
    };
    onHexUpdate(toggleEdgeFeature(adjHex, oppDir, featureType));
  }
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
  saveMapDraft();
}

// ── Keyboard listener ─────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (e.key === 'Escape') {
    selectedHexIds.value = new Set();
    losSelectingHex.value = null;
  }
}

// ── Save / Push / Pull ────────────────────────────────────────────────────────

const saveErrors = ref([]);

async function executePush() {
  if (!mapData.value) return;
  saveStatus.value = 'saving';
  saveErrors.value = [];
  try {
    const res = await fetch('/api/tools/map-editor/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapData.value),
    });
    const body = await res.json();
    if (res.ok) {
      serverSavedAt.value = body._savedAt ?? Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration.value));
      unsaved.value = false;
      saveStatus.value = 'saved';
      localStorage.removeItem(MAP_DRAFT_KEY);
      setTimeout(() => {
        saveStatus.value = '';
      }, 2000);
    } else {
      saveStatus.value = 'error';
      saveErrors.value = body.issues ?? [];
    }
  } catch (err) {
    saveStatus.value = 'error';
    saveErrors.value = [{ message: err.message }];
  }
}

async function save() {
  if (isOffline.value) return;
  saveErrors.value = [];
  if (!mapData.value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration.value));
    saveStatus.value = 'saved';
    setTimeout(() => {
      saveStatus.value = '';
    }, 2000);
    return;
  }

  // Show confirmation if server has data newer than local draft
  let localDraftSavedAt = 0;
  try {
    const draftStr = localStorage.getItem(MAP_DRAFT_KEY);
    if (draftStr) localDraftSavedAt = JSON.parse(draftStr)._savedAt ?? 0;
  } catch (_) {
    /* ignore */
  }
  if (unsaved.value && serverSavedAt.value > localDraftSavedAt) {
    showPushConfirm.value = true;
    return;
  }

  await executePush();
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  // Migrate v1 draft key to v2 (one-time)
  try {
    const v1 = localStorage.getItem(MAP_DRAFT_KEY_V1);
    if (v1) {
      localStorage.setItem(MAP_DRAFT_KEY, v1);
      localStorage.removeItem(MAP_DRAFT_KEY_V1);
    }
  } catch (_) {
    /* ignore */
  }
  fetchMapData();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="map-editor">
    <!-- Header -->
    <header class="editor-header">
      <span class="title">Map Editor</span>
      <span v-if="selectedHexId" class="selected-hex">Hex: {{ selectedHexId }}</span>
      <span v-if="activeToolName" class="active-tool">| Tool: {{ activeToolName }}</span>
      <span class="spacer" />
      <span v-if="saveStatus === 'saved'" class="save-flash">Saved</span>
      <span v-if="saveStatus === 'error'" class="save-error">Error</span>
      <span v-if="unsaved" class="unsaved-marker">* unsaved</span>
      <a class="nav-link" href="/tools/scenario-editor">Scenario Editor</a>
      <button class="export-btn" :disabled="!exportData" @click="showExportOverlay = true">
        Export
      </button>
      <button
        class="pull-btn"
        :disabled="saveStatus === 'saving' || isPulling"
        @click="pullFromServer"
      >
        {{ isPulling ? 'Pulling…' : 'Pull from Server' }}
      </button>
      <button class="save-btn" :disabled="isOffline || saveStatus === 'saving'" @click="save">
        {{ isOffline ? 'Offline' : saveStatus === 'saving' ? 'Saving…' : 'Push to Server' }}
      </button>
    </header>

    <!-- Offline banner -->
    <div v-if="isOffline" class="offline-banner">
      <span>Server unreachable — working from local draft</span>
      <button @click="pullFromServer">Retry Connect</button>
    </div>

    <!-- Draft restore banner -->
    <div v-if="!isOffline && draftBannerVisible" class="draft-banner">
      <span>Unsaved draft found — restore it?</span>
      <button @click="restoreDraft">Restore</button>
      <button @click="dismissDraft">Dismiss</button>
    </div>

    <!-- Editor toolbar -->
    <EditorToolbar
      :editor-mode="editorMode"
      :paint-terrain="paintTerrain"
      :paint-edge-feature="paintEdgeFeature"
      :layers="layers"
      :terrain-types="terrainTypes"
      :edge-feature-types="edgeFeatureTypes"
      @mode-change="editorMode = $event"
      @terrain-change="paintTerrain = $event"
      @edge-feature-change="paintEdgeFeature = $event"
      @layer-change="layers = $event"
    />

    <!-- Load / validation errors -->
    <div v-if="fetchError" class="errors">
      <div class="error-line">Failed to load map data: {{ fetchError }}</div>
    </div>
    <div v-if="saveErrors.length" class="errors">
      <div v-for="(issue, i) in saveErrors" :key="i" class="error-line">
        {{ issue.path?.join('.') ?? '' }}: {{ issue.message }}
      </div>
    </div>
    <div v-if="pullError" class="errors">
      <div class="error-line">
        Pull failed: {{ pullError }}
        <button class="error-dismiss" @click="pullError = ''">×</button>
      </div>
    </div>

    <!-- Body -->
    <div class="editor-body">
      <!-- Left: map + overlay -->
      <div class="map-pane">
        <div
          class="map-container"
          :style="{
            width: imgNaturalWidth * calibration.imageScale + 'px',
            height: imgNaturalHeight * calibration.imageScale + 'px',
          }"
        >
          <img
            alt="South Mountain map"
            draggable="false"
            :src="MAP_IMAGE"
            :width="imgNaturalWidth * calibration.imageScale"
            :height="imgNaturalHeight * calibration.imageScale"
            @load="onImageLoad"
          />
          <HexMapOverlay
            :calibration="calibration"
            :hexes="mapData?.hexes ?? []"
            :vp-hex-ids="vpHexIds"
            :selected-hex-id="selectedHexId"
            :calibration-mode="calibrationMode"
            :image-width="imgNaturalWidth"
            :image-height="imgNaturalHeight"
            :los-hex-a="losHexA"
            :los-hex-b="losHexB"
            :los-path-hexes="losPathHexes"
            :los-blocked-hex="losBlockedHex"
            :layers="layers"
            :editor-mode="editorMode"
            :paint-terrain="paintTerrain"
            :seed-hex-ids="seedHexIdsArray"
            @hex-click="onHexClick"
            @hex-mouseenter="onHexMouseenter"
            @edge-click="onEdgeClick"
          />
        </div>
      </div>

      <!-- Right: accordion panels -->
      <div class="panel-pane">
        <!-- Grid Calibration -->
        <div class="accordion-section">
          <button class="accordion-header" @click="togglePanel('calibration')">
            <span>Grid Calibration</span>
            <span class="accordion-chevron">{{ openPanel === 'calibration' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'calibration'">
            <CalibrationControls
              :calibration="calibration"
              :calibration-mode="calibrationMode"
              @calibration-change="onCalibrationChange"
              @toggle-calibration-mode="toggleCalibrationMode"
            />
          </div>
        </div>
        <!-- Hex Edit -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'hexEdit' }"
        >
          <button class="accordion-header" @click="togglePanel('hexEdit')">
            <span>Hex Edit</span>
            <span class="accordion-chevron">{{ openPanel === 'hexEdit' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'hexEdit'" class="accordion-hex-content">
            <HexEditPanel
              :hex="selectedHex"
              :selected-hex-id="selectedHexId"
              :hex-feature-types="mapData?.hexFeatureTypes ?? []"
              :edge-feature-types="edgeFeatureTypes"
              :is-seed-hex="selectedHexId ? seedHexIds.has(selectedHexId) : false"
              :north-offset="calibration.northOffset ?? 0"
              :hexes="mapData?.hexes ?? []"
              :grid-spec="calibration"
              @hex-update="onHexUpdate"
              @seed-toggle="onSeedToggle"
            />
          </div>
        </div>
        <!-- LOS Test -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'losTest' }"
        >
          <button class="accordion-header" @click="togglePanel('losTest')">
            <span>LOS Test</span>
            <span class="accordion-chevron">{{ openPanel === 'losTest' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'losTest'" class="accordion-hex-content">
            <LosTestPanel
              :hex-a="losHexA"
              :hex-b="losHexB"
              :map-data="mapData"
              :grid-spec="calibration"
              :selecting-hex="losSelectingHex"
              @pick-start="onLosPickStart"
              @pick-cancel="onLosPickCancel"
              @set-hex-a="onLosSetHexA"
              @set-hex-b="onLosSetHexB"
              @los-result="onLosResult"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Push confirmation dialog -->
    <ConfirmDialog
      :show="showPushConfirm"
      message="Server data is newer. Overwrite?"
      confirm-label="Overwrite"
      cancel-label="Cancel"
      @confirm="
        showPushConfirm = false;
        executePush();
      "
      @cancel="showPushConfirm = false"
    />

    <!-- Pull confirmation dialog -->
    <ConfirmDialog
      :show="showPullConfirm"
      message="Discard local changes and load server data?"
      confirm-label="Discard & Pull"
      cancel-label="Cancel"
      @confirm="
        showPullConfirm = false;
        executePull();
      "
      @cancel="showPullConfirm = false"
    />

    <!-- Export overlay -->
    <div v-if="showExportOverlay" class="export-overlay" @click.self="showExportOverlay = false">
      <div class="export-box">
        <div class="export-header">
          <span>Map Data JSON</span>
          <button @click="copyMapData">Copy</button>
          <button @click="downloadExport">Download</button>
          <button @click="showExportOverlay = false">✕</button>
        </div>
        <pre class="export-pre">{{ JSON.stringify(computedEngineExport, null, 2) }}</pre>
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

.active-tool {
  color: #a0c8e0;
  font-size: 0.85rem;
}

.spacer {
  flex: 1;
}

.unsaved-marker {
  color: #c8a840;
  font-size: 0.8rem;
}

.nav-link {
  color: #a09880;
  font-size: 0.8rem;
  text-decoration: none;
}

.nav-link:hover {
  color: #e0d8c8;
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

.offline-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 1rem;
  background: #3a1a00;
  border-bottom: 1px solid #883300;
  color: #e88040;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.offline-banner button {
  padding: 0.2rem 0.6rem;
  background: #4a2200;
  border: 1px solid #884422;
  color: #e88040;
  cursor: pointer;
  font-size: 0.8rem;
}

.draft-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 1rem;
  background: #3a3000;
  border-bottom: 1px solid #665500;
  color: #e8c840;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.draft-banner button {
  padding: 0.2rem 0.6rem;
  background: #554400;
  border: 1px solid #887722;
  color: #e8c840;
  cursor: pointer;
  font-size: 0.8rem;
}

.pull-btn {
  padding: 0.3rem 0.9rem;
  background: #2a3a4a;
  border: 1px solid #3a6a8a;
  color: #88c0d8;
  cursor: pointer;
  font-size: 0.85rem;
}

.errors {
  padding: 0.4rem 1rem;
  background: #3a1a1a;
  border-bottom: 1px solid #663333;
  font-size: 0.8rem;
  color: #c06060;
}

.error-dismiss {
  margin-left: 0.5rem;
  padding: 0 0.3rem;
  background: none;
  border: 1px solid #c06060;
  color: #c06060;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1.2;
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.accordion-flex {
  flex: 1;
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
