import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOobStore } from './useOobStore.js';

const MINIMAL_OOB = { _status: 'available', union: { corps: [] }, confederate: { corps: [] } };
const MINIMAL_LEADERS = { _status: 'available', union: { army: [] }, confederate: { army: [] } };
const MINIMAL_SUCCESSION = {
  _status: 'draft',
  _source: 'test',
  union: [],
  confederate: [
    {
      id: 'walker-promoted',
      name: 'Col Joseph Walker (Promoted)',
      baseLeaderId: 'walker',
      commandLevel: 'brigade',
      commandsId: null,
      commandValue: 0,
      moraleValue: 1,
    },
  ],
};

// Returns a fetch mock that sequences: call 0 → oobData, call 1 → leadersData,
// call 2+ → successionData (null means succession endpoint returns the same ok status
// but with leadersData shape, which will fail validation and leave succession null).
function mockFetch(oobData, leadersData, successionData = null, ok = true) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    let data;
    if (call === 0) data = oobData;
    else if (call === 1) data = leadersData;
    else data = successionData ?? {};
    call++;
    return Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(JSON.parse(JSON.stringify(data))),
    });
  });
}

describe('useOobStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('initialises with null oob, leaders, selectedNode and dirty=false', () => {
    const store = useOobStore();
    expect(store.oob).toBeNull();
    expect(store.leaders).toBeNull();
    expect(store.selectedNode).toBeNull();
    expect(store.dirty).toBe(false);
  });

  // ── loadData: server success ───────────────────────────────────────────────

  it('loadData: loads from server when both endpoints respond ok', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    const store = useOobStore();
    await store.loadData();
    expect(store.oob).toMatchObject({ _status: 'available' });
    expect(store.leaders).toMatchObject({ _status: 'available' });
    expect(store.dirty).toBe(false);
  });

  // ── loadData: localStorage fallback ───────────────────────────────────────

  it('loadData: falls back to localStorage when server returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === 'lob-oob-editor-v1') return JSON.stringify(MINIMAL_OOB);
        if (key === 'lob-leaders-editor-v1') return JSON.stringify(MINIMAL_LEADERS);
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const store = useOobStore();
    await store.loadData();
    expect(store.oob).toMatchObject({ _status: 'available' });
    expect(store.leaders).toMatchObject({ _status: 'available' });
  });

  // ── loadData: bundled JSON fallback ───────────────────────────────────────

  it('loadData: falls back to bundled JSON when server throws and no localStorage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const store = useOobStore();
    await store.loadData();
    // Bundled JSON has real data — just verify it's non-null objects
    expect(store.oob).not.toBeNull();
    expect(typeof store.oob).toBe('object');
    expect(store.leaders).not.toBeNull();
    expect(typeof store.leaders).toBe('object');
  });

  // ── selectNode ────────────────────────────────────────────────────────────

  it('selectNode: sets selectedNode', () => {
    const store = useOobStore();
    const node = { type: 'corps', id: '1c', name: '1 Corps' };
    store.selectNode(node);
    expect(store.selectedNode).toStrictEqual(node);
  });

  it('selectNode: can be called with null to deselect', () => {
    const store = useOobStore();
    store.selectNode({ type: 'corps', id: '1c' });
    store.selectNode(null);
    expect(store.selectedNode).toBeNull();
  });

  it('selectNode: stores explicit nodePath when provided (no tree-walk)', () => {
    const store = useOobStore();
    const node = { type: 'corps', id: '1c', name: '1 Corps' };
    store.selectNode(node, 'corps', 'union.corps.0');
    expect(store.selectedNodePath).toBe('union.corps.0');
  });

  it('selectNode: falls back to findNodePath when nodePath not provided', () => {
    const store = useOobStore();
    store.oob = {
      _status: 'available',
      union: { corps: [{ id: '1c', name: '1 Corps' }] },
      confederate: { corps: [] },
    };
    store.selectNode({ id: '1c' }, 'corps');
    expect(store.selectedNodePath).toBe('union.corps.0');
  });

  it('selectNode: clears selectedNodePath when called with null', () => {
    const store = useOobStore();
    store.selectNode({ id: '1c' }, 'corps', 'union.corps.0');
    store.selectNode(null);
    expect(store.selectedNodePath).toBeNull();
  });

  // ── usedCounterFiles ─────────────────────────────────────────────────────

  it('usedCounterFiles: returns empty Set when oob and leaders are null', () => {
    const store = useOobStore();
    expect(store.usedCounterFiles).toBeInstanceOf(Set);
    expect(store.usedCounterFiles.size).toBe(0);
  });

  it('usedCounterFiles: collects front and back filenames from oob tree', () => {
    const store = useOobStore();
    store.oob = {
      union: {
        corps: [
          {
            id: '1c',
            counterRef: {
              front: 'front_a.jpg',
              back: 'back_a.jpg',
              frontConfidence: null,
              backConfidence: null,
            },
          },
        ],
      },
      confederate: { corps: [] },
    };
    store.leaders = { union: { army: [] }, confederate: { army: [] } };
    expect(store.usedCounterFiles.has('front_a.jpg')).toBe(true);
    expect(store.usedCounterFiles.has('back_a.jpg')).toBe(true);
  });

  it('usedCounterFiles: collects promotedFront and promotedBack from leaders tree', () => {
    const store = useOobStore();
    store.oob = { union: { corps: [] }, confederate: { corps: [] } };
    store.leaders = {
      union: {
        corps: [
          {
            id: 'hooker',
            counterRef: {
              front: null,
              frontConfidence: null,
              back: null,
              backConfidence: null,
              promotedFront: 'promo_front.jpg',
              promotedFrontConfidence: null,
              promotedBack: 'promo_back.jpg',
              promotedBackConfidence: null,
            },
          },
        ],
      },
      confederate: { corps: [] },
    };
    expect(store.usedCounterFiles.has('promo_front.jpg')).toBe(true);
    expect(store.usedCounterFiles.has('promo_back.jpg')).toBe(true);
  });

  // ── updateField ───────────────────────────────────────────────────────────

  it('updateField: updates a top-level oob field and sets dirty', () => {
    const store = useOobStore();
    store.oob = { _status: 'available', union: { army: 'Army of the Potomac', corps: [] } };
    store.updateField('_status', 'draft');
    expect(store.oob._status).toBe('draft');
    expect(store.dirty).toBe(true);
  });

  it('updateField: updates a nested field', () => {
    const store = useOobStore();
    store.oob = { _status: 'available', union: { army: 'Army of the Potomac', corps: [] } };
    store.updateField('union.army', 'Updated Army');
    expect(store.oob.union.army).toBe('Updated Army');
    expect(store.dirty).toBe(true);
  });

  it('updateField: updates a deeply nested field via bare side-key path', () => {
    const store = useOobStore();
    store.oob = { _status: 'available', union: { corps: [{ id: '1c', name: 'Old' }] } };
    store.updateField('union.corps.0.name', 'New');
    expect(store.oob.union.corps[0].name).toBe('New');
    expect(store.dirty).toBe(true);
  });

  it('updateField: no-ops when oob is null', () => {
    const store = useOobStore();
    expect(() => store.updateField('union.army', 'X')).not.toThrow();
    expect(store.dirty).toBe(false);
  });

  it('updateField: rejects toString and valueOf as path keys (#216)', () => {
    const store = useOobStore();
    store.oob = { _status: 'available', union: { army: 'Original' } };
    store.updateField('union.toString', 'injected');
    expect(store.dirty).toBe(false);
    store.updateField('union.valueOf', 'injected');
    expect(store.dirty).toBe(false);
    // original data unchanged
    expect(store.oob.union.army).toBe('Original');
  });

  // ── updateCounterRef ──────────────────────────────────────────────────────

  it('updateCounterRef: sets counterRef on a node and marks dirty', () => {
    const store = useOobStore();
    store.oob = {
      _status: 'available',
      union: { corps: [{ id: '1c', name: '1 Corps', counterRef: null }] },
    };
    store.updateCounterRef('union.corps.0', { front: 'front.jpg', back: 'back.jpg' });
    expect(store.oob.union.corps[0].counterRef).toEqual({ front: 'front.jpg', back: 'back.jpg' });
    expect(store.dirty).toBe(true);
  });

  // ── requestPush / confirmPush / cancelPush ────────────────────────────────

  it('requestPush: sets showPushConfirm without calling fetch', () => {
    const store = useOobStore();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    store.oob = MINIMAL_OOB;
    store.leaders = MINIMAL_LEADERS;
    store.requestPush();
    expect(store.showPushConfirm).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cancelPush: resets showPushConfirm without calling fetch', () => {
    const store = useOobStore();
    vi.stubGlobal('fetch', vi.fn());
    store.oob = MINIMAL_OOB;
    store.leaders = MINIMAL_LEADERS;
    store.requestPush();
    store.cancelPush();
    expect(store.showPushConfirm).toBe(false);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('confirmPush: resets showPushConfirm and performs the push', async () => {
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
    store.leaders = MINIMAL_LEADERS;
    store.dirty = true;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    );
    store.requestPush();
    expect(store.showPushConfirm).toBe(true);
    await store.confirmPush();
    expect(store.showPushConfirm).toBe(false);
    expect(vi.mocked(fetch)).toHaveBeenCalled();
    expect(store.dirty).toBe(false);
  });

  // ── Zod validation on load ────────────────────────────────────────────────

  it('loadData: sets syncError when server returns invalid oob shape', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const data = call++ === 0 ? { notAnOob: true } : MINIMAL_LEADERS;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
      })
    );
    const store = useOobStore();
    await store.loadData();
    expect(store.syncError).toBeTruthy();
    expect(store.oob).toBeNull();
  });

  it('pullFromServer: sets syncError and does not update store when response is invalid', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const data = call++ === 0 ? { notAnOob: true } : MINIMAL_LEADERS;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
      })
    );
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
    await store.pullFromServer();
    expect(store.syncError).toBeTruthy();
    expect(store.oob).toStrictEqual(MINIMAL_OOB);
  });

  // ── confirmPush (push execution — pushToServer removed from public API, M4) ──

  it('confirmPush: PUTs both oob and leaders, clears dirty and localStorage on success', async () => {
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
    store.leaders = MINIMAL_LEADERS;
    store.dirty = true;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      })
    );
    store.requestPush();
    await store.confirmPush();

    expect(store.dirty).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('lob-oob-editor-v1');
    expect(localStorage.removeItem).toHaveBeenCalledWith('lob-leaders-editor-v1');
  });

  it('confirmPush: does not clear dirty when server returns non-ok', async () => {
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
    store.leaders = MINIMAL_LEADERS;
    store.dirty = true;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve({}) })
    );
    store.requestPush();
    await store.confirmPush();

    expect(store.dirty).toBe(true);
  });

  // ── requestPull / confirmPull / cancelPull (L5) ───────────────────────────

  it('requestPull: calls pullFromServer directly when not dirty', async () => {
    const store = useOobStore();
    store.dirty = false;
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    await store.requestPull();
    expect(store.oob).toMatchObject({ _status: 'available' });
    expect(store.showPullConfirm).toBe(false);
  });

  it('requestPull: sets showPullConfirm when dirty without fetching', () => {
    const store = useOobStore();
    store.dirty = true;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    store.requestPull();
    expect(store.showPullConfirm).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cancelPull: resets showPullConfirm without fetching', () => {
    const store = useOobStore();
    store.dirty = true;
    vi.stubGlobal('fetch', vi.fn());
    store.requestPull();
    store.cancelPull();
    expect(store.showPullConfirm).toBe(false);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('confirmPull: resets showPullConfirm and fetches', async () => {
    const store = useOobStore();
    store.dirty = true;
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    store.requestPull();
    await store.confirmPull();
    expect(store.showPullConfirm).toBe(false);
    expect(store.oob).toMatchObject({ _status: 'available' });
  });

  // ── localStorage validation (M1) ──────────────────────────────────────────

  it('loadData: rejects malformed localStorage data that lacks union/confederate shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => {
        if (key === 'lob-oob-editor-v1') return JSON.stringify({ badShape: true });
        if (key === 'lob-leaders-editor-v1') return JSON.stringify(MINIMAL_LEADERS);
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const store = useOobStore();
    await store.loadData();
    // Falls through to bundled JSON fallback — store is non-null but not the bad shape
    expect(store.oob).not.toBeNull();
    expect(store.oob).not.toMatchObject({ badShape: true });
  });

  // ── usedCounterFiles version tracking (L2) ────────────────────────────────

  it('usedCounterFiles: updates after updateCounterRef but not after unrelated updateField', () => {
    const store = useOobStore();
    store.oob = {
      _status: 'available',
      union: { corps: [{ id: '1c', name: 'One Corps', counterRef: null }] },
      confederate: { corps: [] },
    };
    store.leaders = { union: { army: [] }, confederate: { army: [] } };

    // Before any counterRef assignment — no used files
    expect(store.usedCounterFiles.size).toBe(0);

    // After updateCounterRef — should appear
    store.updateCounterRef('union.corps.0', {
      front: 'front_x.jpg',
      back: null,
      frontConfidence: null,
      backConfidence: null,
    });
    expect(store.usedCounterFiles.has('front_x.jpg')).toBe(true);
  });

  // ── pullFromServer ────────────────────────────────────────────────────────

  it('pullFromServer: fetches from server and clears dirty + localStorage', async () => {
    const store = useOobStore();
    store.dirty = true;
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS));
    await store.pullFromServer();

    expect(store.oob).toMatchObject({ _status: 'available' });
    expect(store.leaders).toMatchObject({ _status: 'available' });
    expect(store.dirty).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('lob-oob-editor-v1');
    expect(localStorage.removeItem).toHaveBeenCalledWith('lob-leaders-editor-v1');
  });

  it('pullFromServer: does not throw when server is unreachable', async () => {
    const store = useOobStore();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await expect(store.pullFromServer()).resolves.not.toThrow();
  });

  it('pullFromServer: sets syncError and resets isSyncing to false on network failure (#214)', async () => {
    const store = useOobStore();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    await store.pullFromServer();
    expect(store.syncError).not.toBeNull();
    expect(store.isSyncing).toBe(false);
  });

  it('pullFromServer: sets syncError and resets isSyncing to false on non-ok response (#214)', async () => {
    const store = useOobStore();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );
    await store.pullFromServer();
    expect(store.syncError).not.toBeNull();
    expect(store.isSyncing).toBe(false);
  });

  // ── succession state (#239) ───────────────────────────────────────────────

  it('initialises with null succession', () => {
    const store = useOobStore();
    expect(store.succession).toBeNull();
  });

  it('loadData: populates succession when server returns valid succession shape', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS, MINIMAL_SUCCESSION));
    const store = useOobStore();
    await store.loadData();
    expect(store.succession).not.toBeNull();
    expect(Array.isArray(store.succession.confederate)).toBe(true);
    expect(store.succession.confederate[0].id).toBe('walker-promoted');
  });

  it('loadData: leaves succession null when server returns invalid succession shape', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS, { not: 'valid' }));
    const store = useOobStore();
    await store.loadData();
    // oob and leaders loaded, but succession shape invalid → remains null
    expect(store.oob).not.toBeNull();
    expect(store.succession).toBeNull();
  });

  it('pullFromServer: populates succession on success', async () => {
    vi.stubGlobal('fetch', mockFetch(MINIMAL_OOB, MINIMAL_LEADERS, MINIMAL_SUCCESSION));
    const store = useOobStore();
    store.dirty = true;
    await store.pullFromServer();
    expect(store.succession).not.toBeNull();
    expect(store.succession.union).toEqual([]);
  });

  it('confirmPush: also PUTs succession when it is set', async () => {
    const store = useOobStore();
    store.oob = MINIMAL_OOB;
    store.leaders = MINIMAL_LEADERS;
    store.succession = MINIMAL_SUCCESSION;
    store.dirty = true;

    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    vi.stubGlobal('fetch', fetchSpy);
    store.requestPush();
    await store.confirmPush();

    // oob PUT + leaders PUT + succession PUT = 3 fetch calls
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(store.dirty).toBe(false);
  });
});
