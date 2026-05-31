<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import HexMapOverlay from '../components/HexMapOverlay.vue';
import UnitStatsPanel from '../components/UnitStatsPanel.vue';
import { sanitizeCalibration } from '../utils/calibration.js';
import { useOobData } from '../composables/useOobData.js';
import { useGameStore } from '../stores/useGameStore.js';

const MAP_IMAGE = '/tools/map-editor/assets/reference/sm-map.jpg';

const route = useRoute();
const gameStore = useGameStore();

// sanitizeCalibration fills missing fields from DEFAULT_CALIBRATION; the store
// already calls it at the API boundary, so gridSpec is always a full calibration
// object or null. Passing gridSpec ?? {} handles the null case. (#438)
// Field-name contract enforced inside sanitizeCalibration — a field absent from
// gridSpec falls back to the DEFAULT_CALIBRATION value silently, never a wrong value.
const calibration = computed(() => sanitizeCalibration(gameStore.gridSpec ?? {}));
const { oobUnitMap, oobError, fetchOob } = useOobData();

const imgNaturalWidth = ref(1400);
const imgNaturalHeight = ref(900);

onMounted(async () => {
  const gameId = route.params.id;
  await Promise.all([gameStore.loadGame(gameId), fetchOob()]);
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
// Includes all on-board units with a hex; counterFile may be null for units that
// haven't had a counter image assigned yet (leader/HQ units) — the counter layer
// renders a fallback rect for those.
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
        name: oob?.name ?? u.id,
        counterFile: oob?.counterFile ?? null,
        side: oob?.side ?? null,
      };
    });
});

// Enrich a single UnitState with OOB metadata for display in UnitStatsPanel.
function enrichUnit(unit) {
  const oob = oobUnitMap.value.get(unit.id);
  return {
    id: unit.id,
    name: oob?.name ?? unit.id,
    side: oob?.side ?? null,
    sp: oob?.strengthPoints ?? '?',
    weapon: oob?.weapon ?? null,
    counterFile: oob?.counterFile ?? null,
    moraleState: unit.moraleState,
    orderType: unit.orders?.type ?? null,
  };
}

// Enriched selected unit for UnitStatsPanel — combines game state + OOB metadata.
const selectedDisplayUnit = computed(() => {
  const unit = gameStore.selectedUnit;
  if (!unit) return null;
  return enrichUnit(unit);
});

// All enriched units at the selected hex — drives paging in UnitStatsPanel. (#408)
const hexUnits = computed(() => {
  const hex = gameStore.selectedUnit?.hex;
  if (!hex) return [];
  const units = gameStore.gameState?.units;
  if (!units) return [];
  return Object.values(units)
    .filter((u) => u.isOnBoard && u.hex === hex)
    .map(enrichUnit);
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
    <div class="status-banners">
      <div v-if="gameStore.loading" class="loading-banner" role="status" aria-live="polite">
        Loading game…
      </div>
      <div v-if="gameStore.error || oobError" class="error-banner" role="alert">
        {{ gameStore.error || oobError }}
      </div>
      <div
        v-show="gameStore.mapConfigError"
        class="map-config-warning"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span aria-hidden="true">⚠</span>
        <span class="sr-only">Warning: </span>
        {{ gameStore.mapConfigError }} — map hexes unavailable
      </div>
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
            :overlay-config="{ selectedHex: { hexId: gameStore.selectedUnit?.hex ?? null } }"
            :interaction-enabled="true"
            @hex-click="onHexClick"
            @unit-click="onUnitClick"
          />
        </div>
      </div>

      <!-- Sidebar: fixed width, holds unit stats panel -->
      <aside class="sidebar">
        <UnitStatsPanel
          :unit="selectedDisplayUnit"
          :hex-units="hexUnits"
          @select-unit="gameStore.selectUnit"
        />
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

.map-config-warning {
  background: #2a2010;
  color: #c8a040;
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
