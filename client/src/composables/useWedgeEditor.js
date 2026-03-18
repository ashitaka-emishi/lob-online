/**
 * Wedge elevation update and initialization for the selected hex.
 *
 * Extracted from MapEditorView so wedge-specific mutation logic lives in one place.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.mapData - ref to the loaded map object
 * @param {import('vue').Ref<Map>} args.hexIndex - hexId → array-index map
 * @param {import('vue').ComputedRef<string|null>} args.selectedHexId - currently selected hex id
 * @param {function} args.onHexUpdate - single-hex mutation handler
 */
export function useWedgeEditor({ mapData, hexIndex, selectedHexId, onHexUpdate }) {
  function onWedgeUpdate(newElev) {
    if (!selectedHexId.value || !mapData.value) return;
    const idx = hexIndex.value.get(selectedHexId.value);
    const existing = idx !== undefined ? mapData.value.hexes[idx] : undefined;
    const updated = existing
      ? { ...existing, wedgeElevations: newElev }
      : { hex: selectedHexId.value, terrain: 'unknown', wedgeElevations: newElev };
    onHexUpdate(updated);
  }

  function initWedgeElevations() {
    if (!selectedHexId.value || !mapData.value) return;
    const idx = hexIndex.value.get(selectedHexId.value);
    const existing = idx !== undefined ? mapData.value.hexes[idx] : undefined;
    const updated = existing
      ? { ...existing, wedgeElevations: [0, 0, 0, 0, 0, 0] }
      : { hex: selectedHexId.value, terrain: 'unknown', wedgeElevations: [0, 0, 0, 0, 0, 0] };
    onHexUpdate(updated);
  }

  return { onWedgeUpdate, initWedgeElevations };
}
