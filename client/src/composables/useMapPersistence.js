import { ref } from 'vue';

// Known top-level keys from MapSchema; used by isValidDraft to reject unrecognised structures.
// Must stay in sync with MapSchema.shape — verified by the cross-check test in useMapPersistence.test.js.
const KNOWN_MAP_KEYS = new Set([
  '_status',
  '_savedAt',
  '_description',
  '_digitizationNote',
  '_todoHexes',
  '_digitizationPlan',
  'scenario',
  'layout',
  'hexIdFormat',
  'gridSpec',
  'terrainTypes',
  'hexFeatureTypes',
  'edgeFeatureTypes',
  'elevationSystem',
  'vpHexes',
  'entryHexes',
  'hexes',
]);

// L1: validate that a parsed localStorage object has the expected map shape,
// including that each hex entry has a hex string property (defense against tampered storage).
// Also checks that all top-level keys are known (#127) and that gridSpec, if present, is an
// object (not a string or array that could be injected via tampered localStorage).
// L2: allowlist and gridSpec checks run before hexes.every() (O(n) over 2000+ hexes) to
// short-circuit cheaply on structurally invalid objects.
function isValidDraft(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (!Array.isArray(obj.hexes)) return false;
  // Reject drafts with unknown top-level keys (cheap — runs before the O(n) hexes.every)
  if (Object.keys(obj).some((k) => !KNOWN_MAP_KEYS.has(k))) return false;
  // gridSpec, if present, must be a non-null, non-array object
  if (obj.gridSpec !== undefined) {
    if (obj.gridSpec === null || typeof obj.gridSpec !== 'object' || Array.isArray(obj.gridSpec))
      return false;
  }
  if (!obj.hexes.every((h) => h !== null && typeof h === 'object' && typeof h.hex === 'string'))
    return false;
  return true;
}

/**
 * Map data fetch, save, draft, push, and pull state + logic.
 *
 * Call cleanup() in the caller's onUnmounted to clear the debounce timer.
 * Call fetchMapData() in the caller's onMounted hook.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.calibration - calibration ref (read for push; write via callback)
 * @param {string} args.storageKey - localStorage key for calibration
 * @param {string} args.draftKey - localStorage key for map draft
 * @param {string} args.draftKeyV1 - legacy v1 draft key (migrated on first load)
 * @param {function} [args.onCalibrationLoaded] - called with raw gridSpec when server/draft data
 *   contains a gridSpec; caller owns the calibration write and localStorage update (M4)
 */
export function useMapPersistence({
  calibration,
  storageKey,
  draftKey,
  draftKeyV1,
  onCalibrationLoaded,
}) {
  // L4: guard against accidental empty/missing key args
  if (!storageKey || !draftKey) {
    throw new Error('useMapPersistence: storageKey and draftKey are required non-empty strings');
  }

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
  // L1: track save-flash timers so they can be cleared on unmount
  const pendingTimers = new Set();

  function cleanup() {
    if (saveMapDraftTimer !== null) clearTimeout(saveMapDraftTimer);
    for (const t of pendingTimers) clearTimeout(t);
    pendingTimers.clear();
  }

  // L1: wrapper to track and auto-remove timeouts
  function trackedTimeout(fn, ms) {
    const t = setTimeout(() => {
      pendingTimers.delete(t);
      fn();
    }, ms);
    pendingTimers.add(t);
    return t;
  }

  function saveMapDraft() {
    if (saveMapDraftTimer !== null) clearTimeout(saveMapDraftTimer);
    // L5: 1000ms debounce (draft is a safety net, not real-time)
    saveMapDraftTimer = setTimeout(() => {
      saveMapDraftTimer = null;
      if (!mapData.value) return;
      try {
        const draft = { ...mapData.value, _savedAt: Date.now() };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (_) {
        /* ignore storage errors */
      }
    }, 1000);
  }

  function restoreDraft() {
    try {
      const draftStr = localStorage.getItem(draftKey);
      if (!draftStr) return;
      const draft = JSON.parse(draftStr);
      // M1: validate shape before assigning to application state
      if (!isValidDraft(draft)) {
        localStorage.removeItem(draftKey);
        return;
      }
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

  async function _executePull() {
    isPulling.value = true;
    pullError.value = '';
    try {
      const serverData = await fetchServerData();
      // L8: validate server response shape for consistency with draft validation
      if (!isValidDraft(serverData)) {
        throw new Error('Server returned an invalid map data shape');
      }
      mapData.value = serverData;
      serverSavedAt.value = serverData._savedAt ?? 0;
      localStorage.removeItem(draftKey);
      unsaved.value = false;
      isOffline.value = false;
      if (serverData.gridSpec) {
        // M4: caller owns the calibration write via onCalibrationLoaded callback
        onCalibrationLoaded?.(serverData.gridSpec);
      }
    } catch (err) {
      // M2: log full error to console; show safe message in UI
      console.error('[useMapPersistence] pull error:', err);
      pullError.value = 'Failed to pull from server. Check console for details.';
    } finally {
      isPulling.value = false;
    }
  }

  async function pullFromServer() {
    if (unsaved.value) {
      showPullConfirm.value = true;
      return;
    }
    await _executePull();
  }

  // M6: expose confirmPull/cancelPull instead of executePull directly
  async function confirmPull() {
    showPullConfirm.value = false;
    await _executePull();
  }

  function cancelPull() {
    showPullConfirm.value = false;
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
          // M1: validate shape before comparing timestamps
          if (!isValidDraft(draft)) {
            localStorage.removeItem(draftKey);
          } else if ((draft._savedAt ?? 0) > serverSavedAt.value) {
            draftBannerVisible.value = true;
          } else {
            localStorage.removeItem(draftKey);
          }
        }
      } catch (_) {
        /* ignore */
      }

      // L8: validate server response shape for consistency with draft validation
      if (!isValidDraft(serverData)) {
        throw new Error('Server returned an invalid map data shape');
      }
      mapData.value = serverData;
      if (mapData.value.gridSpec) {
        // M4: caller owns the calibration write via onCalibrationLoaded callback
        onCalibrationLoaded?.(mapData.value.gridSpec);
      }
    } catch (err) {
      // Offline fallback: try loading local draft
      try {
        const draftStr = localStorage.getItem(draftKey);
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          // M1: validate shape before assigning to application state
          if (isValidDraft(draft)) {
            mapData.value = draft;
            if (draft.gridSpec) {
              // M4: caller owns the calibration write via onCalibrationLoaded callback
              onCalibrationLoaded?.(draft.gridSpec);
            }
            isOffline.value = true;
            return;
          }
          localStorage.removeItem(draftKey);
        }
      } catch (_) {
        /* ignore */
      }
      // M2: log full error; show safe message in UI
      console.error('[useMapPersistence] fetchMapData error:', err);
      fetchError.value = 'Failed to load map data. Check console for details.';
    }
  }

  async function _executePush() {
    if (!mapData.value) return;
    saveStatus.value = 'saving';
    saveErrors.value = [];
    try {
      // L3: PUT to same-origin dev-only endpoint (MAP_EDITOR_ENABLED guard on server).
      // Content-Type: application/json triggers CORS preflight for cross-origin requests.
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
        // L1: track timeout so it can be cleared on unmount
        trackedTimeout(() => {
          saveStatus.value = '';
        }, 2000);
      } else {
        saveStatus.value = 'error';
        saveErrors.value = body.issues ?? [];
      }
    } catch (err) {
      // M2: log full error; show safe message in UI
      console.error('[useMapPersistence] push error:', err);
      saveStatus.value = 'error';
      saveErrors.value = [{ message: 'Failed to push to server. Check console for details.' }];
    }
  }

  async function save() {
    if (isOffline.value) return;
    saveErrors.value = [];
    if (!mapData.value) {
      localStorage.setItem(storageKey, JSON.stringify(calibration.value));
      saveStatus.value = 'saved';
      // L1: track timeout so it can be cleared on unmount
      trackedTimeout(() => {
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

    await _executePush();
  }

  // M6: expose confirmSave/cancelSave instead of executePush directly
  async function confirmSave() {
    showPushConfirm.value = false;
    await _executePush();
  }

  function cancelSave() {
    showPushConfirm.value = false;
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
    confirmPull,
    cancelPull,
    save,
    confirmSave,
    cancelSave,
  };
}
