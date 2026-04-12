<script setup>
import { ref, computed, onMounted } from 'vue';
import HexMapOverlay from '../../components/HexMapOverlay.vue';
import { useCalibration } from '../../composables/useCalibration.js';
import MovementPathPanel from '../../components/tools/map-test/MovementPathPanel.vue';
import MovementRangePanel from '../../components/tools/map-test/MovementRangePanel.vue';
import HexInspectorPanel from '../../components/tools/map-test/HexInspectorPanel.vue';
import LosPanel from '../../components/tools/map-test/LosPanel.vue';
import CommandRangePanel from '../../components/tools/map-test/CommandRangePanel.vue';

const MAP_IMAGE = '/tools/map-editor/assets/reference/sm-map.jpg';

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

// ── Map image natural size ────────────────────────────────────────────────────

const imgNaturalWidth = ref(1400);
const imgNaturalHeight = ref(900);

function onImageLoad(event) {
  imgNaturalWidth.value = event.target.naturalWidth;
  imgNaturalHeight.value = event.target.naturalHeight;
}

// ── Panel state ───────────────────────────────────────────────────────────────

const PANELS = [
  { id: 'movement-path', label: 'Movement Path' },
  { id: 'movement-range', label: 'Movement Range' },
  { id: 'hex-inspector', label: 'Hex Inspector' },
  { id: 'los', label: 'LOS' },
  { id: 'command-range', label: 'Command Range' },
];

const activePanelId = ref('movement-path');

function togglePanel(id) {
  activePanelId.value = activePanelId.value === id ? null : id;
  clickedHexId.value = null;
  overlayConfig.value = {};
}

// ── Overlay config (updated by active panel) ──────────────────────────────────

const overlayConfig = ref({});

// ── Hex click routing ─────────────────────────────────────────────────────────

const clickedHexId = ref(null);

function onHexClick(hexId) {
  clickedHexId.value = hexId;
}

// ── Hexes for overlay ─────────────────────────────────────────────────────────

const hexes = computed(() => mapData.value?.hexes ?? []);
</script>

<template>
  <div class="map-test-view">
    <!-- Header -->
    <header class="editor-header">
      <span class="title">Map Test Tool</span>
      <span class="spacer" />
      <a class="nav-link" href="/tools/map-editor">Map Editor</a>
    </header>

    <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>

    <!-- Body: sidebar left, map right -->
    <div v-else class="editor-body">
      <!-- Left: panel sidebar -->
      <div class="panel-pane">
        <div
          v-for="panel in PANELS"
          :key="panel.id"
          class="accordion-section accordion-hex"
          :class="{ 'accordion-flex': activePanelId === panel.id }"
        >
          <button class="accordion-header" @click="togglePanel(panel.id)">
            <span>{{ panel.label }}</span>
            <span class="accordion-chevron">{{ activePanelId === panel.id ? '▾' : '▸' }}</span>
          </button>
          <div v-if="activePanelId === panel.id" class="accordion-hex-content">
            <MovementPathPanel
              v-if="panel.id === 'movement-path'"
              :clicked-hex-id="clickedHexId"
              @overlay-update="overlayConfig = $event"
            />
            <MovementRangePanel
              v-else-if="panel.id === 'movement-range'"
              :clicked-hex-id="clickedHexId"
              @overlay-update="overlayConfig = $event"
            />
            <HexInspectorPanel
              v-else-if="panel.id === 'hex-inspector'"
              :clicked-hex-id="clickedHexId"
              @overlay-update="overlayConfig = $event"
            />
            <LosPanel
              v-else-if="panel.id === 'los'"
              :clicked-hex-id="clickedHexId"
              @overlay-update="overlayConfig = $event"
            />
            <CommandRangePanel
              v-else-if="panel.id === 'command-range'"
              :clicked-hex-id="clickedHexId"
              @overlay-update="overlayConfig = $event"
            />
          </div>
        </div>
      </div>

      <!-- Right: scrollable map -->
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
            v-if="mapData"
            :calibration="calibration"
            :hexes="hexes"
            :image-width="imgNaturalWidth"
            :image-height="imgNaturalHeight"
            :overlay-config="overlayConfig"
            :interaction-enabled="true"
            @hex-click="onHexClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-test-view {
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

.spacer {
  flex: 1;
}

.nav-link {
  color: #a09880;
  font-size: 0.8rem;
  text-decoration: none;
}

.nav-link:hover {
  color: #e0d8c8;
}

.fetch-error {
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

.panel-pane {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #444;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-pane {
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
  text-align: left;
}

.accordion-header:hover {
  background: #2e2e2e;
  color: #e0d8c8;
}

.accordion-chevron {
  font-size: 0.7rem;
  color: #666;
}
</style>
