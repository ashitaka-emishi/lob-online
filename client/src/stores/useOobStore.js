import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

import { findNodePath } from '../utils/findNodePath.js';

import oobFallback from '../../../data/scenarios/south-mountain/oob.json';
import leadersFallback from '../../../data/scenarios/south-mountain/leaders.json';

const OOB_STORAGE_KEY = 'lob-oob-editor-v1';
const LEADERS_STORAGE_KEY = 'lob-leaders-editor-v1';
const OOB_API_URL = '/api/oob/data';
const LEADERS_API_URL = '/api/leaders/data';
const DEBOUNCE_MS = 500;

// Keys that must never appear in a dot-path passed to updateField (M4 / prototype pollution guard).
const FORBIDDEN_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const useOobStore = defineStore('oob', () => {
  const oob = ref(null);
  const leaders = ref(null);
  const selectedNode = ref(null);
  const selectedNodeType = ref(null);
  const selectedNodePath = ref(null);
  const dirty = ref(false);
  // M5: expose sync state so the view can show feedback
  const isSyncing = ref(false);
  const syncError = ref(null);

  let _debounceTimer = null;

  // ── Used counter files ────────────────────────────────────────────────────

  function _collectUsed(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach((item) => _collectUsed(item, out));
      return;
    }
    if (obj.counterRef) {
      if (obj.counterRef.front) out.add(obj.counterRef.front);
      if (obj.counterRef.back) out.add(obj.counterRef.back);
    }
    Object.values(obj).forEach((v) => _collectUsed(v, out));
  }

  const usedCounterFiles = computed(() => {
    const out = new Set();
    if (oob.value) _collectUsed(oob.value, out);
    if (leaders.value) _collectUsed(leaders.value, out);
    return out;
  });

  // ── Draft persistence ──────────────────────────────────────────────────────

  function _saveToStorage() {
    try {
      if (oob.value) localStorage.setItem(OOB_STORAGE_KEY, JSON.stringify(oob.value));
      if (leaders.value) localStorage.setItem(LEADERS_STORAGE_KEY, JSON.stringify(leaders.value));
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
      if (rawOob && rawLeaders) {
        const parsedOob = JSON.parse(rawOob);
        const parsedLeaders = JSON.parse(rawLeaders);
        if (
          parsedOob &&
          typeof parsedOob === 'object' &&
          parsedLeaders &&
          typeof parsedLeaders === 'object'
        ) {
          oob.value = parsedOob;
          leaders.value = parsedLeaders;
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
      const [oobRes, leadersRes] = await Promise.all([fetch(OOB_API_URL), fetch(LEADERS_API_URL)]);
      if (oobRes.ok && leadersRes.ok) {
        oob.value = await oobRes.json();
        leaders.value = await leadersRes.json();
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

    // L3: bundled JSON fallback
    oob.value = oobFallback;
    leaders.value = leadersFallback;
    dirty.value = false;
  }

  // ── Selection ────────────────────────────────────────────────────────────

  function selectNode(node, nodeType = null, nodePath = null) {
    selectedNode.value = node;
    selectedNodeType.value = nodeType;
    if (!node) {
      selectedNodePath.value = null;
    } else if (nodePath !== null) {
      selectedNodePath.value = nodePath;
    } else {
      selectedNodePath.value = findNodePath(oob.value, node.id);
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  /**
   * Update a field by dot-path on either oob or leaders.
   * The first segment selects the root ('leaders' or anything else → oob).
   * Example path: 'union.corps.0.name'
   *
   * Note: assignment to a *new* nested key that did not exist at initialisation
   * may not trigger Vue's reactivity in all cases (Vue 3 plain-object limitation).
   * Prefer named mutation methods (updateCounterRef, updateSuccession) for new
   * fields; this method is safe for updating existing scalar properties.
   */
  function updateField(path, value) {
    const parts = path.split('.');
    // M4: guard against prototype pollution via crafted path segments
    if (parts.some((p) => FORBIDDEN_PATH_KEYS.has(p))) return;

    const root = parts[0];
    const data = root === 'leaders' ? leaders : oob;
    if (!data.value) return;

    let obj = data.value;
    // Paths use bare side-key format (e.g. 'union.corps.0.name').
    // For leaders paths, parts[0] is 'leaders' which selects the store above — skip it.
    const navStart = root === 'leaders' ? 1 : 0;
    // Navigate to parent, stopping before the last key
    for (let i = navStart; i < parts.length - 1; i++) {
      if (obj === null || typeof obj !== 'object') return;
      obj = obj[parts[i]];
    }
    if (obj === null || typeof obj !== 'object') return;
    obj[parts[parts.length - 1]] = value;
    dirty.value = true;
    _scheduleSave();
  }

  function updateCounterRef(nodePath, counterRef) {
    updateField(nodePath + '.counterRef', counterRef);
  }

  function updateSuccession(unitPath, newIds) {
    updateField(unitPath + '.successionIds', newIds);
  }

  // ── Sync ──────────────────────────────────────────────────────────────────

  async function pushToServer() {
    if (!oob.value || !leaders.value) return;
    isSyncing.value = true;
    syncError.value = null;
    try {
      const [oobRes, leadersRes] = await Promise.all([
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
      ]);
      if (oobRes.ok && leadersRes.ok) {
        dirty.value = false;
        try {
          localStorage.removeItem(OOB_STORAGE_KEY);
          localStorage.removeItem(LEADERS_STORAGE_KEY);
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

  async function pullFromServer() {
    isSyncing.value = true;
    syncError.value = null;
    try {
      const [oobRes, leadersRes] = await Promise.all([fetch(OOB_API_URL), fetch(LEADERS_API_URL)]);
      if (oobRes.ok && leadersRes.ok) {
        oob.value = await oobRes.json();
        leaders.value = await leadersRes.json();
        dirty.value = false;
        try {
          localStorage.removeItem(OOB_STORAGE_KEY);
          localStorage.removeItem(LEADERS_STORAGE_KEY);
        } catch {
          /* ignore */
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

  return {
    oob,
    leaders,
    selectedNode,
    selectedNodeType,
    selectedNodePath,
    usedCounterFiles,
    dirty,
    isSyncing,
    syncError,
    loadData,
    selectNode,
    updateField,
    updateCounterRef,
    updateSuccession,
    pushToServer,
    pullFromServer,
  };
});
