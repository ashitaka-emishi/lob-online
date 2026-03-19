import { describe, it, expect, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useBulkOperations } from './useBulkOperations.js';

function makeMapData(hexes = []) {
  return ref({ hexes, elevationSystem: { elevationLevels: 22 } });
}

function makeArgs(hexes, maxLevel = 21) {
  const mapData = makeMapData(hexes);
  const elevationMax = computed(() => maxLevel);
  const onMutated = vi.fn();
  return { mapData, elevationMax, onMutated };
}

describe('useBulkOperations', () => {
  describe('clearAllElevations', () => {
    it('strips elevation from every hex', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'clear', elevation: 3 },
        { hex: '01.02', terrain: 'woods', elevation: 1 },
      ]);
      const { clearAllElevations } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllElevations();
      expect(mapData.value.hexes[0]).not.toHaveProperty('elevation');
      expect(mapData.value.hexes[1]).not.toHaveProperty('elevation');
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('preserves other hex fields', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'woods', elevation: 5, wedgeElevations: [1, 0, 0, 0, 0, 0] },
      ]);
      const { clearAllElevations } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllElevations();
      expect(mapData.value.hexes[0].terrain).toBe('woods');
      expect(mapData.value.hexes[0].wedgeElevations).toEqual([1, 0, 0, 0, 0, 0]);
    });

    it('is a no-op when mapData is null', () => {
      const mapData = ref(null);
      const elevationMax = computed(() => 21);
      const onMutated = vi.fn();
      const { clearAllElevations } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllElevations();
      expect(onMutated).not.toHaveBeenCalled();
    });
  });

  describe('raiseAll', () => {
    it('increments all elevations by 1', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'clear', elevation: 5 },
        { hex: '01.02', terrain: 'clear', elevation: 3 },
      ]);
      const { raiseAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      raiseAll();
      expect(mapData.value.hexes[0].elevation).toBe(6);
      expect(mapData.value.hexes[1].elevation).toBe(4);
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('caps at elevationMax', () => {
      const { mapData, elevationMax, onMutated } = makeArgs(
        [{ hex: '01.01', terrain: 'clear', elevation: 21 }],
        21
      );
      const { raiseAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      raiseAll();
      expect(mapData.value.hexes[0].elevation).toBe(21);
    });

    it('treats missing elevation as 0', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([{ hex: '01.01', terrain: 'clear' }]);
      const { raiseAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      raiseAll();
      expect(mapData.value.hexes[0].elevation).toBe(1);
    });

    it('is a no-op when mapData is null', () => {
      const mapData = ref(null);
      const elevationMax = computed(() => 21);
      const onMutated = vi.fn();
      const { raiseAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      raiseAll();
      expect(onMutated).not.toHaveBeenCalled();
    });
  });

  describe('lowerAll', () => {
    it('decrements all elevations by 1', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'clear', elevation: 3 },
        { hex: '01.02', terrain: 'clear', elevation: 5 },
      ]);
      const { lowerAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      lowerAll();
      expect(mapData.value.hexes[0].elevation).toBe(2);
      expect(mapData.value.hexes[1].elevation).toBe(4);
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('floors at 0', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'clear', elevation: 0 },
      ]);
      const { lowerAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      lowerAll();
      expect(mapData.value.hexes[0].elevation).toBe(0);
    });

    it('treats missing elevation as 0 → stays 0', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([{ hex: '01.01', terrain: 'clear' }]);
      const { lowerAll } = useBulkOperations({ mapData, elevationMax, onMutated });
      lowerAll();
      expect(mapData.value.hexes[0].elevation).toBe(0);
    });
  });

  describe('clearAllTerrain', () => {
    it('sets every hex terrain to clear', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'woods' },
        { hex: '01.02', terrain: 'rough' },
      ]);
      const { clearAllTerrain } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllTerrain();
      expect(mapData.value.hexes[0].terrain).toBe('clear');
      expect(mapData.value.hexes[1].terrain).toBe('clear');
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('preserves elevation and other fields', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'woods', elevation: 4 },
      ]);
      const { clearAllTerrain } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllTerrain();
      expect(mapData.value.hexes[0].elevation).toBe(4);
    });
  });

  describe('clearAllWedges', () => {
    it('resets wedgeElevations to [0,0,0,0,0,0] for hexes that have them', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'clear', wedgeElevations: [1, 2, 3, 4, 5, 6] },
      ]);
      const { clearAllWedges } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllWedges();
      expect(mapData.value.hexes[0].wedgeElevations).toEqual([0, 0, 0, 0, 0, 0]);
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('leaves hexes without wedgeElevations unchanged', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([{ hex: '01.01', terrain: 'woods' }]);
      const { clearAllWedges } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllWedges();
      expect(mapData.value.hexes[0].wedgeElevations).toBeUndefined();
    });

    it('preserves terrain and elevation', () => {
      const { mapData, elevationMax, onMutated } = makeArgs([
        { hex: '01.01', terrain: 'woods', elevation: 3, wedgeElevations: [1, 1, 1, 1, 1, 1] },
      ]);
      const { clearAllWedges } = useBulkOperations({ mapData, elevationMax, onMutated });
      clearAllWedges();
      expect(mapData.value.hexes[0].terrain).toBe('woods');
      expect(mapData.value.hexes[0].elevation).toBe(3);
    });
  });
});
