<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import HexMapOverlay from '../components/HexMapOverlay.vue';
import UnitStatsPanel from '../components/UnitStatsPanel.vue';
import { DEFAULT_CALIBRATION, sanitizeCalibration } from '../composables/useCalibration.js';
import { useGameStore } from '../stores/useGameStore.js';

const MAP_IMAGE = '/tools/map-editor/assets/reference/sm-map.jpg';

const route = useRoute();
const gameStore = useGameStore();

const calibration = computed(() =>
  sanitizeCalibration({ ...DEFAULT_CALIBRATION, ...(gameStore.gridSpec ?? {}) })
);

const oobData = ref(null);
const oobError = ref(null);
const imgNaturalWidth = ref(1400);
const imgNaturalHeight = ref(900);

onMounted(async () => {
  const gameId = route.params.id;
  await Promise.all([
    gameStore.loadGame(gameId),
    fetch('/api/tools/oob-editor/data')
      .then((r) => r.json())
      .then((d) => {
        oobData.value = d;
      })
      .catch((err) => {
        oobError.value = `OOB load failed: ${err.message}`;
      }),
  ]);
});

// ── OOB enrichment ────────────────────────────────────────────────────────────

// Flatten OOB hierarchy into Map<unitId, { name, side, strengthPoints, counterFile }>.
function _collectOobUnits(obj, side, map) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.id) {
    map.set(obj.id, {
      name: obj.name ?? obj.id,
      side,
      strengthPoints: obj.strengthPoints ?? null,
      counterFile: obj.counterRef?.front ?? null,
    });
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') _collectOobUnits(val, side, map);
  }
}

const oobUnitMap = computed(() => {
  const map = new Map();
  if (!oobData.value) return map;
  for (const side of ['union', 'confederate']) {
    if (oobData.value[side]) _collectOobUnits(oobData.value[side], side, map);
  }
  return map;
});

// ── Derived display data ──────────────────────────────────────────────────────

const hexes = computed(() => gameStore.hexes ?? []);

// hex → unitId index for click-to-select routing
const hexUnitIndex = computed(() => {
  const idx = new Map();
  const units = gameStore.gameState?.units;
  if (!units) return idx;
  for (const [unitId, unit] of Object.entries(units)) {
    if (unit.isOnBoard && unit.hex) idx.set(unit.hex, unitId);
  }
  return idx;
});

// Enriched unit array consumed by HexMapOverlay → UnitCounterLayer.
// Only includes on-board units that have a counter image assigned in OOB.
const displayUnits = computed(() => {
  const units = gameStore.gameState?.units;
  if (!units) return [];
  return Object.values(units)
    .filter((u) => u.isOnBoard && u.hex)
    .map((u) => {
      const oob = oobUnitMap.value.get(u.id);
      return {
        id: u.id,
        hexId: u.hex,
        counterFile: oob?.counterFile ?? null,
        side: oob?.side ?? null,
      };
    })
    .filter((u) => u.counterFile !== null);
});

// Enriched selected unit for UnitStatsPanel — combines game state + OOB metadata.
const selectedDisplayUnit = computed(() => {
  const unit = gameStore.selectedUnit;
  if (!unit) return null;
  const oob = oobUnitMap.value.get(unit.id);
  return {
    id: unit.id,
    name: oob?.name ?? unit.id,
    side: oob?.side ?? null,
    sp: oob?.strengthPoints ?? '?',
    moraleState: unit.moraleState,
    orderType: unit.orders?.type ?? null,
  };
});

// ── Event handlers ────────────────────────────────────────────────────────────

function onHexClick(hexId) {
  const unitId = hexUnitIndex.value.get(hexId);
  if (unitId) {
    gameStore.selectUnit(unitId);
  } else {
    gameStore.deselectUnit();
  }
}

function onUnitClick(unitId) {
  gameStore.selectUnit(unitId);
}

function onImageLoad(event) {
  imgNaturalWidth.value = event.target.naturalWidth;
  imgNaturalHeight.value = event.target.naturalHeight;
}
</script>

<template>
  <div class="game-view">
    <div v-if="gameStore.loading" class="loading-banner">Loading game…</div>
    <div v-if="gameStore.error || oobError" class="error-banner">
      {{ gameStore.error || oobError }}
    </div>
    <div class="game-body">
      <!-- Map area: scrollable, fills remaining width -->
      <div class="map-area">
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
            :hexes="hexes"
            :units="displayUnits"
            :image-width="imgNaturalWidth"
            :image-height="imgNaturalHeight"
            :overlay-config="{}"
            :interaction-enabled="true"
            @hex-click="onHexClick"
            @unit-click="onUnitClick"
          />
        </div>
      </div>

      <!-- Sidebar: fixed width, holds unit stats panel -->
      <aside class="sidebar">
        <UnitStatsPanel :unit="selectedDisplayUnit" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0e0c08;
  color: #c8b89a;
}

.loading-banner {
  background: #1a2030;
  color: #8090c0;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.error-banner {
  background: #4a1010;
  color: #e08080;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.game-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.map-area {
  flex: 1;
  min-width: 0;
  overflow: auto;
  position: relative;
}

.map-container {
  position: relative;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  padding: 0.75rem;
  background: #12100c;
  border-left: 1px solid #2a2418;
  overflow-y: auto;
}
</style>
