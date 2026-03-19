import { resolveHexOrStub } from '../utils/hexGeometry.js';

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
    // M3: use resolveHexOrStub to eliminate the repeated find-or-stub pattern
    const existing = resolveHexOrStub(mapData.value.hexes, hexIndex.value, selectedHexId.value);
    onHexUpdate({ ...existing, wedgeElevations: newElev });
  }

  function initWedgeElevations() {
    if (!selectedHexId.value || !mapData.value) return;
    const existing = resolveHexOrStub(mapData.value.hexes, hexIndex.value, selectedHexId.value);
    onHexUpdate({ ...existing, wedgeElevations: [0, 0, 0, 0, 0, 0] });
  }

  return { onWedgeUpdate, initWedgeElevations };
}
