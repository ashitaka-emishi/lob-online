import { ref, computed } from 'vue';
import { adjacentHexId } from '../utils/hexGeometry.js';

const OPPOSITE_DIR = { N: 'S', S: 'N', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };

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
 * @param {object} args
 * @param {import('vue').Ref} args.mapData
 * @param {import('vue').Ref<Map>} args.hexIndex
 * @param {import('vue').Ref<Set>} args.selectedHexIds - canonical selection, owned by caller
 * @param {import('vue').Ref<string>} args.editorMode
 * @param {import('vue').Ref<string>} args.paintTerrain
 * @param {import('vue').Ref<string|null>} args.paintEdgeFeature
 * @param {import('vue').ComputedRef<number>} args.elevationMax
 * @param {import('vue').Ref} args.calibration
 * @param {function} [args.tryPickLosHex] - from useLosTest; returns true if click consumed by LOS
 * @param {function} args.onHexUpdate - single-hex mutation handler
 */
export function useHexInteraction({
  mapData,
  hexIndex,
  selectedHexIds,
  editorMode,
  paintTerrain,
  paintEdgeFeature,
  elevationMax,
  calibration,
  tryPickLosHex,
  onHexUpdate,
}) {
  const selectedEdge = ref(null);

  // M5: use .values().next().value — avoids spreading the entire Set into an array
  const selectedHexId = computed(() =>
    selectedHexIds.value.size === 1 ? selectedHexIds.value.values().next().value : null
  );

  const selectedHex = computed(() => {
    if (!selectedHexId.value || !mapData.value) return null;
    const idx = hexIndex.value.get(selectedHexId.value);
    return idx !== undefined
      ? mapData.value.hexes[idx]
      : { hex: selectedHexId.value, terrain: 'unknown' };
  });

  // ── Elevation adjustment ───────────────────────────────────────────────────
  function adjustHexElevation(hexId, delta) {
    if (!mapData.value) return;
    const idx = hexIndex.value.get(hexId);
    const existing = idx !== undefined ? mapData.value.hexes[idx] : undefined;
    const current = existing?.elevation ?? 0;
    const clamped = Math.max(0, Math.min(elevationMax.value, current + delta));
    const updated = existing
      ? { ...existing, elevation: clamped }
      : { hex: hexId, terrain: 'unknown', elevation: clamped };
    onHexUpdate(updated);
  }

  // ── Click / mouseenter / edge handlers ────────────────────────────────────
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
      const existing = existingIdx !== undefined ? mapData.value.hexes[existingIdx] : undefined;
      const updated = existing
        ? { ...existing, terrain: paintTerrain.value }
        : { hex: hexId, terrain: paintTerrain.value };
      onHexUpdate(updated);
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
      const existing = existingIdx !== undefined ? mapData.value.hexes[existingIdx] : undefined;
      const updatedHex = existing
        ? { ...existing, terrain: paintTerrain.value }
        : { hex: hexId, terrain: paintTerrain.value };
      onHexUpdate(updatedHex);
    }
  }

  function onEdgeClick({ hexId, dir }) {
    if (!mapData.value) return;
    const featureType = paintEdgeFeature.value ?? 'road';
    selectedEdge.value = { hexId, dir };

    function toggleEdgeFeature(hex, d, ft) {
      const edges = hex.edges ? { ...hex.edges } : {};
      const features = edges[d] ? [...edges[d]] : [];
      const existingIdx = features.findIndex((f) => f.type === ft);
      if (existingIdx >= 0) {
        features.splice(existingIdx, 1);
      } else {
        features.push({ type: ft });
      }
      if (features.length) edges[d] = features;
      else delete edges[d];
      return { ...hex, edges };
    }

    // Read both hex objects before any mutation so hexIndex is only accessed once.
    const thisIdx = hexIndex.value.get(hexId);
    const thisHex =
      thisIdx !== undefined ? mapData.value.hexes[thisIdx] : { hex: hexId, terrain: 'unknown' };

    const adjId = adjacentHexId(hexId, dir, calibration.value);
    const adjIdx = adjId !== null ? hexIndex.value.get(adjId) : undefined;
    const adjHex = adjId
      ? adjIdx !== undefined
        ? mapData.value.hexes[adjIdx]
        : { hex: adjId, terrain: 'unknown' }
      : null;

    // Apply both updates after all reads.
    onHexUpdate(toggleEdgeFeature(thisHex, dir, featureType));
    if (adjHex) {
      onHexUpdate(toggleEdgeFeature(adjHex, OPPOSITE_DIR[dir], featureType));
    }
  }

  return {
    selectedHexId,
    selectedEdge,
    selectedHex,
    adjustHexElevation,
    onHexClick,
    onHexRightClick,
    onHexMouseenter,
    onEdgeClick,
  };
}
