import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', () => {
  const gameState = ref(null);
  const gridSpec = ref(null);
  const hexes = ref(null);
  const selectedUnitId = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const mapConfigError = ref(null);

  const selectedUnit = computed(() => {
    if (!gameState.value || !selectedUnitId.value) return null;
    return gameState.value.units[selectedUnitId.value] ?? null;
  });

  async function loadGame(id) {
    loading.value = true;
    error.value = null;
    try {
      const stateRes = await fetch(`/api/v1/games/${id}`);
      if (!stateRes.ok) throw new Error(`Failed to load game: ${stateRes.status}`);
      const state = await stateRes.json();
      gameState.value = state;

      // map-config is scenario-static (#421); failure is non-fatal — game still loads. (#422)
      mapConfigError.value = null;
      const mapConfigRes = await fetch(`/api/v1/scenarios/${state.scenarioId}/map-config`).catch(
        (err) => {
          mapConfigError.value = err.message;
          return null;
        }
      );
      if (mapConfigRes?.ok) {
        const mapConfig = await mapConfigRes.json();
        gridSpec.value = mapConfig.gridSpec ?? null;
        hexes.value = mapConfig.hexes ?? null;
      } else if (mapConfigRes && !mapConfigRes.ok) {
        mapConfigError.value = `Map data unavailable (${mapConfigRes.status})`;
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
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
