import { adjacentHexId, resolveHexOrStub, OPPOSITE_DIR } from '../utils/hexGeometry.js';

/**
 * Edge feature toggle handler — extracted from useHexInteraction (M2).
 *
 * Handles the onEdgeClick event: toggles a linear feature type on the clicked edge
 * and its mirror edge on the adjacent hex.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData
 * @param {import('vue').Ref<Map>} args.hexIndex
 * @param {import('vue').Ref<string|null>} args.paintEdgeFeature
 * @param {import('vue').Ref} args.calibration
 * @param {function} args.onHexUpdate
 */
export function useEdgeToggle({ mapData, hexIndex, paintEdgeFeature, calibration, onHexUpdate }) {
  function toggleEdgeFeature(hex, dir, featureType) {
    const edges = hex.edges ? { ...hex.edges } : {};
    const features = edges[dir] ? [...edges[dir]] : [];
    const existingIdx = features.findIndex((f) => f.type === featureType);
    if (existingIdx >= 0) {
      features.splice(existingIdx, 1);
    } else {
      features.push({ type: featureType });
    }
    if (features.length) edges[dir] = features;
    else delete edges[dir];
    return { ...hex, edges };
  }

  function onEdgeClick({ hexId, dir }) {
    if (!mapData.value) return;
    const featureType = paintEdgeFeature.value ?? 'road';

    // Read both hex objects before any mutation so hexIndex is only accessed once.
    const thisHex = resolveHexOrStub(mapData.value.hexes, hexIndex.value, hexId);
    const adjId = adjacentHexId(hexId, dir, calibration.value);
    const adjHex = adjId ? resolveHexOrStub(mapData.value.hexes, hexIndex.value, adjId) : null;

    // Apply both updates after all reads.
    // onHexUpdate is called twice intentionally: each hex owns its own edge feature list, so
    // the clicked hex (dir) and its neighbour (OPPOSITE_DIR[dir]) must each be updated
    // independently. The debounce in saveMapDraft ensures only one localStorage write results.
    onHexUpdate(toggleEdgeFeature(thisHex, dir, featureType));
    if (adjHex) {
      onHexUpdate(toggleEdgeFeature(adjHex, OPPOSITE_DIR[dir], featureType));
    }
  }

  return { onEdgeClick };
}
