import { ref } from 'vue';

/**
 * Map data fetch, save, draft, push, and pull state + logic.
 *
 * Call cleanup() in the caller's onUnmounted to clear the debounce timer.
 * Call fetchMapData() in the caller's onMounted hook.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.calibration - writable calibration ref (updated on load/pull)
 * @param {object} args.defaultCalibration - default calibration values
 * @param {string} args.storageKey - localStorage key for calibration
 * @param {string} args.draftKey - localStorage key for map draft
 * @param {string} args.draftKeyV1 - legacy v1 draft key (migrated on first load)
 */
export function useMapPersistence({
  calibration,
  defaultCalibration,
  storageKey,
  draftKey,
  draftKeyV1,
}) {
  const mapData = ref(null);
  const fetchError = ref('');
  const unsaved = ref(false);
  const saveStatus = ref(''); // '' | 'saving' | 'saved' | 'error'
  const isOffline = ref(false);
  const serverSavedAt = ref(0);
  const showPushConfirm = ref(false);
  const showPullConfirm = ref(false);
  const isPulling = ref(false);
  const pullError = ref('');
  const saveErrors = ref([]);
  const draftBannerVisible = ref(false);

  let saveMapDraftTimer = null;

  function cleanup() {
    if (saveMapDraftTimer !== null) clearTimeout(saveMapDraftTimer);
  }

  function saveMapDraft() {
    if (saveMapDraftTimer !== null) clearTimeout(saveMapDraftTimer);
    saveMapDraftTimer = setTimeout(() => {
      saveMapDraftTimer = null;
      if (!mapData.value) return;
      try {
        const draft = { ...mapData.value, _savedAt: Date.now() };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (_) {
        /* ignore storage errors */
      }
    }, 500);
  }

  function restoreDraft() {
    try {
      const draftStr = localStorage.getItem(draftKey);
      if (!draftStr) return;
      const draft = JSON.parse(draftStr);
      delete draft._savedAt;
      mapData.value = draft;
      draftBannerVisible.value = false;
    } catch (_) {
      /* ignore */
    }
  }

  function dismissDraft() {
    localStorage.removeItem(draftKey);
    draftBannerVisible.value = false;
  }

  async function fetchServerData() {
    const res = await fetch('/api/tools/map-editor/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function executePull() {
    isPulling.value = true;
    pullError.value = '';
    try {
      const serverData = await fetchServerData();
      mapData.value = serverData;
      serverSavedAt.value = serverData._savedAt ?? 0;
      localStorage.removeItem(draftKey);
      unsaved.value = false;
      isOffline.value = false;
      if (serverData.gridSpec) {
        calibration.value = { ...defaultCalibration, ...serverData.gridSpec };
        localStorage.setItem(storageKey, JSON.stringify(calibration.value));
      }
    } catch (err) {
      pullError.value = err.message;
    } finally {
      isPulling.value = false;
    }
  }

  async function pullFromServer() {
    if (unsaved.value) {
      showPullConfirm.value = true;
      return;
    }
    await executePull();
  }

  async function fetchMapData() {
    // Migrate v1 draft key to current key (one-time)
    try {
      const v1 = localStorage.getItem(draftKeyV1);
      if (v1) {
        localStorage.setItem(draftKey, v1);
        localStorage.removeItem(draftKeyV1);
      }
    } catch (_) {
      /* ignore */
    }

    try {
      const serverData = await fetchServerData();

      serverSavedAt.value = serverData._savedAt ?? 0;

      // Check for a local draft newer than server data
      try {
        const draftStr = localStorage.getItem(draftKey);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if ((draft._savedAt ?? 0) > serverSavedAt.value) {
            draftBannerVisible.value = true;
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch (_) {
        /* ignore */
      }

      mapData.value = serverData;
      if (mapData.value.gridSpec) {
        calibration.value = { ...defaultCalibration, ...mapData.value.gridSpec };
        localStorage.setItem(storageKey, JSON.stringify(calibration.value));
      }
    } catch (err) {
      // Offline fallback: try loading local draft
      try {
        const draftStr = localStorage.getItem(draftKey);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          mapData.value = draft;
          if (draft.gridSpec) {
            calibration.value = { ...defaultCalibration, ...draft.gridSpec };
          }
          isOffline.value = true;
          return;
        }
      } catch (_) {
        /* ignore */
      }
      fetchError.value = err.message;
    }
  }

  async function executePush() {
    if (!mapData.value) return;
    saveStatus.value = 'saving';
    saveErrors.value = [];
    try {
      const res = await fetch('/api/tools/map-editor/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData.value),
      });
      const body = await res.json();
      if (res.ok) {
        serverSavedAt.value = body._savedAt ?? Date.now();
        localStorage.setItem(storageKey, JSON.stringify(calibration.value));
        unsaved.value = false;
        saveStatus.value = 'saved';
        localStorage.removeItem(draftKey);
        setTimeout(() => {
          saveStatus.value = '';
        }, 2000);
      } else {
        saveStatus.value = 'error';
        saveErrors.value = body.issues ?? [];
      }
    } catch (err) {
      saveStatus.value = 'error';
      saveErrors.value = [{ message: err.message }];
    }
  }

  async function save() {
    if (isOffline.value) return;
    saveErrors.value = [];
    if (!mapData.value) {
      localStorage.setItem(storageKey, JSON.stringify(calibration.value));
      saveStatus.value = 'saved';
      setTimeout(() => {
        saveStatus.value = '';
      }, 2000);
      return;
    }

    // Show confirmation if server has data newer than local draft
    let localDraftSavedAt = 0;
    try {
      const draftStr = localStorage.getItem(draftKey);
      if (draftStr) localDraftSavedAt = JSON.parse(draftStr)._savedAt ?? 0;
    } catch (_) {
      /* ignore */
    }
    if (unsaved.value && serverSavedAt.value > localDraftSavedAt) {
      showPushConfirm.value = true;
      return;
    }

    await executePush();
  }

  return {
    cleanup,
    mapData,
    fetchError,
    unsaved,
    saveStatus,
    isOffline,
    serverSavedAt,
    showPushConfirm,
    showPullConfirm,
    isPulling,
    pullError,
    saveErrors,
    draftBannerVisible,
    saveMapDraft,
    restoreDraft,
    dismissDraft,
    fetchMapData,
    pullFromServer,
    executePull,
    save,
    executePush,
  };
}
