import { ref } from 'vue';
import { defineStore } from 'pinia';

import oobFallback from '../../../data/scenarios/south-mountain/oob.json';
import leadersFallback from '../../../data/scenarios/south-mountain/leaders.json';

const OOB_STORAGE_KEY = 'lob-oob-editor-v1';
const LEADERS_STORAGE_KEY = 'lob-leaders-editor-v1';
const OOB_API_URL = '/api/oob/data';
const LEADERS_API_URL = '/api/leaders/data';
const DEBOUNCE_MS = 500;

export const useOobStore = defineStore('oob', () => {
  const oob = ref(null);
  const leaders = ref(null);
  const selectedNode = ref(null);
  const dirty = ref(false);

  let _debounceTimer = null;

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

  function selectNode(node) {
    selectedNode.value = node;
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  /**
   * Update a field by dot-path on either oob or leaders.
   * path example: 'union.corps.0.name'
   */
  function updateField(path, value) {
    const parts = path.split('.');
    const root = parts[0];
    const data = root === 'leaders' ? leaders : oob;
    if (!data.value) return;

    let obj = data.value;
    // Navigate to parent, stopping before the last key
    for (let i = 1; i < parts.length - 1; i++) {
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
      }
    } catch {
      /* caller handles UI feedback */
    }
  }

  async function pullFromServer() {
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
      }
    } catch {
      /* fall through */
    }
  }

  return {
    oob,
    leaders,
    selectedNode,
    dirty,
    loadData,
    selectNode,
    updateField,
    updateCounterRef,
    updateSuccession,
    pushToServer,
    pullFromServer,
  };
});
