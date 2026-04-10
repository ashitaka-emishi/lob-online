import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';

import { useOobPersistence } from './useOobPersistence.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_OOB = { union: { corps: [] }, confederate: { divisions: [] } };
const VALID_LEADERS = { union: { brigade: [] }, confederate: { brigade: [] } };
const VALID_SUCCESSION = { union: [], confederate: [] };

const OOB_URL = '/api/tools/oob-editor/data';
const LEADERS_URL = '/api/tools/leaders-editor/data';
const SUCCESSION_URL = '/api/tools/succession-editor/data';

const OOB_KEY = 'lob-oob-editor-v1';
const LEADERS_KEY = 'lob-leaders-editor-v1';
const SUCCESSION_KEY = 'lob-succession-editor-v1';

// Build a fetch mock that dispatches responses by URL.
function makeFetch(responses) {
  return vi.fn().mockImplementation((url) => {
    const entry = responses[url] ?? { ok: false, status: 404, data: {} };
    return Promise.resolve({
      ok: entry.ok ?? true,
      status: entry.status ?? 200,
      json: () => Promise.resolve(entry.data),
    });
  });
}

function makeRefs() {
  return {
    oob: ref(null),
    leaders: ref(null),
    succession: ref(null),
    dirty: ref(false),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── loadData — L1: server fetch ───────────────────────────────────────────────

describe('loadData — L1: server returns all three endpoints', () => {
  it('populates oob, leaders, and succession refs; clears dirty', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        [OOB_URL]: { ok: true, data: VALID_OOB },
        [LEADERS_URL]: { ok: true, data: VALID_LEADERS },
        [SUCCESSION_URL]: { ok: true, data: VALID_SUCCESSION },
      })
    );
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    refs.dirty.value = true;
    await loadData();
    expect(refs.oob.value).toEqual(VALID_OOB);
    expect(refs.leaders.value).toEqual(VALID_LEADERS);
    expect(refs.succession.value).toEqual(VALID_SUCCESSION);
    expect(refs.dirty.value).toBe(false);
  });

  it('loads oob+leaders but leaves succession null when succession endpoint non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        [OOB_URL]: { ok: true, data: VALID_OOB },
        [LEADERS_URL]: { ok: true, data: VALID_LEADERS },
        [SUCCESSION_URL]: { ok: false, status: 500, data: {} },
      })
    );
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    await loadData();
    expect(refs.oob.value).toEqual(VALID_OOB);
    expect(refs.leaders.value).toEqual(VALID_LEADERS);
    expect(refs.succession.value).toBeNull();
  });

  it('ignores succession payload with wrong shape (not arrays)', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        [OOB_URL]: { ok: true, data: VALID_OOB },
        [LEADERS_URL]: { ok: true, data: VALID_LEADERS },
        [SUCCESSION_URL]: { ok: true, data: { union: {}, confederate: {} } },
      })
    );
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    await loadData();
    expect(refs.succession.value).toBeNull();
  });
});

// ── loadData — L2: localStorage ───────────────────────────────────────────────

describe('loadData — L2: localStorage fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  it('loads oob+leaders from storage when server fetch throws', async () => {
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    await loadData();
    expect(refs.oob.value).toEqual(VALID_OOB);
    expect(refs.leaders.value).toEqual(VALID_LEADERS);
  });

  it('loads succession from storage when key is present alongside oob+leaders', async () => {
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    localStorage.setItem(SUCCESSION_KEY, JSON.stringify(VALID_SUCCESSION));
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    await loadData();
    expect(refs.succession.value).toEqual(VALID_SUCCESSION);
  });

  it('leaves succession null when succession key absent in storage', async () => {
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    await loadData();
    expect(refs.succession.value).toBeNull();
  });

  it('falls through to L3 when localStorage succession shape is invalid (arrays expected)', async () => {
    // Store invalid succession shape — union/confederate are objects, not arrays.
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    localStorage.setItem(SUCCESSION_KEY, JSON.stringify({ union: {}, confederate: {} }));
    const refs = makeRefs();
    const { loadData } = useOobPersistence(refs);
    await loadData();
    // Succession shape invalid → ignored; oob+leaders still loaded from L2.
    expect(refs.succession.value).toBeNull();
    expect(refs.oob.value).toEqual(VALID_OOB);
  });
});

// ── _executePush (via confirmPush) ────────────────────────────────────────────

describe('confirmPush', () => {
  it('only calls two fetch endpoints when succession is null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);
    const refs = { ...makeRefs(), oob: ref(VALID_OOB), leaders: ref(VALID_LEADERS) };
    const { confirmPush } = useOobPersistence(refs);
    await confirmPush();
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain(OOB_URL);
    expect(urls).toContain(LEADERS_URL);
    expect(urls).not.toContain(SUCCESSION_URL);
  });

  it('calls succession endpoint when succession is non-null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);
    const refs = {
      ...makeRefs(),
      oob: ref(VALID_OOB),
      leaders: ref(VALID_LEADERS),
      succession: ref(VALID_SUCCESSION),
    };
    const { confirmPush } = useOobPersistence(refs);
    await confirmPush();
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain(SUCCESSION_URL);
  });

  it('removes succession localStorage key on successful push', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    );
    localStorage.setItem(SUCCESSION_KEY, JSON.stringify(VALID_SUCCESSION));
    const refs = {
      ...makeRefs(),
      oob: ref(VALID_OOB),
      leaders: ref(VALID_LEADERS),
      succession: ref(VALID_SUCCESSION),
    };
    const { confirmPush } = useOobPersistence(refs);
    await confirmPush();
    expect(localStorage.getItem(SUCCESSION_KEY)).toBeNull();
  });
});

// ── loadData — isOffline (#207) ───────────────────────────────────────────────

describe('loadData — isOffline flag (#207)', () => {
  it('isOffline is false after successful server load', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        [OOB_URL]: { ok: true, data: VALID_OOB },
        [LEADERS_URL]: { ok: true, data: VALID_LEADERS },
        [SUCCESSION_URL]: { ok: true, data: VALID_SUCCESSION },
      })
    );
    const refs = makeRefs();
    const { loadData, isOffline } = useOobPersistence(refs);
    await loadData();
    expect(isOffline.value).toBe(false);
  });

  it('isOffline is true after localStorage fallback load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    const refs = makeRefs();
    const { loadData, isOffline } = useOobPersistence(refs);
    await loadData();
    expect(isOffline.value).toBe(true);
    expect(refs.oob.value).toEqual(VALID_OOB);
  });

  it('pullFromServer clears isOffline on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    const refs = makeRefs();
    const { loadData, pullFromServer, isOffline } = useOobPersistence(refs);
    await loadData();
    expect(isOffline.value).toBe(true);

    vi.stubGlobal(
      'fetch',
      makeFetch({
        [OOB_URL]: { ok: true, data: VALID_OOB },
        [LEADERS_URL]: { ok: true, data: VALID_LEADERS },
        [SUCCESSION_URL]: { ok: true, data: VALID_SUCCESSION },
      })
    );
    await pullFromServer();
    expect(isOffline.value).toBe(false);
  });

  it('push is blocked when isOffline is true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    localStorage.setItem(OOB_KEY, JSON.stringify(VALID_OOB));
    localStorage.setItem(LEADERS_KEY, JSON.stringify(VALID_LEADERS));
    const refs = { ...makeRefs(), oob: ref(VALID_OOB), leaders: ref(VALID_LEADERS) };
    const { loadData, confirmPush, isOffline } = useOobPersistence(refs);
    await loadData();
    expect(isOffline.value).toBe(true);

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);
    await confirmPush();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ── pullFromServer ────────────────────────────────────────────────────────────

describe('pullFromServer', () => {
  it('sets syncError and resets isSyncing on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const refs = makeRefs();
    const { pullFromServer, isSyncing, syncError } = useOobPersistence(refs);
    await pullFromServer();
    expect(syncError.value).not.toBeNull();
    expect(isSyncing.value).toBe(false);
  });

  it('loads oob+leaders but skips succession when succession endpoint non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetch({
        [OOB_URL]: { ok: true, data: VALID_OOB },
        [LEADERS_URL]: { ok: true, data: VALID_LEADERS },
        [SUCCESSION_URL]: { ok: false, status: 503, data: {} },
      })
    );
    const refs = makeRefs();
    refs.succession.value = VALID_SUCCESSION; // pre-existing value should not change
    const { pullFromServer } = useOobPersistence(refs);
    await pullFromServer();
    // succession stays untouched; no crash
    expect(refs.oob.value).toEqual(VALID_OOB);
    expect(refs.succession.value).toEqual(VALID_SUCCESSION);
  });
});
