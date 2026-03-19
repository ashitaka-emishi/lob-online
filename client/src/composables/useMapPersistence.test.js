import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useMapPersistence } from './useMapPersistence.js';

const DRAFT_KEY = 'test-draft-v2';
const DRAFT_KEY_V1 = 'test-draft-v1';
const STORAGE_KEY = 'test-calibration';
function makeArgs(overrides = {}) {
  return {
    calibration: ref({ cols: 10, rows: 10, northOffset: 0 }),
    onCalibrationLoaded: vi.fn(),
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

    // isValidDraft deepening (#127): allowlist and gridSpec type checks
    it('rejects drafts with unknown top-level keys', () => {
      const { mapData, restoreDraft } = useMapPersistence(makeArgs());
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ hexes: [], _savedAt: 1000, injected: true })
      );
      restoreDraft();
      expect(mapData.value).toBeNull();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('accepts drafts without gridSpec (optional field)', () => {
      const { mapData, restoreDraft } = useMapPersistence(makeArgs());
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ hexes: [], _savedAt: 1000 }));
      restoreDraft();
      expect(mapData.value).not.toBeNull();
    });

    it('rejects drafts where gridSpec is a non-object', () => {
      const { mapData, restoreDraft } = useMapPersistence(makeArgs());
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ hexes: [], _savedAt: 1000, gridSpec: 'not-an-object' })
      );
      restoreDraft();
      expect(mapData.value).toBeNull();
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('rejects drafts where gridSpec is an array', () => {
      const { mapData, restoreDraft } = useMapPersistence(makeArgs());
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ hexes: [], _savedAt: 1000, gridSpec: ['cols', 10] })
      );
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

    it('calls onCalibrationLoaded with gridSpec when present', async () => {
      const args = makeArgs();
      const gridSpec = { cols: 64, rows: 35, northOffset: 3 };
      mockFetch({ hexes: [], gridSpec, _savedAt: 500 });
      const { fetchMapData } = useMapPersistence(args);
      await fetchMapData();
      expect(args.onCalibrationLoaded).toHaveBeenCalledWith(gridSpec);
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
      expect(fetchError.value).toBe('Failed to load map data. Check console for details.');
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

  describe('confirmPull', () => {
    it('loads server data, clears draft, resets unsaved', async () => {
      mockFetch({ hexes: [], _savedAt: 42 });
      localStorage.setItem(DRAFT_KEY, 'something');
      const { mapData, unsaved, serverSavedAt, isOffline, confirmPull } =
        useMapPersistence(makeArgs());
      unsaved.value = true;
      await confirmPull();
      expect(mapData.value).toBeDefined();
      expect(unsaved.value).toBe(false);
      expect(serverSavedAt.value).toBe(42);
      expect(isOffline.value).toBe(false);
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('sets pullError with safe message when fetch fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('oops')));
      const { pullError, confirmPull } = useMapPersistence(makeArgs());
      await confirmPull();
      expect(pullError.value).toBe('Failed to pull from server. Check console for details.');
    });

    it('clears isPulling after error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('oops')));
      const { isPulling, confirmPull } = useMapPersistence(makeArgs());
      await confirmPull();
      expect(isPulling.value).toBe(false);
    });
  });

  describe('confirmSave', () => {
    it('is a no-op when mapData is null', async () => {
      const { saveStatus, confirmSave } = useMapPersistence(makeArgs());
      await confirmSave();
      expect(saveStatus.value).toBe('');
    });

    it('sets saveStatus to saved on success', async () => {
      mockFetch({ _savedAt: 999 });
      const { mapData, saveStatus, confirmSave } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await confirmSave();
      expect(saveStatus.value).toBe('saved');
    });

    it('resets saveStatus to empty after timeout', async () => {
      mockFetch({ _savedAt: 999 });
      const { mapData, saveStatus, confirmSave } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await confirmSave();
      expect(saveStatus.value).toBe('saved');
      vi.runAllTimers();
      expect(saveStatus.value).toBe('');
    });

    it('sets saveStatus to error on HTTP error', async () => {
      mockFetch({ issues: [{ message: 'bad' }] }, { ok: false, status: 422 });
      const { mapData, saveStatus, saveErrors, confirmSave } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await confirmSave();
      expect(saveStatus.value).toBe('error');
      expect(saveErrors.value).toHaveLength(1);
    });

    it('sets saveStatus to error on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
      const { mapData, saveStatus, confirmSave } = useMapPersistence(makeArgs());
      mapData.value = { hexes: [] };
      await confirmSave();
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
