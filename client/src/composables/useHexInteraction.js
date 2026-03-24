import { computed, ref } from 'vue';
import { resolveHexOrStub } from '../utils/hexGeometry.js';

/**
 * Hex interaction handlers and selection state derivations.
 *
 * `selectedHexIds` (Set ref) is the canonical selection. The ref is owned by the caller, but
 * this composable has write access — it reassigns `.value` directly by contract. The caller
 * wires the ref and may observe it, but selection changes are not interceptable.
 * Passed in so the accordion's onClearSelection callback can be wired before this composable
 * is constructed (H2: eliminates the lazy-callback workaround).
 *
 * LOS pick state is handled by useLosTest. Pass its `tryPickLosHex` here so click events
 * are routed correctly without coupling this composable to LOS internals (M8).
 *
 * Edge feature toggling is handled by useEdgeToggle (M2).
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData
 * @param {import('vue').Ref<Map>} args.hexIndex
 * @param {import('vue').Ref<Set>} args.selectedHexIds - composable has write access by contract
 * @param {import('vue').Ref<string>} args.editorMode
 * @param {import('vue').Ref<string>} args.paintTerrain
 * @param {import('vue').ComputedRef<number>} args.elevationMax
 * @param {import('vue').Ref<number>} [args.elevationTarget] - target value for elevation painting; defaults to ref(1)
 * @param {import('vue').Ref<object|null>} [args.paintHexFeature] - hex feature to paint (e.g. {type:'building'}); null → use paintTerrain
 * @param {import('vue').Ref<string>} [args.paintMode] - 'click'|'paint'; defaults to 'paint'
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
  elevationTarget,
  paintHexFeature,
  paintMode,
  tryPickLosHex,
  onHexUpdate,
}) {
  // Default paintMode to 'paint' to preserve backward compat with callers that don't pass it.
  // Use ref() so the fallback is reactive, matching the behaviour of a real caller-supplied ref.
  const _paintMode = paintMode ?? ref('paint');
  // Default elevationTarget to 1 for callers that haven't wired the slider yet.
  const _elevationTarget = elevationTarget ?? ref(1);
  // paintHexFeature: when set, applyPaint writes hexFeature instead of terrain so the two
  // concepts stay distinct. Callers that don't yet pass this get the null fallback (terrain-only).
  const _paintHexFeature = paintHexFeature ?? ref(null);
  // M5: use .values().next().value — avoids spreading the entire Set into an array
  const selectedHexId = computed(() =>
    selectedHexIds.value.size === 1 ? selectedHexIds.value.values().next().value : null
  );

  // M3: use resolveHexOrStub to eliminate the repeated find-or-stub pattern
  const selectedHex = computed(() => {
    if (!selectedHexId.value || !mapData.value) return null;
    return resolveHexOrStub(mapData.value.hexes, hexIndex.value, selectedHexId.value);
  });

  // ── Elevation adjustment ───────────────────────────────────────────────────

  // Delta-based — used internally for adjustHexElevation (retained for API stability).
  function adjustHexElevation(hexId, delta) {
    if (!mapData.value) return;
    const existing = resolveHexOrStub(mapData.value.hexes, hexIndex.value, hexId);
    const current = existing.elevation ?? 0;
    const clamped = Math.max(0, Math.min(elevationMax.value, current + delta));
    onHexUpdate({ ...existing, elevation: clamped });
  }

  // Target-based — used by click/paint; sets elevation to the slider's fixed value.
  function paintHexElevation(hexId) {
    if (!mapData.value) return;
    const existing = resolveHexOrStub(mapData.value.hexes, hexIndex.value, hexId);
    const clamped = Math.max(0, Math.min(elevationMax.value, _elevationTarget.value));
    onHexUpdate({ ...existing, elevation: clamped });
  }

  // Right-click clears elevation to 0.
  function clearHexElevation(hexId) {
    if (!mapData.value) return;
    const existing = resolveHexOrStub(mapData.value.hexes, hexIndex.value, hexId);
    onHexUpdate({ ...existing, elevation: 0 });
  }

  // ── Click / mouseenter handlers ────────────────────────────────────────────

  // M2: shared paint helper — eliminates identical blocks in onHexClick and onHexMouseenter.
  // When paintHexFeature is set (e.g. building), writes hexFeature instead of terrain so the
  // two concepts stay distinct in the data model.
  function applyPaint(hexId) {
    const existingIdx = hexIndex.value.get(hexId);
    if (_paintHexFeature.value) {
      // Feature paint — sets hexFeature, leaves terrain untouched.
      if (existingIdx !== undefined) {
        mapData.value.hexes[existingIdx].hexFeature = _paintHexFeature.value;
        onHexUpdate(mapData.value.hexes[existingIdx]);
      } else {
        onHexUpdate({ hex: hexId, hexFeature: _paintHexFeature.value });
      }
    } else if (existingIdx !== undefined) {
      // M1: mutate in-place to avoid object allocation on every paint stroke
      mapData.value.hexes[existingIdx].terrain = paintTerrain.value;
      onHexUpdate(mapData.value.hexes[existingIdx]);
    } else {
      onHexUpdate({ hex: hexId, terrain: paintTerrain.value });
    }
  }

  function onHexClick(hexId, nativeEvent) {
    // M8: LOS picking delegated to useLosTest; returns true if consumed.
    if (tryPickLosHex?.(hexId)) return;

    if (editorMode.value === 'elevation') {
      if (selectedHexId.value === hexId) {
        selectedHexIds.value = new Set(); // deselect on re-click
      } else {
        selectedHexIds.value = new Set([hexId]);
        paintHexElevation(hexId);
      }
    } else if (editorMode.value === 'paint') {
      applyPaint(hexId);
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
      clearHexElevation(hexId);
    } else if (editorMode.value === 'paint') {
      // Right-click clears terrain to 'clear' and removes building overlay.
      const existingIdx = hexIndex.value.get(hexId);
      if (existingIdx !== undefined) {
        mapData.value.hexes[existingIdx].terrain = 'clear';
        mapData.value.hexes[existingIdx].hexFeature = null;
        onHexUpdate(mapData.value.hexes[existingIdx]);
      }
    }
  }

  function onHexMouseenter(hexId) {
    if (_paintMode.value !== 'paint') return;
    if (editorMode.value === 'paint') {
      applyPaint(hexId);
    } else if (editorMode.value === 'elevation') {
      paintHexElevation(hexId);
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
