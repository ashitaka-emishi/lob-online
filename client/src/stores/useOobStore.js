import { ref, computed, toRaw } from 'vue';
import { defineStore } from 'pinia';

import { useOobPersistence } from '../composables/useOobPersistence.js';
import { findNodePath } from '../utils/findNodePath.js';

// Keys that must never appear in a dot-path passed to updateField (M4 / prototype pollution guard).
const FORBIDDEN_PATH_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
]);

export const useOobStore = defineStore('oob', () => {
  const oob = ref(null);
  const leaders = ref(null);
  const selectedNode = ref(null);
  const selectedNodeType = ref(null);
  const selectedNodePath = ref(null);
  const dirty = ref(false);

  const persistence = useOobPersistence({ oob, leaders, dirty });

  // ── Used counter files ────────────────────────────────────────────────────

  // Version counter incremented only by updateCounterRef — prevents usedCounterFiles
  // from recomputing on every non-counterRef field edit (L2 perf fix).
  const _counterRefVersion = ref(0);

  function _collectUsed(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach((item) => _collectUsed(item, out));
      return;
    }
    if (obj.counterRef) {
      for (const key of ['front', 'back', 'promotedFront', 'promotedBack']) {
        if (obj.counterRef[key]) out.add(obj.counterRef[key]);
      }
    }
    // Skip counterRef during recursive walk to avoid double-visiting it (M2 perf fix).
    Object.entries(obj).forEach(([k, v]) => {
      if (k !== 'counterRef') _collectUsed(v, out);
    });
  }

  // Depends only on _counterRefVersion (incremented by updateCounterRef) and the oob/leaders
  // refs themselves (replaced on load/pull). toRaw() prevents deep reactive tracking so that
  // non-counterRef mutations don't trigger a full tree walk (L2 perf fix).
  const usedCounterFiles = computed(() => {
    _counterRefVersion.value; // sole version dependency
    const out = new Set();
    if (oob.value) _collectUsed(toRaw(oob.value), out);
    if (leaders.value) _collectUsed(toRaw(leaders.value), out);
    return out;
  });

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
    persistence.scheduleSave();
  }

  function updateCounterRef(nodePath, counterRef) {
    updateField(nodePath + '.counterRef', counterRef);
    _counterRefVersion.value++; // signal usedCounterFiles to recompute (L2)
  }

  function updateSuccession(unitPath, newIds) {
    updateField(unitPath + '.successionIds', newIds);
  }

  return {
    oob,
    leaders,
    selectedNode,
    selectedNodeType,
    selectedNodePath,
    usedCounterFiles,
    dirty,
    isSyncing: persistence.isSyncing,
    syncError: persistence.syncError,
    showPushConfirm: persistence.showPushConfirm,
    showPullConfirm: persistence.showPullConfirm,
    loadData: persistence.loadData,
    selectNode,
    updateField,
    updateCounterRef,
    updateSuccession,
    requestPush: persistence.requestPush,
    confirmPush: persistence.confirmPush,
    cancelPush: persistence.cancelPush,
    requestPull: persistence.requestPull,
    confirmPull: persistence.confirmPull,
    cancelPull: persistence.cancelPull,
    pullFromServer: persistence.pullFromServer,
  };
});
