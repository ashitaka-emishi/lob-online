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

  const pendingAction = ref(null);

  // Valid actions fetched from GET /api/v1/games/:id/actions. (#502)
  // Stored here so GameView.vue doesn't need its own serverValidActions ref.
  const serverValidActions = ref([]);

  // Generation counter for refreshValidActions — ensures burst socket events only
  // trigger one fetch: each call increments _actionsGeneration; the response is
  // discarded if a newer call has already started. (#502)
  let _actionsGeneration = 0;

  async function refreshValidActions(gameId) {
    const gen = ++_actionsGeneration;
    try {
      const r = await fetch(`/api/v1/games/${gameId}/actions`);
      if (gen !== _actionsGeneration) return;
      if (!r.ok) {
        serverValidActions.value = [];
        return;
      }
      const data = await r.json();
      if (gen !== _actionsGeneration) return;
      serverValidActions.value = data.validActions ?? [];
    } catch {
      if (gen === _actionsGeneration) serverValidActions.value = [];
    }
  }

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

      // map-config fetch is sequential (not parallel) because scenarioId is only
      // known after the game-state response returns (state.scenarioId). The server
      // does not embed scenarioId in the game-join payload or route params, so both
      // fetches cannot be issued concurrently with the current API shape. (#440)
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

  async function submitAction(gameId, type, payload = null) {
    if (!gameState.value) return;
    pendingAction.value = { type, payload };
    try {
      const res = await fetch(`/api/v1/games/${gameId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload, expectedVersion: gameState.value.version }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Action failed: ${res.status}`);
      }
      const saved = await res.json().catch(() => {
        throw new Error('Server returned an invalid response');
      });
      gameState.value = saved;
    } catch (err) {
      error.value = err.message;
    } finally {
      pendingAction.value = null;
    }
  }

  function refreshGame(gameId) {
    return loadGame(gameId);
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
    pendingAction,
    serverValidActions,
    loadGame,
    submitAction,
    refreshGame,
    refreshValidActions,
    selectUnit,
    deselectUnit,
  };
});
