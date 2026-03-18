<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import HexMapOverlay from '../../components/HexMapOverlay.vue';
import HexEditPanel from '../../components/HexEditPanel.vue';
import CalibrationControls from '../../components/CalibrationControls.vue';
import LosTestPanel from '../../components/LosTestPanel.vue';
import EditorToolbar from '../../components/EditorToolbar.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import ElevationToolPanel from '../../components/ElevationToolPanel.vue';
import TerrainToolPanel from '../../components/TerrainToolPanel.vue';
import LinearFeaturePanel from '../../components/LinearFeaturePanel.vue';
import WedgeEditor from '../../components/WedgeEditor.vue';
import { adjacentHexId } from '../../utils/hexGeometry.js';
import { useBulkOperations } from '../../composables/useBulkOperations.js';
import { useLinearFeatureTrace } from '../../composables/useLinearFeatureTrace.js';

const PANEL_DISPLAY_NAMES = {
  calibration: 'Grid Calibration',
  elevation: 'Elevation Tool',
  terrain: 'Terrain Tool',
  linearFeature: 'Linear Feature',
  hexEdit: 'Hex Edit',
  wedge: 'Wedge Editor',
  losTest: 'LOS Test',
};

// Which panels activate a tool mode when opened
const TOOL_PANEL_MODES = {
  elevation: 'elevation',
  terrain: 'paint',
  linearFeature: 'linearFeature',
  wedge: 'wedge',
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
const openPanel = ref('hexEdit');
const activeToolName = computed(() =>
  openPanel.value ? (PANEL_DISPLAY_NAMES[openPanel.value] ?? openPanel.value) : null
);

function togglePanel(name) {
  const prevPanel = openPanel.value;
  const wasOpen = prevPanel === name;
  openPanel.value = wasOpen ? null : name;

  // Derive editorMode from the now-open panel
  editorMode.value = TOOL_PANEL_MODES[openPanel.value] ?? 'select';

  // Clear selection when a tool panel closes
  if (TOOL_PANEL_MODES[prevPanel] && !TOOL_PANEL_MODES[openPanel.value]) {
    selectedHexId.value = null;
  }
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

// Called on-demand when the export overlay opens or when copy/download is triggered.
// Not a reactive computed — the deep-walk is expensive and only needed at export time.
function getEngineExport() {
  if (!exportData.value) return null;
  return stripPrivateFields(exportData.value);
}

// Cache the export snapshot for the template. Computed once when the overlay opens,
// not on every render, so unrelated reactive changes don't re-run the deep-walk.
const exportSnapshot = ref(null);
watch(showExportOverlay, (open) => {
  exportSnapshot.value = open ? getEngineExport() : null;
});

function copyMapData() {
  navigator.clipboard.writeText(JSON.stringify(getEngineExport(), null, 2));
}

function downloadExport() {
  const data = getEngineExport();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

function onElevationSystemChange(val) {
  if (!mapData.value) return;
  const { baseElevation, elevationLevels } = val;
  if (!Number.isFinite(baseElevation) || !Number.isInteger(baseElevation) || baseElevation < 0)
    return;
  if (
    !Number.isFinite(elevationLevels) ||
    !Number.isInteger(elevationLevels) ||
    elevationLevels < 1 ||
    elevationLevels > 99
  )
    return;
  mapData.value.elevationSystem = {
    ...mapData.value.elevationSystem,
    baseElevation,
    elevationLevels,
  };
  unsaved.value = true;
  saveMapDraft();
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

let saveMapDraftTimer = null;

function saveMapDraft() {
  if (saveMapDraftTimer !== null) clearTimeout(saveMapDraftTimer);
  saveMapDraftTimer = setTimeout(() => {
    saveMapDraftTimer = null;
    if (!mapData.value) return;
    try {
      const draft = { ...mapData.value, _savedAt: Date.now() };
      localStorage.setItem(MAP_DRAFT_KEY, JSON.stringify(draft));
    } catch (_) {
      /* ignore storage errors */
    }
  }, 500);
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

// O(1) index: hexId → array index. Recomputed when hexes array or any element is mutated.
const hexIndex = computed(() => new Map(mapData.value?.hexes.map((h, i) => [h.hex, i]) ?? []));

const selectedHex = computed(() => {
  if (!selectedHexId.value || !mapData.value) return null;
  const idx = hexIndex.value.get(selectedHexId.value);
  return idx !== undefined
    ? mapData.value.hexes[idx]
    : { hex: selectedHexId.value, terrain: 'unknown' };
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

const OPPOSITE_DIR = { N: 'S', S: 'N', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };

const elevationLevels = computed(() => mapData.value?.elevationSystem?.elevationLevels ?? 22);
const elevationMax = computed(() => elevationLevels.value - 1);

function adjustHexElevation(hexId, delta) {
  if (!mapData.value) return;
  const idx = hexIndex.value.get(hexId);
  const existing = idx !== undefined ? mapData.value.hexes[idx] : undefined;
  const current = existing?.elevation ?? 0;
  const clamped = Math.max(0, Math.min(elevationMax.value, current + delta));
  const updated = existing
    ? { ...existing, elevation: clamped }
    : { hex: hexId, terrain: 'unknown', elevation: clamped };
  onHexUpdate(updated);
}

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
    if (selectedHexId.value === hexId) {
      selectedHexId.value = null; // deselect on re-click
    } else {
      selectedHexId.value = hexId;
      adjustHexElevation(hexId, +1);
    }
  } else if (editorMode.value === 'paint') {
    const existingIdx = hexIndex.value.get(hexId);
    const existing = existingIdx !== undefined ? mapData.value.hexes[existingIdx] : undefined;
    const updated = existing
      ? { ...existing, terrain: paintTerrain.value }
      : { hex: hexId, terrain: paintTerrain.value };
    onHexUpdate(updated);
    selectedHexId.value = hexId;
  } else if (editorMode.value === 'wedge') {
    selectedHexId.value = hexId === selectedHexId.value ? null : hexId;
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

function onHexRightClick(hexId) {
  if (editorMode.value === 'elevation') {
    adjustHexElevation(hexId, -1);
  }
}

function onHexMouseenter(hexId) {
  if (editorMode.value === 'paint') {
    const existingIdx = hexIndex.value.get(hexId);
    const existing = existingIdx !== undefined ? mapData.value.hexes[existingIdx] : undefined;
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

  // Read both hex objects before any mutation so hexIndex is only accessed once.
  const thisIdx = hexIndex.value.get(hexId);
  const thisHex =
    thisIdx !== undefined ? mapData.value.hexes[thisIdx] : { hex: hexId, terrain: 'unknown' };

  const adjId = adjacentHexId(hexId, dir, calibration.value);
  const adjIdx = adjId !== null ? hexIndex.value.get(adjId) : undefined;
  const adjHex = adjId
    ? adjIdx !== undefined
      ? mapData.value.hexes[adjIdx]
      : { hex: adjId, terrain: 'unknown' }
    : null;

  // Apply both updates after all reads
  onHexUpdate(toggleEdgeFeature(thisHex, dir, featureType));
  if (adjHex) {
    const oppDir = OPPOSITE_DIR[dir];
    onHexUpdate(toggleEdgeFeature(adjHex, oppDir, featureType));
  }
}

function onHexUpdate(updatedHex) {
  if (!mapData.value) return;
  const idx = hexIndex.value.get(updatedHex.hex) ?? -1;
  if (idx >= 0) {
    mapData.value.hexes[idx] = updatedHex;
  } else {
    mapData.value.hexes.push(updatedHex);
  }
  unsaved.value = true;
  saveMapDraft();
}

// ── Bulk operations ───────────────────────────────────────────────────────────

const { clearAllElevations, raiseAll, lowerAll, clearAllTerrain, clearAllWedges } =
  useBulkOperations({
    mapData,
    elevationMax,
    onMutated() {
      unsaved.value = true;
      saveMapDraft();
    },
  });

function onWedgeUpdate(newElev) {
  if (!selectedHexId.value || !mapData.value) return;
  const idx = hexIndex.value.get(selectedHexId.value);
  const existing = idx !== undefined ? mapData.value.hexes[idx] : undefined;
  const updated = existing
    ? { ...existing, wedgeElevations: newElev }
    : { hex: selectedHexId.value, terrain: 'unknown', wedgeElevations: newElev };
  onHexUpdate(updated);
}

function initWedgeElevations() {
  if (!selectedHexId.value || !mapData.value) return;
  const idx = hexIndex.value.get(selectedHexId.value);
  const existing = idx !== undefined ? mapData.value.hexes[idx] : undefined;
  const updated = existing
    ? { ...existing, wedgeElevations: [0, 0, 0, 0, 0, 0] }
    : { hex: selectedHexId.value, terrain: 'unknown', wedgeElevations: [0, 0, 0, 0, 0, 0] };
  onHexUpdate(updated);
}

// ── Linear feature trace ──────────────────────────────────────────────────────

const {
  showTraceConfirm,
  pendingTraceEdges,
  liveTraceCount,
  onTraceProgress,
  onTraceComplete,
  applyTrace,
  cancelTrace,
} = useLinearFeatureTrace({
  mapData,
  paintEdgeFeature,
  onMutated() {
    unsaved.value = true;
    saveMapDraft();
  },
});

// ── Keyboard listener ─────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (openPanel.value && TOOL_PANEL_MODES[openPanel.value]) {
      togglePanel(openPanel.value); // close the active tool panel
    }
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
  if (saveMapDraftTimer !== null) clearTimeout(saveMapDraftTimer);
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

    <!-- Editor toolbar (layer toggles only) -->
    <EditorToolbar :layers="layers" @layer-change="layers = $event" />

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
            @hex-right-click="onHexRightClick"
            @hex-mouseenter="onHexMouseenter"
            @edge-click="onEdgeClick"
            @trace-complete="onTraceComplete"
            @trace-progress="onTraceProgress"
          />
        </div>
      </div>

      <!-- Right: accordion panels -->
      <div class="panel-pane">
        <!-- Grid Calibration -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'calibration' }"
        >
          <button class="accordion-header" @click="togglePanel('calibration')">
            <span>Grid Calibration</span>
            <span class="accordion-chevron">{{ openPanel === 'calibration' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'calibration'" class="accordion-hex-content">
            <CalibrationControls
              :calibration="calibration"
              :calibration-mode="calibrationMode"
              :elevation-system="mapData?.elevationSystem ?? null"
              @calibration-change="onCalibrationChange"
              @toggle-calibration-mode="toggleCalibrationMode"
              @elevation-system-change="onElevationSystemChange"
            />
          </div>
        </div>

        <!-- Elevation Tool -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'elevation' }"
        >
          <button class="accordion-header" @click="togglePanel('elevation')">
            <span>Elevation Tool</span>
            <span class="accordion-chevron">{{ openPanel === 'elevation' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'elevation'" class="accordion-hex-content">
            <ElevationToolPanel
              :selected-hex="selectedHex"
              :elevation-levels="elevationLevels"
              @clear-all-elevations="clearAllElevations"
              @raise-all="raiseAll"
              @lower-all="lowerAll"
            />
          </div>
        </div>

        <!-- Terrain Tool -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'terrain' }"
        >
          <button class="accordion-header" @click="togglePanel('terrain')">
            <span>Terrain Tool</span>
            <span class="accordion-chevron">{{ openPanel === 'terrain' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'terrain'" class="accordion-hex-content">
            <TerrainToolPanel
              :terrain-types="terrainTypes"
              :paint-terrain="paintTerrain"
              @terrain-change="paintTerrain = $event"
              @clear-all-terrain="clearAllTerrain"
            />
          </div>
        </div>

        <!-- Linear Feature Tool -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'linearFeature' }"
        >
          <button class="accordion-header" @click="togglePanel('linearFeature')">
            <span>Linear Feature</span>
            <span class="accordion-chevron">{{ openPanel === 'linearFeature' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'linearFeature'" class="accordion-hex-content">
            <LinearFeaturePanel
              :edge-feature-types="edgeFeatureTypes"
              :paint-edge-feature="paintEdgeFeature"
              :trace-edge-count="liveTraceCount"
              @feature-change="paintEdgeFeature = $event"
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
              @hex-update="onHexUpdate"
              @seed-toggle="onSeedToggle"
            />
          </div>
        </div>

        <!-- Wedge Editor -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'wedge' }"
        >
          <button class="accordion-header" @click="togglePanel('wedge')">
            <span>Wedge Editor</span>
            <span class="accordion-chevron">{{ openPanel === 'wedge' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'wedge'" class="accordion-hex-content">
            <div class="wedge-panel">
              <div v-if="!selectedHexId" class="wedge-empty">Click a hex to edit its wedges</div>
              <template v-else>
                <div class="wedge-hex-id">Hex {{ selectedHexId }}</div>
                <button
                  v-if="!selectedHex?.wedgeElevations"
                  class="wedge-init-btn"
                  @click="initWedgeElevations"
                >
                  Add Wedge Elevations
                </button>
                <WedgeEditor
                  v-if="selectedHex?.wedgeElevations"
                  :wedge-elevations="selectedHex.wedgeElevations"
                  :north-offset="calibration.northOffset ?? 0"
                  @update:wedge-elevations="onWedgeUpdate"
                />
              </template>
              <button class="wedge-clear-btn" @click="clearAllWedges">Clear all wedges</button>
            </div>
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

    <!-- Trace confirmation dialog -->
    <ConfirmDialog
      :show="showTraceConfirm"
      :message="`Apply '${paintEdgeFeature ?? 'road'}' to ${pendingTraceEdges.length} edge(s)?`"
      confirm-label="Apply"
      cancel-label="Cancel"
      @confirm="applyTrace"
      @cancel="cancelTrace"
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
        <pre class="export-pre">{{ JSON.stringify(exportSnapshot, null, 2) }}</pre>
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
  display: flex;
  flex-direction: column;
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

.wedge-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #222;
}

.wedge-empty {
  color: #666;
  font-size: 0.8rem;
  text-align: center;
  padding: 1rem 0;
}

.wedge-hex-id {
  font-size: 0.9rem;
  font-weight: bold;
  color: #ffdd00;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #333;
}

.wedge-init-btn {
  padding: 0.3rem 0.6rem;
  background: #333;
  border: 1px solid #555;
  color: #c8b88a;
  cursor: pointer;
  font-size: 0.8rem;
  width: 100%;
  text-align: left;
}

.wedge-init-btn:hover {
  background: #3a3a3a;
}

.wedge-clear-btn {
  margin-top: 0.3rem;
  padding: 0.3rem 0.6rem;
  background: #3a1a1a;
  border: 1px solid #7a3333;
  color: #c08080;
  cursor: pointer;
  font-size: 0.8rem;
  width: 100%;
  text-align: left;
}

.wedge-clear-btn:hover {
  background: #4a2020;
}
</style>
