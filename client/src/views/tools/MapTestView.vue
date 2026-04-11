<script setup>
import { ref, computed, provide, onMounted } from 'vue';
import HexMapOverlay from '../../components/HexMapOverlay.vue';
import { useCalibration } from '../../composables/useCalibration.js';

// ── Map data ──────────────────────────────────────────────────────────────────

const mapData = ref(null);
const fetchError = ref(null);

onMounted(async () => {
  try {
    const res = await fetch('/api/tools/map-editor/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mapData.value = await res.json();
  } catch (err) {
    fetchError.value = `Failed to load map data: ${err.message}`;
  }
});

// ── Calibration ───────────────────────────────────────────────────────────────

const { calibration } = useCalibration();

// ── Panel state ───────────────────────────────────────────────────────────────

const PANELS = [
  { id: 'movement-path', label: 'Movement Path' },
  { id: 'movement-range', label: 'Movement Range' },
  { id: 'hex-inspector', label: 'Hex Inspector' },
  { id: 'los', label: 'LOS' },
  { id: 'command-range', label: 'Command Range' },
];

const activePanelId = ref('movement-path');

// ── Overlay config (updated by active panel) ──────────────────────────────────

const overlayConfig = ref({});

function setOverlayConfig(cfg) {
  overlayConfig.value = cfg;
}

// ── Hex click routing ─────────────────────────────────────────────────────────

// Panels receive hex clicks via provide/inject.
// Each panel inject()s 'onHexClick' and registers a handler; the active panel's
// handler is stored here and invoked by the hex-click event from HexMapOverlay.
const hexClickHandlers = {};

function registerHexClickHandler(panelId, fn) {
  hexClickHandlers[panelId] = fn;
}

function onHexClick(hexId) {
  const handler = hexClickHandlers[activePanelId.value];
  if (handler) handler(hexId);
}

provide('registerHexClickHandler', registerHexClickHandler);
provide('setOverlayConfig', setOverlayConfig);

// ── Hexes for overlay ─────────────────────────────────────────────────────────

const hexes = computed(() => mapData.value?.hexes ?? []);
</script>

<template>
  <div class="map-test-view">
    <header class="toolbar">
      <span class="title">Map Test Tool</span>
    </header>

    <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>

    <div v-else class="layout">
      <!-- Panel selector -->
      <nav class="panel-tabs">
        <button
          v-for="panel in PANELS"
          :key="panel.id"
          class="tab-btn"
          :class="{ active: activePanelId === panel.id }"
          @click="activePanelId = panel.id"
        >
          {{ panel.label }}
        </button>
      </nav>

      <!-- Map + panel side-by-side -->
      <div class="main-area">
        <div class="map-container">
          <HexMapOverlay
            v-if="mapData"
            :calibration="calibration"
            :hexes="hexes"
            :overlay-config="overlayConfig"
            :interaction-enabled="true"
            @hex-click="onHexClick"
          />
        </div>

        <aside class="panel-area">
          <!-- Panel components are mounted in Phase 4 -->
          <div class="panel-placeholder">
            <p>Panel: {{ activePanelId }}</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-test-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.title {
  font-weight: 600;
  font-size: 14px;
  color: #ccc;
}

.fetch-error {
  padding: 16px;
  color: #f87171;
  background: #1e1e1e;
}

.layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.panel-tabs {
  display: flex;
  gap: 2px;
  padding: 4px 8px;
  background: #252526;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.tab-btn {
  padding: 4px 12px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 3px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
}

.tab-btn.active {
  background: #094771;
  border-color: #1177bb;
  color: #fff;
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.map-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.panel-area {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #333;
  background: #1e1e1e;
  overflow-y: auto;
}

.panel-placeholder {
  padding: 16px;
  color: #888;
  font-size: 13px;
}
</style>
