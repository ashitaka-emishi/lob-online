import { ref } from 'vue';

import { isValidSidedObjectShape, isValidSuccessionShape } from './oobValidators.js';

const OOB_STORAGE_KEY = 'lob-oob-editor-v1';
const LEADERS_STORAGE_KEY = 'lob-leaders-editor-v1';
const SUCCESSION_STORAGE_KEY = 'lob-succession-editor-v1';
const DEBOUNCE_MS = 500;

// #529 — build module-scoped URLs when a slug is supplied; fall back to legacy tool endpoints
// #541 — warn when no slug is given so misdirected writes are not silent
function buildUrls(moduleSlug) {
  if (moduleSlug) {
    return {
      oob: `/api/v1/modules/${moduleSlug}/oob`,
      leaders: `/api/v1/modules/${moduleSlug}/leaders`,
      succession: `/api/v1/modules/${moduleSlug}/succession`,
    };
  }
  console.warn(
    '[useOobPersistence] No moduleSlug provided — falling back to legacy tool endpoints. ' +
      'Push/pull will target /api/tools/* routes. Pass moduleSlug to use module-scoped API.'
  );
  return {
    oob: '/api/tools/oob-editor/data',
    leaders: '/api/tools/leaders-editor/data',
    succession: '/api/tools/succession-editor/data',
  };
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
 * @param {string}            [args.moduleSlug] - module slug for module-scoped API (#529)
 */
export function useOobPersistence({ oob, leaders, succession, dirty, moduleSlug }) {
  let activeUrls = buildUrls(moduleSlug);
  const isSyncing = ref(false);
  const syncError = ref(null);
  const isOffline = ref(false);
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
        if (isValidSidedObjectShape(parsedOob) && isValidSidedObjectShape(parsedLeaders)) {
          oob.value = parsedOob;
          leaders.value = parsedLeaders;
          if (rawSuccession) {
            const parsedSuccession = JSON.parse(rawSuccession);
            if (isValidSuccessionShape(parsedSuccession)) {
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

  // Shared helper: parse, validate shapes, assign refs, clear dirty + isOffline.
  // Sets syncError on shape mismatch. Returns true on success, false otherwise.
  async function _applyServerResponses(oobRes, leadersRes, successionRes) {
    const parsedOob = await oobRes.json();
    const parsedLeaders = await leadersRes.json();
    if (!isValidSidedObjectShape(parsedOob) || !isValidSidedObjectShape(parsedLeaders)) {
      syncError.value = 'Server returned data with an unrecognised shape';
      return false;
    }
    oob.value = parsedOob;
    leaders.value = parsedLeaders;
    if (successionRes.ok) {
      const parsedSuccession = await successionRes.json();
      if (isValidSuccessionShape(parsedSuccession)) succession.value = parsedSuccession;
    }
    dirty.value = false;
    isOffline.value = false;
    return true;
  }

  async function _loadFromServer(urls) {
    const [oobRes, leadersRes, successionRes] = await Promise.all([
      fetch(urls.oob),
      fetch(urls.leaders),
      fetch(urls.succession),
    ]);
    if (oobRes.ok && leadersRes.ok) {
      await _applyServerResponses(oobRes, leadersRes, successionRes);
      return true;
    }
    return false;
  }

  async function loadData() {
    // L1: try server
    try {
      if (await _loadFromServer(activeUrls)) return;
    } catch {
      /* fall through */
    }

    // L2: try localStorage
    if (_loadFromStorage()) {
      dirty.value = false;
      isOffline.value = true;
      return;
    }

    // L3: bundled JSON fallback (dynamic import — chunk only loaded if server + storage both fail)
    const [
      { default: oobFallback },
      { default: leadersFallback },
      { default: successionFallback },
    ] = await Promise.all([
      import('../../../data/modules/south-mountain/oob.json'),
      import('../../../data/modules/south-mountain/leaders.json'),
      import('../../../data/modules/south-mountain/succession.json'),
    ]);
    oob.value = oobFallback;
    leaders.value = leadersFallback;
    succession.value = successionFallback;
    dirty.value = false;
  }

  // #529 — module-scoped load: fetch from /api/v1/modules/:slug/* directly
  async function loadDataForModule(slug) {
    const urls = buildUrls(slug);
    activeUrls = urls;
    try {
      if (await _loadFromServer(urls)) return;
    } catch {
      /* fall through to localStorage */
    }
    if (_loadFromStorage()) {
      dirty.value = false;
      isOffline.value = true;
    }
  }

  // ── Sync ──────────────────────────────────────────────────────────────────

  async function _executePush() {
    if (!oob.value || !leaders.value) return;
    if (isOffline.value) return;
    isSyncing.value = true;
    syncError.value = null;
    try {
      const fetches = [
        fetch(activeUrls.oob, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oob.value),
        }),
        fetch(activeUrls.leaders, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaders.value),
        }),
      ];
      if (succession.value) {
        fetches.push(
          fetch(activeUrls.succession, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(succession.value),
          })
        );
      }
      const results = await Promise.all(fetches);
      const failedRes = results.find((r) => !r.ok);
      if (!failedRes) {
        dirty.value = false;
        try {
          localStorage.removeItem(OOB_STORAGE_KEY);
          localStorage.removeItem(LEADERS_STORAGE_KEY);
          localStorage.removeItem(SUCCESSION_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } else {
        syncError.value = `Push failed (${failedRes.status})`;
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
        fetch(activeUrls.oob),
        fetch(activeUrls.leaders),
        fetch(activeUrls.succession),
      ]);
      if (oobRes.ok && leadersRes.ok) {
        const assigned = await _applyServerResponses(oobRes, leadersRes, successionRes);
        if (assigned) {
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
    isOffline,
    showPushConfirm,
    showPullConfirm,
    loadData,
    loadDataForModule,
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
