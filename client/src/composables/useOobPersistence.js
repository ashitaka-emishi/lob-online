import { ref } from 'vue';

const OOB_STORAGE_KEY = 'lob-oob-editor-v1';
const LEADERS_STORAGE_KEY = 'lob-leaders-editor-v1';
const SUCCESSION_STORAGE_KEY = 'lob-succession-editor-v1';
const OOB_API_URL = '/api/tools/oob-editor/data';
const LEADERS_API_URL = '/api/tools/leaders-editor/data';
const SUCCESSION_API_URL = '/api/tools/succession-editor/data';
const DEBOUNCE_MS = 500;

// Structural validation: require union and confederate keys to be non-null objects.
// Mirrors the top-level shape of oob.json and leaders.json without importing server-side Zod.
function _isValidSidedShape(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    data.union !== null &&
    typeof data.union === 'object' &&
    data.confederate !== null &&
    typeof data.confederate === 'object'
  );
}

// Succession shape: union and confederate are arrays (not objects).
function _isValidSuccessionShape(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.union) &&
    Array.isArray(data.confederate)
  );
}

/**
 * OOB/leaders data fetch, save, draft, push, and pull state + logic.
 *
 * Owns: loadData, _executePush, pullFromServer, request/confirm/cancel push+pull,
 * isSyncing, syncError, showPushConfirm, showPullConfirm,
 * _saveToStorage, _loadFromStorage, _scheduleSave.
 *
 * @param {object} args
 * @param {import('vue').Ref} args.oob        - oob data ref (written on load/pull)
 * @param {import('vue').Ref} args.leaders    - leaders data ref (written on load/pull)
 * @param {import('vue').Ref} args.succession - succession data ref (written on load/pull)
 * @param {import('vue').Ref} args.dirty      - dirty flag ref (written on push/pull/load)
 */
export function useOobPersistence({ oob, leaders, succession, dirty }) {
  const isSyncing = ref(false);
  const syncError = ref(null);
  const showPushConfirm = ref(false);
  const showPullConfirm = ref(false);

  let _debounceTimer = null;

  // ── Draft persistence ──────────────────────────────────────────────────────

  function _saveToStorage() {
    try {
      if (oob.value) localStorage.setItem(OOB_STORAGE_KEY, JSON.stringify(oob.value));
      if (leaders.value) localStorage.setItem(LEADERS_STORAGE_KEY, JSON.stringify(leaders.value));
      if (succession.value)
        localStorage.setItem(SUCCESSION_STORAGE_KEY, JSON.stringify(succession.value));
    } catch {
      /* ignore storage errors */
    }
  }

  function _scheduleSave() {
    if (_debounceTimer !== null) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(_saveToStorage, DEBOUNCE_MS);
  }

  function _loadFromStorage() {
    try {
      const rawOob = localStorage.getItem(OOB_STORAGE_KEY);
      const rawLeaders = localStorage.getItem(LEADERS_STORAGE_KEY);
      const rawSuccession = localStorage.getItem(SUCCESSION_STORAGE_KEY);
      if (rawOob && rawLeaders) {
        const parsedOob = JSON.parse(rawOob);
        const parsedLeaders = JSON.parse(rawLeaders);
        if (_isValidSidedShape(parsedOob) && _isValidSidedShape(parsedLeaders)) {
          oob.value = parsedOob;
          leaders.value = parsedLeaders;
          if (rawSuccession) {
            const parsedSuccession = JSON.parse(rawSuccession);
            if (_isValidSuccessionShape(parsedSuccession)) {
              succession.value = parsedSuccession;
            }
          }
          return true;
        }
      }
    } catch {
      /* ignore parse errors */
    }
    return false;
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async function loadData() {
    // L1: try server
    try {
      const [oobRes, leadersRes, successionRes] = await Promise.all([
        fetch(OOB_API_URL),
        fetch(LEADERS_API_URL),
        fetch(SUCCESSION_API_URL),
      ]);
      if (oobRes.ok && leadersRes.ok) {
        const parsedOob = await oobRes.json();
        const parsedLeaders = await leadersRes.json();
        if (!_isValidSidedShape(parsedOob) || !_isValidSidedShape(parsedLeaders)) {
          syncError.value = 'Server returned data with an unrecognised shape';
          return;
        }
        oob.value = parsedOob;
        leaders.value = parsedLeaders;
        if (successionRes.ok) {
          const parsedSuccession = await successionRes.json();
          if (_isValidSuccessionShape(parsedSuccession)) succession.value = parsedSuccession;
        }
        dirty.value = false;
        return;
      }
    } catch {
      /* fall through */
    }

    // L2: try localStorage
    if (_loadFromStorage()) {
      dirty.value = false;
      return;
    }

    // L3: bundled JSON fallback (dynamic import — chunk only loaded if server + storage both fail)
    const [
      { default: oobFallback },
      { default: leadersFallback },
      { default: successionFallback },
    ] = await Promise.all([
      import('../../../data/scenarios/south-mountain/oob.json'),
      import('../../../data/scenarios/south-mountain/leaders.json'),
      import('../../../data/scenarios/south-mountain/succession.json'),
    ]);
    oob.value = oobFallback;
    leaders.value = leadersFallback;
    succession.value = successionFallback;
    dirty.value = false;
  }

  // ── Sync ──────────────────────────────────────────────────────────────────

  async function _executePush() {
    if (!oob.value || !leaders.value) return;
    isSyncing.value = true;
    syncError.value = null;
    try {
      const fetches = [
        fetch(OOB_API_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oob.value),
        }),
        fetch(LEADERS_API_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaders.value),
        }),
      ];
      if (succession.value) {
        fetches.push(
          fetch(SUCCESSION_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(succession.value),
          })
        );
      }
      const [oobRes, leadersRes] = await Promise.all(fetches);
      if (oobRes.ok && leadersRes.ok) {
        dirty.value = false;
        try {
          localStorage.removeItem(OOB_STORAGE_KEY);
          localStorage.removeItem(LEADERS_STORAGE_KEY);
          localStorage.removeItem(SUCCESSION_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } else {
        syncError.value = `Push failed (${oobRes.ok ? leadersRes.status : oobRes.status})`;
      }
    } catch (err) {
      syncError.value = err?.message ?? 'Push failed';
    } finally {
      isSyncing.value = false;
    }
  }

  // Push confirmation gate: requestPush → (user confirms) → confirmPush → _executePush
  function requestPush() {
    showPushConfirm.value = true;
  }

  async function confirmPush() {
    showPushConfirm.value = false;
    await _executePush();
  }

  function cancelPush() {
    showPushConfirm.value = false;
  }

  async function pullFromServer() {
    isSyncing.value = true;
    syncError.value = null;
    try {
      const [oobRes, leadersRes, successionRes] = await Promise.all([
        fetch(OOB_API_URL),
        fetch(LEADERS_API_URL),
        fetch(SUCCESSION_API_URL),
      ]);
      if (oobRes.ok && leadersRes.ok) {
        const parsedOob = await oobRes.json();
        const parsedLeaders = await leadersRes.json();
        if (!_isValidSidedShape(parsedOob) || !_isValidSidedShape(parsedLeaders)) {
          syncError.value = 'Server returned data with an unrecognised shape';
        } else {
          oob.value = parsedOob;
          leaders.value = parsedLeaders;
          if (successionRes.ok) {
            const parsedSuccession = await successionRes.json();
            if (_isValidSuccessionShape(parsedSuccession)) succession.value = parsedSuccession;
          }
          dirty.value = false;
          try {
            localStorage.removeItem(OOB_STORAGE_KEY);
            localStorage.removeItem(LEADERS_STORAGE_KEY);
            localStorage.removeItem(SUCCESSION_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
      } else {
        syncError.value = `Pull failed (${oobRes.ok ? leadersRes.status : oobRes.status})`;
      }
    } catch (err) {
      syncError.value = err?.message ?? 'Pull failed';
    } finally {
      isSyncing.value = false;
    }
  }

  // Pull confirmation gate: requestPull → (user confirms if dirty) → confirmPull → pullFromServer
  async function requestPull() {
    if (dirty.value) {
      showPullConfirm.value = true;
    } else {
      await pullFromServer();
    }
  }

  async function confirmPull() {
    showPullConfirm.value = false;
    await pullFromServer();
  }

  function cancelPull() {
    showPullConfirm.value = false;
  }

  return {
    isSyncing,
    syncError,
    showPushConfirm,
    showPullConfirm,
    loadData,
    scheduleSave: _scheduleSave,
    requestPush,
    confirmPush,
    cancelPush,
    requestPull,
    confirmPull,
    cancelPull,
    pullFromServer,
  };
}
