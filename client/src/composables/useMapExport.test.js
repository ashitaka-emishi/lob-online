import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useMapExport, stripPrivateFields } from './useMapExport.js';

describe('stripPrivateFields', () => {
  it('removes top-level keys starting with underscore', () => {
    const result = stripPrivateFields({ hexes: [], _meta: 'private', _savedAt: 123 });
    expect(result).not.toHaveProperty('_meta');
    expect(result).not.toHaveProperty('_savedAt');
    expect(result).toHaveProperty('hexes');
  });

  it('removes underscore-prefixed keys recursively in nested objects', () => {
    const result = stripPrivateFields({ nested: { a: 1, _b: 2 } });
    expect(result.nested).toEqual({ a: 1 });
  });

  it('removes underscore-prefixed keys from objects inside arrays', () => {
    const result = stripPrivateFields({
      items: [
        { x: 1, _y: 2 },
        { x: 3, _y: 4 },
      ],
    });
    expect(result.items).toEqual([{ x: 1 }, { x: 3 }]);
  });

  it('passes through primitives (string, number, boolean, null) unchanged', () => {
    const result = stripPrivateFields({ name: 'test', count: 42, flag: true, empty: null });
    expect(result.name).toBe('test');
    expect(result.count).toBe(42);
    expect(result.flag).toBe(true);
    expect(result.empty).toBeNull();
  });

  it('returns null for nodes beyond the default depth limit (#175)', () => {
    // Build 12 levels of nesting — exceeds the default guard of 10
    let obj = 'leaf';
    for (let i = 0; i < 12; i++) obj = { n: obj };
    const result = stripPrivateFields(obj);
    // Navigate 11 .n hops — the last one should be null (truncated by depth guard)
    let node = result;
    for (let i = 0; i < 11; i++) {
      node = node?.n ?? null;
    }
    expect(node).toBeNull();
  });
});

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

  describe('exportSnapshot (via showExportOverlay watch)', () => {
    it('merges calibration as gridSpec when overlay opens', async () => {
      const mapData = ref({ hexes: [] });
      const calibration = ref({ cols: 64, rows: 35 });
      const { showExportOverlay, exportSnapshot } = useMapExport(mapData, calibration);
      showExportOverlay.value = true;
      await Promise.resolve();
      expect(exportSnapshot.value.gridSpec).toEqual({ cols: 64, rows: 35 });
    });

    it('returns null snapshot when mapData is null', async () => {
      const { showExportOverlay, exportSnapshot } = useMapExport(ref(null), ref({}));
      showExportOverlay.value = true;
      await Promise.resolve();
      expect(exportSnapshot.value).toBeNull();
    });

    it('clears snapshot when overlay closes', async () => {
      const mapData = ref({ hexes: [] });
      const { showExportOverlay, exportSnapshot } = useMapExport(mapData, ref({}));
      showExportOverlay.value = true;
      await Promise.resolve();
      showExportOverlay.value = false;
      await Promise.resolve();
      expect(exportSnapshot.value).toBeNull();
    });

    it('does not mutate the original mapData', async () => {
      const original = { hexes: [], _meta: 'private' };
      const mapData = ref(original);
      const { showExportOverlay } = useMapExport(mapData, ref({}));
      showExportOverlay.value = true;
      await Promise.resolve();
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
