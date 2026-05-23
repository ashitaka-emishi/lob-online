import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { sanitizeCalibration } from '../utils/calibration.js';

export const useGameStore = defineStore('game', () => {
  const gameState = ref(null);
  const gridSpec = ref(null);
  const hexes = ref(null);
  const selectedUnitId = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const mapConfigError = ref(null);

  // Generation counter — incremented on each loadGame call. Each call captures its
  // generation at start; any state write is skipped if the generation has advanced,
  // meaning a newer call superseded this one. (#441)
  let _loadGeneration = 0;

  const selectedUnit = computed(() => {
    if (!gameState.value || !selectedUnitId.value) return null;
    return gameState.value.units[selectedUnitId.value] ?? null;
  });

  async function loadGame(id) {
    const gen = ++_loadGeneration;
    loading.value = true;
    error.value = null;
    try {
      const stateRes = await fetch(`/api/v1/games/${id}`);
      if (!stateRes.ok) throw new Error(`Failed to load game: ${stateRes.status}`);
      const state = await stateRes.json();
      if (gen !== _loadGeneration) return;
      gameState.value = state;

      // map-config is scenario-static (#421); failure is non-fatal — game still loads. (#422)
      mapConfigError.value = null;
      const scenarioId = encodeURIComponent(state.scenarioId ?? '');
      const mapConfigRes = await fetch(`/api/v1/scenarios/${scenarioId}/map-config`).catch(
        (err) => {
          if (gen === _loadGeneration) mapConfigError.value = err.message;
          return null;
        }
      );
      if (gen !== _loadGeneration) return;
      if (mapConfigRes?.ok) {
        try {
          const mapConfig = await mapConfigRes.json();
          if (gen !== _loadGeneration) return;
          // sanitizeCalibration enforces the shape contract at the store boundary (#425)
          gridSpec.value = mapConfig.gridSpec ? sanitizeCalibration(mapConfig.gridSpec) : null;
          hexes.value = mapConfig.hexes ?? null;
        } catch (e) {
          if (gen === _loadGeneration) mapConfigError.value = `Map data parse error: ${e.message}`;
        }
      } else if (mapConfigRes && !mapConfigRes.ok) {
        mapConfigError.value = `Map data unavailable (${mapConfigRes.status})`;
      }
    } catch (err) {
      if (gen === _loadGeneration) error.value = err.message;
    } finally {
      if (gen === _loadGeneration) loading.value = false;
    }
  }

  function selectUnit(unitId) {
    selectedUnitId.value = unitId;
  }

  function deselectUnit() {
    selectedUnitId.value = null;
  }

  return {
    gameState,
    gridSpec,
    hexes,
    selectedUnitId,
    selectedUnit,
    loading,
    error,
    mapConfigError,
    loadGame,
    selectUnit,
    deselectUnit,
  };
});
