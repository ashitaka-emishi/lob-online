import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', () => {
  const gameState = ref(null);
  const selectedUnitId = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const selectedUnit = computed(() => {
    if (!gameState.value || !selectedUnitId.value) return null;
    return gameState.value.units[selectedUnitId.value] ?? null;
  });

  async function loadGame(id) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`/api/v1/games/${id}`);
      if (!res.ok) throw new Error(`Failed to load game: ${res.status}`);
      gameState.value = await res.json();
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
    selectedUnitId,
    selectedUnit,
    loading,
    error,
    loadGame,
    selectUnit,
    deselectUnit,
  };
});
