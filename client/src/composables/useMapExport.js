import { ref, watch } from 'vue';

function stripPrivateFields(obj) {
  if (Array.isArray(obj)) return obj.map(stripPrivateFields);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!k.startsWith('_')) out[k] = stripPrivateFields(v);
    }
    return out;
  }
  return obj;
}

/**
 * Manages map export overlay state, snapshot generation, clipboard copy, and file download.
 *
 * Export is intentionally NOT a computed property — the deep-walk through mapData is
 * expensive and should only run at export time, not on every reactive change.
 *
 * @param {import('vue').Ref} mapData - reactive ref to the current map data object
 * @param {import('vue').Ref} calibration - reactive ref to the current calibration object
 * @returns {{ showExportOverlay, exportSnapshot, getEngineExport, copyMapData, downloadExport }}
 */
export function useMapExport(mapData, calibration) {
  const showExportOverlay = ref(false);
  const exportSnapshot = ref(null);

  function getEngineExport() {
    if (!mapData.value) return null;
    return stripPrivateFields({ ...mapData.value, gridSpec: calibration.value });
  }

  watch(showExportOverlay, (open) => {
    exportSnapshot.value = open ? getEngineExport() : null;
  });

  function copyMapData() {
    const data = getEngineExport();
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }

  function downloadExport() {
    const data = getEngineExport();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { showExportOverlay, exportSnapshot, getEngineExport, copyMapData, downloadExport };
}
