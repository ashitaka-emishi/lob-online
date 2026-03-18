/**
 * Bulk map mutation operations.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData - ref to the loaded map object
 * @param {import('vue').ComputedRef<number>} args.elevationMax - max elevation level
 * @param {function} args.onMutated - called after every successful mutation (sets unsaved, saves draft)
 */
export function useBulkOperations({ mapData, elevationMax, onMutated }) {
  function clearAllElevations() {
    if (!mapData.value) return;
    mapData.value.hexes = mapData.value.hexes.map(({ elevation: _elevation, ...rest }) => rest);
    onMutated();
  }

  function raiseAll() {
    if (!mapData.value) return;
    const max = elevationMax.value;
    mapData.value.hexes = mapData.value.hexes.map((h) => ({
      ...h,
      elevation: Math.min(max, (h.elevation ?? 0) + 1),
    }));
    onMutated();
  }

  function lowerAll() {
    if (!mapData.value) return;
    mapData.value.hexes = mapData.value.hexes.map((h) => ({
      ...h,
      elevation: Math.max(0, (h.elevation ?? 0) - 1),
    }));
    onMutated();
  }

  function clearAllTerrain() {
    if (!mapData.value) return;
    mapData.value.hexes = mapData.value.hexes.map((h) => ({ ...h, terrain: 'clear' }));
    onMutated();
  }

  function clearAllWedges() {
    if (!mapData.value) return;
    mapData.value.hexes = mapData.value.hexes.map((h) => {
      if (!h.wedgeElevations) return h;
      return { ...h, wedgeElevations: [0, 0, 0, 0, 0, 0] };
    });
    onMutated();
  }

  return { clearAllElevations, raiseAll, lowerAll, clearAllTerrain, clearAllWedges };
}
