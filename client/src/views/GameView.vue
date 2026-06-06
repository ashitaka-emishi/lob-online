<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { io } from 'socket.io-client';

import HexMapOverlay from '../components/HexMapOverlay.vue';
import UnitStatsPanel from '../components/UnitStatsPanel.vue';
import ActionPanel from '../components/game/ActionPanel.vue';
import { sanitizeCalibration } from '../utils/calibration.js';
import { useOobData } from '../composables/useOobData.js';
import { useGameStore } from '../stores/useGameStore.js';

const MAP_IMAGE = '/tools/map-editor/assets/reference/sm-map.jpg';

const route = useRoute();
const gameStore = useGameStore();
const localPlayerSide = ref(null);
const identityError = ref(null);

// sanitizeCalibration fills missing fields from DEFAULT_CALIBRATION; the store
// already calls it at the API boundary, so gridSpec is always a full calibration
// object or null. Passing gridSpec ?? {} handles the null case. (#438)
// Field-name contract enforced inside sanitizeCalibration — a field absent from
// gridSpec falls back to the DEFAULT_CALIBRATION value silently, never a wrong value.
const calibration = computed(() => sanitizeCalibration(gameStore.gridSpec ?? {}));
const { oobUnitMap, oobError, fetchOob } = useOobData();

const imgNaturalWidth = ref(1400);
const imgNaturalHeight = ref(900);

let socket = null;
const gameId = route.params.id;

onMounted(async () => {
  await Promise.all([gameStore.loadGame(gameId), fetchOob()]);
  await gameStore.refreshValidActions(gameId);

  // intentionally not awaited — identity is non-blocking for initial render
  fetch('/api/v1/games/me')
    .then((r) => r.json())
    .then((data) => {
      localPlayerSide.value = data.side ?? null;
    })
    .catch((err) => {
      console.error('[game] identity fetch failed:', err);
      identityError.value = 'Could not load player identity. Try refreshing.';
    });

  socket = io();
  socket.emit('game:join', { gameId });
  socket.on('game:state-updated', async () => {
    await gameStore.refreshGame(gameId);
    await gameStore.refreshValidActions(gameId);
  });
});

onUnmounted(() => {
  if (socket) {
    socket.emit('game:leave', { gameId });
    socket.disconnect();
    socket = null;
  }
});

// ── Action panel data ─────────────────────────────────────────────────────────

const validActions = computed(() => {
  const gs = gameStore.gameState;
  if (!gs || gs.activePlayer !== localPlayerSide.value) return [];
  return gameStore.serverValidActions;
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
// renders a fallback rect for those. Uses a narrower shape than enrichUnit (no
// sp/weapon/moraleState/orderType) because the counter layer only needs id/hexId/name/counterFile/side.
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

function onSubmitAction({ type, payload }) {
  gameStore.submitAction(gameId, type, payload);
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
      <div v-if="gameStore.error || oobError || identityError" class="error-banner" role="alert">
        {{ gameStore.error || oobError || identityError }}
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
            :selected-unit-id="gameStore.selectedUnit?.id ?? null"
            @hex-click="onHexClick"
            @unit-click="onUnitClick"
          />
        </div>
      </div>

      <!-- Sidebar: fixed width, holds unit stats panel and action panel -->
      <aside class="sidebar">
        <UnitStatsPanel
          :unit="selectedDisplayUnit"
          :hex-units="hexUnits"
          @select-unit="gameStore.selectUnit"
        />
        <ActionPanel
          :phase="gameStore.gameState?.phase ?? null"
          :step="gameStore.gameState?.step ?? null"
          :turn="gameStore.gameState?.turn ?? null"
          :active-player="gameStore.gameState?.activePlayer ?? null"
          :valid-actions="validActions"
          :pending="gameStore.pendingAction !== null"
          :pending-action-type="gameStore.pendingAction?.type ?? null"
          :local-player-side="localPlayerSide"
          @submit-action="onSubmitAction"
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
