import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useMapExport } from './useMapExport.js';

describe('useMapExport', () => {
  describe('initial state', () => {
    it('showExportOverlay defaults to false', () => {
      const { showExportOverlay } = useMapExport(ref(null), ref({}));
      expect(showExportOverlay.value).toBe(false);
    });

    it('exportSnapshot defaults to null', () => {
      const { exportSnapshot } = useMapExport(ref(null), ref({}));
      expect(exportSnapshot.value).toBeNull();
    });
  });

  describe('stripPrivateFields', () => {
    it('removes top-level keys starting with underscore', () => {
      const mapData = ref({ hexes: [], _meta: 'private', _savedAt: 123 });
      const calibration = ref({ cols: 64 });
      const { getEngineExport } = useMapExport(mapData, calibration);
      const result = getEngineExport();
      expect(result).not.toHaveProperty('_meta');
      expect(result).not.toHaveProperty('_savedAt');
      expect(result).toHaveProperty('hexes');
    });

    it('removes underscore-prefixed keys recursively in nested objects', () => {
      const mapData = ref({ nested: { a: 1, _b: 2 } });
      const calibration = ref({});
      const { getEngineExport } = useMapExport(mapData, calibration);
      const result = getEngineExport();
      expect(result.nested).toEqual({ a: 1 });
    });

    it('removes underscore-prefixed keys from objects inside arrays', () => {
      const mapData = ref({
        items: [
          { x: 1, _y: 2 },
          { x: 3, _y: 4 },
        ],
      });
      const calibration = ref({});
      const { getEngineExport } = useMapExport(mapData, calibration);
      const result = getEngineExport();
      expect(result.items).toEqual([{ x: 1 }, { x: 3 }]);
    });

    it('passes through primitives (string, number, boolean, null) unchanged', () => {
      const mapData = ref({ name: 'test', count: 42, flag: true, empty: null });
      const calibration = ref({});
      const { getEngineExport } = useMapExport(mapData, calibration);
      const result = getEngineExport();
      expect(result.name).toBe('test');
      expect(result.count).toBe(42);
      expect(result.flag).toBe(true);
      expect(result.empty).toBeNull();
    });
  });

  describe('getEngineExport', () => {
    it('merges calibration as gridSpec into the exported object', () => {
      const mapData = ref({ hexes: [] });
      const calibration = ref({ cols: 64, rows: 35 });
      const { getEngineExport } = useMapExport(mapData, calibration);
      const result = getEngineExport();
      expect(result.gridSpec).toEqual({ cols: 64, rows: 35 });
    });

    it('returns null when mapData is null', () => {
      const { getEngineExport } = useMapExport(ref(null), ref({}));
      expect(getEngineExport()).toBeNull();
    });

    it('does not mutate the original mapData', () => {
      const original = { hexes: [], _meta: 'private' };
      const mapData = ref(original);
      const { getEngineExport } = useMapExport(mapData, ref({}));
      getEngineExport();
      expect(original._meta).toBe('private');
    });
  });

  describe('copyMapData', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it('calls navigator.clipboard.writeText with JSON of engine export', () => {
      const mapData = ref({ hexes: [] });
      const calibration = ref({ cols: 64 });
      const { copyMapData } = useMapExport(mapData, calibration);
      copyMapData();
      expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
      const written = JSON.parse(navigator.clipboard.writeText.mock.calls[0][0]);
      expect(written.gridSpec).toEqual({ cols: 64 });
      expect(written).not.toHaveProperty('_meta');
    });

    it('does not call clipboard when mapData is null', () => {
      const { copyMapData } = useMapExport(ref(null), ref({}));
      copyMapData();
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('downloadExport', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:fake'),
        revokeObjectURL: vi.fn(),
      });
      const mockAnchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    });

    it('creates a Blob and triggers an anchor click for download', () => {
      const mapData = ref({ hexes: [] });
      const calibration = ref({ cols: 64 });
      const { downloadExport } = useMapExport(mapData, calibration);
      downloadExport();
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      const anchor = document.createElement.mock.results[0].value;
      expect(anchor.download).toBe('map-export.json');
      expect(anchor.click).toHaveBeenCalledOnce();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    });

    it('does nothing when mapData is null', () => {
      const { downloadExport } = useMapExport(ref(null), ref({}));
      downloadExport();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
