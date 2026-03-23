<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import HexMapOverlay from '../../components/HexMapOverlay.vue';
import { ROAD_GROUPS, STREAM_WALL_GROUPS, CONTOUR_GROUPS } from '../../config/feature-types.js';

const ALL_EDGE_GROUPS = [...ROAD_GROUPS, ...STREAM_WALL_GROUPS, ...CONTOUR_GROUPS];
import CalibrationControls from '../../components/CalibrationControls.vue';
import ElevationSystemControls from '../../components/ElevationSystemControls.vue';
import LosTestPanel from '../../components/LosTestPanel.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import ElevationToolPanel from '../../components/ElevationToolPanel.vue';
import TerrainToolPanel from '../../components/TerrainToolPanel.vue';
import RoadToolPanel from '../../components/RoadToolPanel.vue';
import StreamWallToolPanel from '../../components/StreamWallToolPanel.vue';
import ContourToolPanel from '../../components/ContourToolPanel.vue';
import { useBulkOperations } from '../../composables/useBulkOperations.js';
import { useCalibration } from '../../composables/useCalibration.js';
import { useMapExport } from '../../composables/useMapExport.js';
import { useHexInteraction } from '../../composables/useHexInteraction.js';
import { useEditorAccordion } from '../../composables/useEditorAccordion.js';
import { useMapPersistence } from '../../composables/useMapPersistence.js';
import { useLosTest } from '../../composables/useLosTest.js';
import { useEdgeToggle } from '../../composables/useEdgeToggle.js';
import { DIRS } from '../../utils/hexGeometry.js';
import { canonicalOwner, validateCoexistence } from '../../formulas/edge-model.js';
import { autoDetectContourType } from '../../formulas/elevation.js';

const STORAGE_KEY = 'lob-map-editor-calibration-v4';
const MAP_DRAFT_KEY_V1 = 'lob-map-editor-mapdata-v1';
const MAP_DRAFT_KEY = 'lob-map-editor-mapdata-south-mountain-v2';
const MAP_IMAGE = '/tools/map-editor/assets/reference/sm-map.jpg';

// ── Calibration (composable) ───────────────────────────────────────────────────

const {
  calibration,
  calibrationMode,
  onCalibrationChange: applyCalibrationChange,
  onCalibrationLoaded,
  toggleCalibrationMode,
} = useCalibration();

// ── Composable dependency order (must not be rearranged) ─────────────────────
// Persistence → selectedHexIds → Accordion → LOS → Interaction → EdgeToggle / Bulk / Wedge / Trace
// Each composable receives refs from those above it; init order encodes the dependency graph.

// ── Map persistence (composable) ──────────────────────────────────────────────

const {
  cleanup: cleanupPersistence,
  mapData,
  fetchError,
  unsaved,
  saveStatus,
  isOffline,
  showPushConfirm,
  showPullConfirm,
  isPulling,
  pullError,
  saveErrors,
  draftBannerVisible,
  saveMapDraft,
  restoreDraft,
  dismissDraft,
  fetchMapData,
  pullFromServer,
  confirmPull,
  cancelPull,
  save,
  confirmSave,
  cancelSave,
} = useMapPersistence({
  calibration,
  storageKey: STORAGE_KEY,
  draftKey: MAP_DRAFT_KEY,
  draftKeyV1: MAP_DRAFT_KEY_V1,
  onCalibrationLoaded,
});

// ── Map export (composable) ────────────────────────────────────────────────────

const { showExportOverlay, exportSnapshot, copyMapData, downloadExport } = useMapExport(
  mapData,
  calibration
);

// L3: boolean guard replaces the expensive spread computed that ran on every paint
const hasMapData = computed(() => !!mapData.value);

// ── Selection (H2: owned here so accordion's onClearSelection can reference it directly) ──

const selectedHexIds = ref(new Set());

// ── Editor accordion + modes ──────────────────────────────────────────────────

const { openPanel, editorMode, activeToolName, togglePanel, isToolPanel } = useEditorAccordion({
  onClearSelection: () => {
    selectedHexIds.value = new Set();
    paintMode.value = 'click'; // L3: reset when switching away from paintable panels
  },
});

const paintTerrain = ref('clear');
const paintEdgeFeature = ref(null);
// click/paint mode toggle — shared across terrain and elevation panels (only one open at a time)
const paintMode = ref('click');
// True while a paint stroke is in progress; suppresses per-hex saveMapDraft calls
const paintStrokeActive = ref(false);
// Layer visibility flags for the base (no-panel-active) overlay config.
// terrain and elevation are now owned by their respective tool panels.
const layerFlags = ref({
  grid: true,
  wedges: false,
  edges: true,
  slopeArrows: false,
});

// ── overlayConfig bridge ────────────────────────────────────────────────────
// Builds the declarative overlayConfig for HexMapOverlay from the current
// layer flags and editor mode. Tool panels emit their own config via overlay-config;
// when a panel is active its config replaces the base config (tool-owns-its-overlays).

// Single ref updated by any tool panel that owns an overlayConfig slice.
// Panels listed here must emit 'overlay-config'; all others fall through to the base config.
const CONFIG_PANELS = new Set(['terrain', 'elevation', 'road', 'stream', 'contour']);
const activePanelOverlayConfig = ref(null);

// Selected edge types for each panel — owned by MapEditorView, passed to panels.
const roadSelectedType = ref('trail');
const streamSelectedType = ref('stream');
const contourSelectedType = ref('elevation');

// ── Edge mutations ────────────────────────────────────────────────────────────
// Mutate edges in-place on the reactive hex object (avoids rebuilding hexIndex).
// Uses canonicalOwner from edge-model.js to find the owning hex and face.

function getEdgeFeaturesAt(hexId, faceIndex) {
  if (!mapData.value) return [];
  const { ownerId, ownerFace } = canonicalOwner(hexId, faceIndex, calibration.value);
  const idx = hexIndex.value.get(ownerId) ?? -1;
  if (idx < 0) return [];
  const raw = mapData.value.hexes[idx]?.edges?.[ownerFace] ?? [];
  // Normalise to plain type strings for callers (bridge/ford validation)
  return raw.map((f) => (typeof f === 'string' ? f : f.type));
}

function handleEdgePaint(hexId, faceIndex, type) {
  if (!mapData.value) return false;
  const { ownerId, ownerFace } = canonicalOwner(hexId, faceIndex, calibration.value);
  let idx = hexIndex.value.get(ownerId) ?? -1;
  if (idx < 0) {
    mapData.value.hexes.push({ hex: ownerId, terrain: 'unknown' });
    idx = mapData.value.hexes.length - 1;
    hexIndex.value.set(ownerId, idx);
  }
  const hex = mapData.value.hexes[idx];
  if (!hex.edges) hex.edges = {};
  if (!hex.edges[ownerFace]) hex.edges[ownerFace] = [];
  const existing = hex.edges[ownerFace];
  const existingTypes = existing.map((f) => (typeof f === 'string' ? f : f.type));
  if (existingTypes.includes(type)) return false;
  const { valid } = validateCoexistence(existingTypes, type);
  if (!valid) return false;
  hex.edges[ownerFace] = [...existing, { type }];
  onMutated();
  return true;
}

function handleEdgeClear(hexId, faceIndex, type) {
  if (!mapData.value) return;
  const { ownerId, ownerFace } = canonicalOwner(hexId, faceIndex, calibration.value);
  const idx = hexIndex.value.get(ownerId) ?? -1;
  if (idx < 0) return;
  const hex = mapData.value.hexes[idx];
  if (!hex?.edges?.[ownerFace]) return;
  hex.edges[ownerFace] = hex.edges[ownerFace].filter(
    (f) => (typeof f === 'string' ? f : f.type) !== type
  );
  onMutated();
}

function handleEdgeClearAll(allowedTypes) {
  if (!mapData.value) return;
  for (const hex of mapData.value.hexes) {
    if (!hex.edges) continue;
    for (const face of [0, 1, 2]) {
      if (!hex.edges[face]) continue;
      hex.edges[face] = hex.edges[face].filter(
        (f) => !allowedTypes.includes(typeof f === 'string' ? f : f.type)
      );
    }
  }
  onMutated();
}

// L5: Stable function reference for the hex ID label — used in the base (no-panel) config.
const hexLabelFn = (cell) => cell.id;

// M2: Panels that enable hex/edge interaction — defined here so HexMapOverlay
// does not need to know panel names.
const INTERACTIVE_PANELS = new Set(['elevation', 'terrain', 'road', 'stream', 'contour']);
const EDGE_PANELS = new Set(['road', 'stream', 'contour']);

const interactionEnabled = computed(() => INTERACTIVE_PANELS.has(openPanel.value));
const edgeInteraction = computed(() => EDGE_PANELS.has(openPanel.value));

// Global editor state — always merged into overlayConfig regardless of which tool panel
// is active. HexMapOverlay reads this from overlayConfig; no separate flat props needed.
// Declared as a computed so the reactive contract is explicit and dependency tracking is
// visible to readers; the object it returns still changes on any constituent ref change.
const globalOverlayState = computed(() => ({
  selectedHex: { hexId: selectedHexId.value ?? null },
  diagnosticMode: { active: calibrationMode.value },
  los: {
    hexA: losHexA.value,
    hexB: losHexB.value,
    pathHexes: losPathHexes.value,
    blockedHex: losBlockedHex.value,
  },
  vpHighlight: { hexIds: vpHexIds.value },
  seedHighlight: { hexIds: seedHexIdsArray.value },
}));

const overlayConfig = computed(() => {
  const global = globalOverlayState.value;
  // When a config-owning tool panel is active, merge its slice with global editor state.
  // Adding a new panel: add its name to CONFIG_PANELS and a @overlay-config binding in the template.
  if (CONFIG_PANELS.has(openPanel.value) && activePanelOverlayConfig.value) {
    return { ...activePanelOverlayConfig.value, ...global };
  }

  // Base config (no tool panel active): structural overlays + global state.
  const cfg = { ...global };
  if (layerFlags.value.grid) {
    cfg.hexLabel = { alwaysOn: true, labelFn: hexLabelFn };
  }
  if (layerFlags.value.edges) {
    cfg.edgeLine = {
      alwaysOn: true,
      featureGroups: ALL_EDGE_GROUPS,
    };
  }
  if (layerFlags.value.wedges) {
    cfg.wedges = { alwaysOn: true };
  }
  if (layerFlags.value.slopeArrows) {
    cfg.slopeArrows = { alwaysOn: true };
  }
  return cfg;
});

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
  applyCalibrationChange(val);
  if (mapData.value) {
    mapData.value.gridSpec = val;
    unsaved.value = true;
  }
}

// ── Map image size ────────────────────────────────────────────────────────────

const imgNaturalWidth = ref(1400);
const imgNaturalHeight = ref(900);

function onImageLoad(event) {
  imgNaturalWidth.value = event.target.naturalWidth;
  imgNaturalHeight.value = event.target.naturalHeight;
}

// ── VP hex IDs ────────────────────────────────────────────────────────────────

const vpHexIds = computed(() => {
  if (!mapData.value) return [];
  return (mapData.value.vpHexes ?? []).map((v) => v.hex);
});

// ── Seed hex IDs — no UI editor yet; kept for HexMapOverlay highlight rendering ──

const seedHexIds = ref(new Set());
const seedHexIdsArray = computed(() => [...seedHexIds.value]);

// ── Terrain type list ─────────────────────────────────────────────────────────

const terrainTypes = computed(() => {
  if (mapData.value?.terrainTypes) return mapData.value.terrainTypes;
  return ['unknown', 'clear', 'woods', 'slopingGround', 'woodedSloping', 'orchard', 'marsh'];
});

// M3: watch-based hexIndex — only rebuilds on structural changes (length / full load),
// not on in-place property mutations (terrain, elevation paints). This avoids O(n)
// Map rebuilds on every paint stroke while still rebuilding when hexes are added/removed.
const hexIndex = ref(new Map());
watch(
  () => [mapData.value, mapData.value?.hexes.length],
  () => {
    hexIndex.value = mapData.value
      ? new Map(mapData.value.hexes.map((h, i) => [h.hex, i]))
      : new Map();
  },
  { immediate: true }
);

const elevationLevels = computed(() => mapData.value?.elevationSystem?.elevationLevels ?? 22);
const elevationMax = computed(() => elevationLevels.value - 1);

// M7: single onMutated used by bulk ops and trace (avoids duplicating the same two lines).
// During a paint stroke, suppress per-hex saveMapDraft; flush once on stroke end.
function onMutated() {
  if (!unsaved.value) unsaved.value = true; // guard redundant reactive writes during drag
  if (!paintStrokeActive.value) {
    saveMapDraft();
  }
}

function onPaintStrokeStart() {
  paintStrokeActive.value = true;
}

function onPaintStrokeDone() {
  paintStrokeActive.value = false;
  if (unsaved.value) {
    saveMapDraft();
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
  onMutated();
}

// ── LOS test (H1: extracted from useHexInteraction) ───────────────────────────

const {
  losHexA,
  losHexB,
  losSelectingHex,
  losPathHexes,
  losBlockedHex,
  tryPickLosHex,
  onLosPickStart,
  onLosPickCancel,
  onLosSetHexA,
  onLosSetHexB,
  onLosResult,
} = useLosTest({
  onLosPanelOpen: () => {
    openPanel.value = 'losTest';
  },
});

// ── Hex interaction (composable) ──────────────────────────────────────────────

// Two-layer hex-mouseenter gate:
//   Layer 1 (HexMapOverlay): emits hex-mouseenter only when isPaintMouseDown (mouse-button held).
//   Layer 2 (useHexInteraction): acts on hex-mouseenter only when paintMode === 'paint'.
// Both layers must pass for a drag stroke to paint. dragPaintEnabled activates layer 1;
// paintMode activates layer 2. paintStrokeActive is set on paint-stroke-start (mousedown)
// so even the first hex click in a stroke is batched correctly.
const dragPaintEnabled = computed(
  () => editorMode.value === 'paint' || editorMode.value === 'elevation'
);

const { selectedHexId, selectedHex, onHexClick, onHexRightClick, onHexMouseenter } =
  useHexInteraction({
    mapData,
    hexIndex,
    selectedHexIds,
    editorMode,
    paintTerrain,
    elevationMax,
    paintMode,
    tryPickLosHex,
    onHexUpdate,
  });

// ── Edge feature toggle (M2: extracted from useHexInteraction) ─────────────────

const { onEdgeClick: legacyOnEdgeClick } = useEdgeToggle({
  mapData,
  hexIndex,
  paintEdgeFeature,
  calibration,
  onHexUpdate,
});

// Routes edge-click from HexMapOverlay to the active tool panel's handler.
// { hexId, dir, clientX, clientY } — clientX/Y are screen coords for logging.
function onEdgeClick({ hexId, dir, clientX, clientY }) {
  const faceIndex = DIRS.indexOf(dir);
  if (faceIndex === -1) return;
  let type;
  if (openPanel.value === 'road') {
    type = roadSelectedType.value;
  } else if (openPanel.value === 'stream') {
    type = streamSelectedType.value;
  } else if (openPanel.value === 'contour') {
    type = contourSelectedType.value;
  } else {
    legacyOnEdgeClick({ hexId, dir });
    return;
  }
  console.log(
    `[edge-click] mouse=(${Math.round(clientX ?? 0)},${Math.round(clientY ?? 0)}) hex=${hexId} dir=${dir}`
  );
  handleEdgePaint(hexId, faceIndex, type);
}

function onEdgeRightClick({ hexId, dir }) {
  const faceIndex = DIRS.indexOf(dir);
  if (faceIndex === -1) return;
  if (openPanel.value === 'road') {
    handleEdgeClear(hexId, faceIndex, roadSelectedType.value);
  } else if (openPanel.value === 'stream') {
    handleEdgeClear(hexId, faceIndex, streamSelectedType.value);
  } else if (openPanel.value === 'contour') {
    handleEdgeClear(hexId, faceIndex, contourSelectedType.value);
  }
}

// ── Auto-detect contours ──────────────────────────────────────────────────────
// Clears all contour edges, then derives contour type for every adjacent hex pair
// using the elevation difference (autoDetectContourType from elevation.js).

function handleAutoDetectContours() {
  if (!mapData.value) return;
  // Clear existing contour edges
  handleEdgeClearAll(['elevation', 'slope', 'extremeSlope', 'verticalSlope']);
  // Iterate each hex and its face-0/1/2 neighbors
  const hexes = mapData.value.hexes;
  for (const hex of hexes) {
    for (let face = 0; face < 3; face++) {
      const { ownerId, ownerFace } = canonicalOwner(hex.hex, face, calibration.value);
      if (ownerId !== hex.hex) continue; // only process canonical face owners
      // Find neighbor across this face
      const { ownerId: neighborId } = canonicalOwner(hex.hex, face + 3, calibration.value);
      const neighborIdx = hexIndex.value.get(neighborId) ?? -1;
      if (neighborIdx < 0) continue;
      const neighbor = hexes[neighborIdx];
      const type = autoDetectContourType(hex.elevation ?? 0, neighbor.elevation ?? 0);
      if (type) {
        handleEdgePaint(ownerId, ownerFace, type);
      }
    }
  }
}

// ── Bulk operations ───────────────────────────────────────────────────────────

const { clearAllElevations, raiseAll, lowerAll, clearAllTerrain } = useBulkOperations({
  mapData,
  elevationMax,
  onMutated,
});

// ── Keyboard listener ─────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (openPanel.value && isToolPanel(openPanel.value)) {
      togglePanel(openPanel.value); // close the active tool panel
    }
    selectedHexIds.value = new Set();
    losSelectingHex.value = null;
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  fetchMapData();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  cleanupPersistence();
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
      <button class="export-btn" :disabled="!hasMapData" @click="showExportOverlay = true">
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
            :image-width="imgNaturalWidth"
            :image-height="imgNaturalHeight"
            :overlay-config="overlayConfig"
            :interaction-enabled="interactionEnabled"
            :edge-interaction="edgeInteraction"
            :drag-paint-enabled="dragPaintEnabled"
            @hex-click="onHexClick"
            @hex-right-click="onHexRightClick"
            @hex-mouseenter="onHexMouseenter"
            @edge-click="onEdgeClick"
            @edge-right-click="onEdgeRightClick"
            @paint-stroke-start="onPaintStrokeStart"
            @paint-stroke-done="onPaintStrokeDone"
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
            <span>Grid &amp; Elevation Setup</span>
            <span class="accordion-chevron">{{ openPanel === 'calibration' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'calibration'" class="accordion-hex-content">
            <CalibrationControls
              :calibration="calibration"
              :calibration-mode="calibrationMode"
              @calibration-change="onCalibrationChange"
              @toggle-calibration-mode="toggleCalibrationMode"
            />
            <ElevationSystemControls
              :elevation-system="mapData?.elevationSystem ?? null"
              :locked="calibration.locked ?? false"
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
              :paint-mode="paintMode"
              @clear-all-elevations="clearAllElevations"
              @raise-all="raiseAll"
              @lower-all="lowerAll"
              @paint-mode-change="paintMode = $event"
              @overlay-config="activePanelOverlayConfig = $event"
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
              :paint-mode="paintMode"
              @terrain-change="paintTerrain = $event"
              @clear-all-terrain="clearAllTerrain"
              @paint-mode-change="paintMode = $event"
              @overlay-config="activePanelOverlayConfig = $event"
            />
          </div>
        </div>

        <!-- Road Tool -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'road' }"
        >
          <button class="accordion-header" @click="togglePanel('road')">
            <span>Road Tool</span>
            <span class="accordion-chevron">{{ openPanel === 'road' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'road'" class="accordion-hex-content">
            <RoadToolPanel
              :selected-type="roadSelectedType"
              :get-edge-features="getEdgeFeaturesAt"
              @type-change="roadSelectedType = $event"
              @edge-paint="handleEdgePaint($event.hexId, $event.faceIndex, $event.type)"
              @edge-clear="handleEdgeClear($event.hexId, $event.faceIndex, $event.type)"
              @edge-clear-all="handleEdgeClearAll($event)"
              @bridge-place="handleEdgePaint($event.hexId, $event.faceIndex, 'bridge')"
              @bridge-remove="handleEdgeClear($event.hexId, $event.faceIndex, 'bridge')"
              @overlay-config="activePanelOverlayConfig = $event"
            />
          </div>
        </div>

        <!-- Stream & Stone Wall Tool -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'stream' }"
        >
          <button class="accordion-header" @click="togglePanel('stream')">
            <span>Stream &amp; Stone Wall Tool</span>
            <span class="accordion-chevron">{{ openPanel === 'stream' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'stream'" class="accordion-hex-content">
            <StreamWallToolPanel
              :selected-type="streamSelectedType"
              :get-edge-features="getEdgeFeaturesAt"
              @type-change="streamSelectedType = $event"
              @edge-paint="handleEdgePaint($event.hexId, $event.faceIndex, $event.type)"
              @edge-clear="handleEdgeClear($event.hexId, $event.faceIndex, $event.type)"
              @edge-clear-all="handleEdgeClearAll($event)"
              @ford-place="handleEdgePaint($event.hexId, $event.faceIndex, 'ford')"
              @ford-remove="handleEdgeClear($event.hexId, $event.faceIndex, 'ford')"
              @overlay-config="activePanelOverlayConfig = $event"
            />
          </div>
        </div>

        <!-- Contour Tool -->
        <div
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': openPanel === 'contour' }"
        >
          <button class="accordion-header" @click="togglePanel('contour')">
            <span>Contour Tool</span>
            <span class="accordion-chevron">{{ openPanel === 'contour' ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openPanel === 'contour'" class="accordion-hex-content">
            <ContourToolPanel
              :selected-type="contourSelectedType"
              :elevation-levels="elevationLevels"
              @type-change="contourSelectedType = $event"
              @edge-paint="handleEdgePaint($event.hexId, $event.faceIndex, $event.type)"
              @edge-clear="handleEdgeClear($event.hexId, $event.faceIndex, $event.type)"
              @edge-clear-all="handleEdgeClearAll($event)"
              @auto-detect-contours="handleAutoDetectContours"
              @overlay-config="activePanelOverlayConfig = $event"
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
      @confirm="confirmSave"
      @cancel="cancelSave"
    />

    <!-- Pull confirmation dialog -->
    <ConfirmDialog
      :show="showPullConfirm"
      message="Discard local changes and load server data?"
      confirm-label="Discard & Pull"
      cancel-label="Cancel"
      @confirm="confirmPull"
      @cancel="cancelPull"
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
</style>
