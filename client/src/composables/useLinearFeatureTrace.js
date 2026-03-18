import { ref } from 'vue';

/**
 * Linear feature drag-trace state and apply/cancel logic.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData - ref to the loaded map object
 * @param {import('vue').Ref<string|null>} args.paintEdgeFeature - currently selected edge feature type
 * @param {import('vue').Ref<Map>} [args.hexIndex] - optional hexId→index map; falls back to building locally
 * @param {function} args.onMutated - called after applyTrace to set unsaved and save draft
 */
export function useLinearFeatureTrace({ mapData, paintEdgeFeature, hexIndex, onMutated }) {
  const showTraceConfirm = ref(false);
  const pendingTraceEdges = ref([]);
  const liveTraceCount = ref(0);

  function onTraceProgress(count) {
    liveTraceCount.value = count;
  }

  function onTraceComplete(edges) {
    if (!edges.length) return;
    pendingTraceEdges.value = edges;
    liveTraceCount.value = 0;
    showTraceConfirm.value = true;
  }

  function applyTrace() {
    const featureType = paintEdgeFeature.value ?? 'road';
    const byHex = new Map();
    for (const { hexId, dir } of pendingTraceEdges.value) {
      if (!byHex.has(hexId)) byHex.set(hexId, []);
      byHex.get(hexId).push(dir);
    }
    // L2: use caller-provided hexIndex when available to avoid redundant O(n) build.
    const idx = hexIndex ? hexIndex.value : new Map(mapData.value.hexes.map((h, i) => [h.hex, i]));
    const updates = [];
    for (const [hexId, dirs] of byHex) {
      const hexIdx = idx.get(hexId);
      const hex =
        hexIdx !== undefined ? mapData.value.hexes[hexIdx] : { hex: hexId, terrain: 'unknown' };
      const edges = hex.edges ? { ...hex.edges } : {};
      for (const dir of dirs) {
        const features = edges[dir] ? [...edges[dir]] : [];
        if (!features.some((f) => f.type === featureType)) {
          features.push({ type: featureType });
        }
        edges[dir] = features;
      }
      updates.push({ hexIdx, updated: { ...hex, edges } });
    }
    // Single reactive write pass — invalidates hexIndex once instead of once per hex.
    for (const { hexIdx, updated } of updates) {
      if (hexIdx !== undefined) {
        mapData.value.hexes[hexIdx] = updated;
      } else {
        mapData.value.hexes.push(updated);
      }
    }
    onMutated();
    pendingTraceEdges.value = [];
    showTraceConfirm.value = false;
  }

  function cancelTrace() {
    showTraceConfirm.value = false;
    pendingTraceEdges.value = [];
  }

  return {
    showTraceConfirm,
    pendingTraceEdges,
    liveTraceCount,
    onTraceProgress,
    onTraceComplete,
    applyTrace,
    cancelTrace,
  };
}
