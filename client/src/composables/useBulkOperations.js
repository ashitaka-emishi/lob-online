/**
 * Bulk map mutation operations.
 *
 * All operations mutate hex objects in-place to avoid allocating ~2000 new
 * objects per call. Vue 3's Proxy reactivity detects property-level mutations,
 * so this is both correct and more GC-friendly than map+spread.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData - ref to the loaded map object
 * @param {import('vue').ComputedRef<number>} args.elevationMax - max elevation level
 * @param {function} args.onMutated - called after every successful mutation (sets unsaved, saves draft)
 */
export function useBulkOperations({ mapData, elevationMax, onMutated }) {
  function clearAllElevations() {
    if (!mapData.value) return;
    mapData.value.hexes.forEach((h) => {
      delete h.elevation;
    });
    onMutated();
  }

  function raiseAll() {
    if (!mapData.value) return;
    const max = elevationMax.value;
    mapData.value.hexes.forEach((h) => {
      h.elevation = Math.min(max, (h.elevation ?? 0) + 1);
    });
    onMutated();
  }

  function lowerAll() {
    if (!mapData.value) return;
    mapData.value.hexes.forEach((h) => {
      h.elevation = Math.max(0, (h.elevation ?? 0) - 1);
    });
    onMutated();
  }

  function clearAllTerrain() {
    if (!mapData.value) return;
    mapData.value.hexes.forEach((h) => {
      h.terrain = 'clear';
    });
    onMutated();
  }

  function clearAllWedges() {
    if (!mapData.value) return;
    mapData.value.hexes.forEach((h) => {
      if (h.wedgeElevations) h.wedgeElevations = [0, 0, 0, 0, 0, 0];
    });
    onMutated();
  }

  return { clearAllElevations, raiseAll, lowerAll, clearAllTerrain, clearAllWedges };
}
