import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useMapPersistence } from './useMapPersistence.js';

const DRAFT_KEY = 'test-draft-v2';
const DRAFT_KEY_V1 = 'test-draft-v1';
const STORAGE_KEY = 'test-calibration';
const DEFAULT_CAL = { cols: 10, rows: 10, northOffset: 0 };

function makeArgs(overrides = {}) {
  return {
    calibration: ref({ ...DEFAULT_CAL }),
    defaultCalibration: DEFAULT_CAL,
    storageKey: STORAGE_KEY,
    draftKey: DRAFT_KEY,
    draftKeyV1: DRAFT_KEY_V1,
    ...overrides,
  };
}

function mockFetch(data, { ok = true, status = 200 } = {}) {
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(data),
    })
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useMapPersistence', () => {
  describe('initial state', () => {
    it('mapData is null', () => {
      const { mapData } = useMapPersistence(makeArgs());
      expect(mapData.value).toBeNull();
    });

    it('unsaved is false', () => {
      const { unsaved } = useMapPersistence(makeArgs());
      expect(unsaved.value).toBe(false);
    });

    it('isOffline is false', () => {
      const { isOffline } = useMapPersistence(makeArgs());
      expect(isOffline.value).toBe(false);
    });
  });

  describe('saveMapDraft', () => {
    it('writes draft to localStorage after debounce', async () => {
      const args = makeArgs();
      const { mapData, saveMapDraft } = useMapPersistence(args);
      mapData.value = { hexes: [], name: 'test' };
      saveMapDraft();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull(); // not written yet
      vi.runAllTimers();
      const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
      expect(stored.name).toBe('test');
      expect(stored._savedAt).toBeTypeOf('number');
    });

    it('debounces: only last call within window is written', () => {
      const args = makeArgs();
      const { mapData, saveMapDraft } = useMapPersistence(args);
      mapData.value = { hexes: [], name: 'first' };
      saveMapDraft();
      mapData.value = { hexes: [], name: 'second' };
      saveMapDraft();
      vi.runAllTimers();
      const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
      expect(stored.name).toBe('second');
    });

    it('is a no-op when mapData is null', () => {
      const { saveMapDraft } = useMapPersistence(makeArgs());
      saveMapDraft();
      vi.runAllTimers();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });

  describe('restoreDraft', () => {
    it('loads draft into mapData and hides banner', () => {
      const args = makeArgs();
      const { mapData, draftBannerVisible, restoreDraft } = useMapPersistence(args);
      draftBannerVisible.value = true;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ hexes: [], _savedAt: 1000 }));
      restoreDraft();
      expect(mapData.value).toEqual({ hexes: [] }); // _savedAt stripped
      expect(draftBannerVisible.value).toBe(false);
    });

    it('is a no-op when no draft exists', () => {
      const { mapData, restoreDraft } = useMapPersistence(makeArgs());
      restoreDraft();
      expect(mapData.value).toBeNull();
    });
  });

  describe('dismissDraft', () => {
    it('removes draft from localStorage and hides banner', () => {
      const args = makeArgs();
      const { draftBannerVisible, dismissDraft } = useMapPersistence(args);
      localStorage.setItem(DRAFT_KEY, 'something');
      draftBannerVisible.value = true;
      dismissDraft();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
      expect(draftBannerVisible.value).toBe(false);
    });
  });

  describe('fetchMapData', () => {
    it('loads server data into mapData', async () => {
      mockFetch({ hexes: [{ hex: '01.01', terrain: 'clear' }], _savedAt: 500 });
      const { mapData, fetchMapData } = useMapPersistence(makeArgs());
      await fetchMapData();
      expect(mapData.value.hexes).toHaveLength(1);
    });

    it('applies gridSpec to calibration when present', async () => {
      const args = makeArgs();
      mockFetch({ hexes: [], gridSpec: { cols: 64, rows: 35, northOffset: 3 }, _savedAt: 500 });
      const { fetchMapData } = useMapPersistence(args);
      await fetchMapData();
      expect(args.calibration.value.cols).toBe(64);
      expect(args.calibration.value.northOffset).toBe(3);
    });

    it('shows draft banner when local draft is newer than server', async () => {
      mockFetch({ hexes: [], _savedAt: 100 });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ hexes: [], _savedAt: 9999 }));
      const { draftBannerVisible, fetchMapData } = useMapPersistence(makeArgs());
      await fetchMapData();
      expect(draftBannerVisible.value).toBe(true);
    });

    it('removes stale draft when server data is newer', async () => {
      mockFetch({ hexes: [], _savedAt: 9999 });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ hexes: [], _savedAt: 100 }));
      const { fetchMapData } = useMapPersistence(makeArgs());
      await fetchMapData();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('uses local draft as offline fallback when fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ hexes: [], _savedAt: 500 }));
      const { mapData, isOffline, fetchMapData } = useMapPersistence(makeArgs());
      await fetchMapData();
      expect(mapData.value).toBeDefined();
      expect(isOffline.value).toBe(true);
    });

    it('sets fetchError when fetch fails and no draft exists', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const { fetchError, fetchMapData } = useMapPersistence(makeArgs());
      await fetchMapData();
      expect(fetchError.value).toBe('Network error');
    });

    it('migrates v1 draft key to current key', async () => {
      mockFetch({ hexes: [], _savedAt: 0 });
      localStorage.setItem(DRAFT_KEY_V1, 'old-draft-data');
      const { fetchMapData } = useMapPersistence(makeArgs());
      await fetchMapData();
      expect(localStorage.getItem(DRAFT_KEY_V1)).toBeNull();
      // v1 data migrated (then removed as stale since server data has _savedAt: 0)
    });
  });

  describe('pullFromServer', () => {
    it('sets showPullConfirm when there are unsaved changes', async () => {
      const { unsaved, showPullConfirm, pullFromServer } = useMapPersistence(makeArgs());
      unsaved.value = true;
      await pullFromServer();
      expect(showPullConfirm.value).toBe(true);
    });

    it('executes pull directly when no unsaved changes', async () => {
      mockFetch({ hexes: [], _savedAt: 500 });
      const { mapData, pullFromServer } = useMapPersistence(makeArgs());
      await pullFromServer();
      expect(mapData.value).toBeDefined();
    });
  });

  describe('executePull', () => {
    it('loads server data, clears draft, resets unsaved', async () => {
      mockFetch({ hexes: [], _savedAt: 42 });
      localStorage.setItem(DRAFT_KEY, 'something');
      const { mapData, unsaved, serverSavedAt, isOffline, executePull } =
        useMapPersistence(makeArgs());
      unsaved.value = true;
      await executePull();
      expect(mapData.value).toBeDefined();
      expect(unsaved.value).toBe(false);
      expect(serverSavedAt.value).toBe(42);
      expect(isOffline.value).toBe(false);
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('sets pullError when fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('oops')));
      const { pullError, executePull } = useMapPersistence(makeArgs());
      await executePull();
      expect(pullError.value).toBe('oops');
    });

    it('clears isPulling after error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('oops')));
      const { isPulling, executePull } = useMapPersistence(makeArgs());
      await executePull();
      expect(isPulling.value).toBe(false);
    });
  });

  describe('executePush', () => {
    it('is a no-op when mapData is null', async () => {
      const { saveStatus, executePush } = useMapPersistence(makeArgs());
      await executePush();
      expect(saveStatus.value).toBe('');
    });

    it('sets saveStatus to saved on success', async () => {
      mockFetch({ _savedAt: 999 });
      const { mapData, saveStatus, executePush } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await executePush();
      expect(saveStatus.value).toBe('saved');
    });

    it('resets saveStatus to empty after timeout', async () => {
      mockFetch({ _savedAt: 999 });
      const { mapData, saveStatus, executePush } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await executePush();
      expect(saveStatus.value).toBe('saved');
      vi.runAllTimers();
      expect(saveStatus.value).toBe('');
    });

    it('sets saveStatus to error on HTTP error', async () => {
      mockFetch({ issues: [{ message: 'bad' }] }, { ok: false, status: 422 });
      const { mapData, saveStatus, saveErrors, executePush } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await executePush();
      expect(saveStatus.value).toBe('error');
      expect(saveErrors.value).toHaveLength(1);
    });

    it('sets saveStatus to error on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
      const { mapData, saveStatus, executePush } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await executePush();
      expect(saveStatus.value).toBe('error');
    });
  });

  describe('save', () => {
    it('is a no-op when offline', async () => {
      const { isOffline, saveStatus, save } = useMapPersistence(makeArgs());
      isOffline.value = true;
      await save();
      expect(saveStatus.value).toBe('');
    });

    it('shows push confirm when server has newer data than local draft', async () => {
      const { mapData, unsaved, serverSavedAt, showPushConfirm, save } =
        useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      unsaved.value = true;
      serverSavedAt.value = 9999;
      // No local draft → localDraftSavedAt = 0 < serverSavedAt
      await save();
      expect(showPushConfirm.value).toBe(true);
    });

    it('calls executePush when no conflict', async () => {
      mockFetch({ _savedAt: 999 });
      const { mapData, saveStatus, save } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await save();
      expect(saveStatus.value).toBe('saved');
    });
  });
});
