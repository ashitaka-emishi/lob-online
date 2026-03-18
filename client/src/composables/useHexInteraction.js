import { computed } from 'vue';
import { resolveHex } from '../utils/hexGeometry.js';

/**
 * Hex interaction handlers and selection state derivations.
 *
 * `selectedHexIds` (Set ref) is the canonical selection — owned by the caller and passed in
 * so the accordion's onClearSelection callback can be wired before this composable is
 * constructed (H2: eliminates the lazy-callback workaround).
 *
 * LOS pick state is handled by useLosTest. Pass its `tryPickLosHex` here so click events
 * are routed correctly without coupling this composable to LOS internals (M8).
 *
 * Edge feature toggling is handled by useEdgeToggle (M2).
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData
 * @param {import('vue').Ref<Map>} args.hexIndex
 * @param {import('vue').Ref<Set>} args.selectedHexIds - canonical selection, owned by caller
 * @param {import('vue').Ref<string>} args.editorMode
 * @param {import('vue').Ref<string>} args.paintTerrain
 * @param {import('vue').ComputedRef<number>} args.elevationMax
 * @param {function} [args.tryPickLosHex] - from useLosTest; returns true if click consumed by LOS
 * @param {function} args.onHexUpdate - single-hex mutation handler
 */
export function useHexInteraction({
  mapData,
  hexIndex,
  selectedHexIds,
  editorMode,
  paintTerrain,
  elevationMax,
  tryPickLosHex,
  onHexUpdate,
}) {
  // M5: use .values().next().value — avoids spreading the entire Set into an array
  const selectedHexId = computed(() =>
    selectedHexIds.value.size === 1 ? selectedHexIds.value.values().next().value : null
  );

  // M3: use resolveHex to eliminate the repeated find-or-stub pattern
  const selectedHex = computed(() => {
    if (!selectedHexId.value || !mapData.value) return null;
    return resolveHex(mapData.value.hexes, hexIndex.value, selectedHexId.value);
  });

  // ── Elevation adjustment ───────────────────────────────────────────────────
  function adjustHexElevation(hexId, delta) {
    if (!mapData.value) return;
    const existing = resolveHex(mapData.value.hexes, hexIndex.value, hexId);
    const current = existing.elevation ?? 0;
    const clamped = Math.max(0, Math.min(elevationMax.value, current + delta));
    onHexUpdate({ ...existing, elevation: clamped });
  }

  // ── Click / mouseenter handlers ────────────────────────────────────────────
  function onHexClick(hexId, nativeEvent) {
    // M8: LOS picking delegated to useLosTest; returns true if consumed.
    if (tryPickLosHex?.(hexId)) return;

    if (editorMode.value === 'elevation') {
      if (selectedHexId.value === hexId) {
        selectedHexIds.value = new Set(); // deselect on re-click
      } else {
        selectedHexIds.value = new Set([hexId]);
        adjustHexElevation(hexId, +1);
      }
    } else if (editorMode.value === 'paint') {
      const existingIdx = hexIndex.value.get(hexId);
      if (existingIdx !== undefined) {
        // M1: mutate in-place to avoid object allocation on every paint click
        mapData.value.hexes[existingIdx].terrain = paintTerrain.value;
        onHexUpdate(mapData.value.hexes[existingIdx]);
      } else {
        onHexUpdate({ hex: hexId, terrain: paintTerrain.value });
      }
      selectedHexIds.value = new Set([hexId]);
    } else if (editorMode.value === 'wedge') {
      selectedHexIds.value = selectedHexId.value === hexId ? new Set() : new Set([hexId]);
    } else if (editorMode.value === 'select') {
      if (nativeEvent?.shiftKey) {
        const ids = new Set(selectedHexIds.value);
        if (ids.has(hexId)) ids.delete(hexId);
        else ids.add(hexId);
        selectedHexIds.value = ids;
      } else {
        selectedHexIds.value = new Set([hexId]);
      }
    }
  }

  function onHexRightClick(hexId) {
    if (editorMode.value === 'elevation') {
      adjustHexElevation(hexId, -1);
    }
  }

  function onHexMouseenter(hexId) {
    if (editorMode.value === 'paint') {
      const existingIdx = hexIndex.value.get(hexId);
      if (existingIdx !== undefined) {
        // M1: mutate in-place to avoid object allocation on every mousemove
        mapData.value.hexes[existingIdx].terrain = paintTerrain.value;
        onHexUpdate(mapData.value.hexes[existingIdx]);
      } else {
        onHexUpdate({ hex: hexId, terrain: paintTerrain.value });
      }
    }
  }

  return {
    selectedHexId,
    selectedHex,
    adjustHexElevation,
    onHexClick,
    onHexRightClick,
    onHexMouseenter,
  };
}
