import { computed, ref } from 'vue';

import { SIDES } from '../utils/sides.js';

// Flatten an OOB node and all descendants into map entries.
// Any node with an `id` field is treated as a displayable entity (unit, corps, leader, etc.).
// This is intentional: the map is used for OOB enrichment only, and consumers filter on
// counterFile/strengthPoints as needed. If the OOB schema adds non-unit nodes with `id`
// fields, revisit this heuristic.
function collectOobUnits(obj, side, map) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.id) {
    map.set(obj.id, {
      name: obj.name ?? obj.id,
      side,
      strengthPoints: obj.strengthPoints ?? null,
      counterFile: obj.counterRef?.front ?? null,
      weapon: obj.weapon ?? null, // LOB weapon code (R, C, SR, etc.) for display (#408)
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
  const leadersData = ref(null);
  // TODO: oobError is a raw error string passed directly to the DOM by consumers (e.g. GameView).
  // Consider sanitizing or wrapping before display to avoid raw API messages reaching users. (#436)
  const oobError = ref(null);

  async function fetchOob() {
    try {
      const [oobRes, leadersRes] = await Promise.all([
        fetch('/api/v1/oob'),
        fetch('/api/v1/leaders'),
      ]);
      if (!oobRes.ok) {
        oobError.value = `OOB request failed (${oobRes.status})`;
        return;
      }
      if (!leadersRes.ok) {
        oobError.value = `Leaders request failed (${leadersRes.status})`;
        return;
      }
      oobData.value = await oobRes.json();
      leadersData.value = await leadersRes.json();
      oobError.value = null;
    } catch (err) {
      oobError.value = err.message;
    }
  }

  // Flat Map<unitId, { name, side, strengthPoints, counterFile, weapon }> derived from oobData + leadersData.
  // Iterates top-level keys matching SIDES constants — depends on both schemas having `union`
  // and `confederate` as top-level keys. Update if the schema shape changes.
  const oobUnitMap = computed(() => {
    const map = new Map();
    for (const side of [SIDES.UNION, SIDES.CONFEDERATE]) {
      if (oobData.value?.[side]) collectOobUnits(oobData.value[side], side, map);
      if (leadersData.value?.[side]) collectOobUnits(leadersData.value[side], side, map);
    }
    return map;
  });

  return { oobData, oobError, fetchOob, oobUnitMap };
}
