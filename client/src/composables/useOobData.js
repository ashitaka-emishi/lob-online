import { computed, ref } from 'vue';

import { SIDES } from '../utils/sides.js';

// Flatten an OOB node and all descendants into map entries.
// Each node with an `id` field becomes one entry with name, side, strengthPoints, counterFile.
function collectOobUnits(obj, side, map) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.id) {
    map.set(obj.id, {
      name: obj.name ?? obj.id,
      side,
      strengthPoints: obj.strengthPoints ?? null,
      counterFile: obj.counterRef?.front ?? null,
    });
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') collectOobUnits(val, side, map);
  }
}

/**
 * Composable that fetches Order of Battle data from /api/v1/oob and exposes
 * a flat unit-enrichment map for use by GameView and its children. (#401, #431)
 *
 * @returns {{ oobData, oobError, fetchOob, oobUnitMap }}
 */
export function useOobData() {
  const oobData = ref(null);
  const oobError = ref(null);

  async function fetchOob() {
    try {
      const res = await fetch('/api/v1/oob');
      oobData.value = await res.json();
      oobError.value = null;
    } catch (err) {
      oobError.value = err.message;
    }
  }

  // Flat Map<unitId, { name, side, strengthPoints, counterFile }> derived from oobData.
  const oobUnitMap = computed(() => {
    const map = new Map();
    if (!oobData.value) return map;
    for (const side of [SIDES.UNION, SIDES.CONFEDERATE]) {
      if (oobData.value[side]) collectOobUnits(oobData.value[side], side, map);
    }
    return map;
  });

  return { oobData, oobError, fetchOob, oobUnitMap };
}
