import { ref, computed, toRaw } from 'vue';
import { defineStore } from 'pinia';

import { useOobPersistence } from '../composables/useOobPersistence.js';
import { findNodePathInTree } from '../utils/findNodePath.js';

// Keys that must never appear in a dot-path passed to updateField (M4 / prototype pollution guard).
const FORBIDDEN_PATH_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
]);

// Prefix prepended to leader paths so updateField can route them to leaders.value.
// selectNode (producer) and updateField (consumer) both use this constant — do not change
// one without the other.
const LEADERS_ROOT = 'leaders';

export const useOobStore = defineStore('oob', () => {
  const oob = ref(null);
  const leaders = ref(null);
  const succession = ref(null);
  const selectedNode = ref(null);
  const selectedNodeType = ref(null);
  const selectedNodePath = ref(null);
  const dirty = ref(false);

  const persistence = useOobPersistence({ oob, leaders, succession, dirty });

  // ── Path routing ──────────────────────────────────────────────────────────
  // resolveRoot maps the first path segment to the correct store ref and
  // computes navStart (the index at which navigation into the data begins).
  // Both selectNode and updateField depend on this convention; keeping it here
  // ensures a single source of truth for the leaders-prefix routing rule.

  function resolveRoot(parts) {
    const isLeaders = parts[0] === LEADERS_ROOT;
    return { data: isLeaders ? leaders : oob, navStart: isLeaders ? 1 : 0 };
  }

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
    if (succession.value) _collectUsed(toRaw(succession.value), out);
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
      // Search oob first; leaders share the same side-keyed tree shape so
      // findNodePathInTree works for both. Prefix leaders paths with LEADERS_ROOT
      // so updateField routes writes to the correct store ref.
      const oobPath = findNodePathInTree(oob.value, node.id);
      if (oobPath) {
        selectedNodePath.value = oobPath;
      } else {
        const leadersPath = findNodePathInTree(leaders.value, node.id);
        selectedNodePath.value = leadersPath ? `${LEADERS_ROOT}.${leadersPath}` : null;
      }
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  /**
   * Update a field by dot-path on either oob or leaders.
   * The first segment selects the root ('leaders' → leaders ref, anything else → oob ref).
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

    const { data, navStart } = resolveRoot(parts);
    if (!data.value) return;

    let obj = data.value;
    // Navigate to parent, stopping before the last key.
    // navStart skips the LEADERS_ROOT prefix segment for leaders paths.
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
    succession,
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
