import { describe, it, expect, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useHexInteraction } from './useHexInteraction.js';

function makeArgs(overrides = {}) {
  const mapData = ref({
    hexes: [
      { hex: '01.01', terrain: 'clear', elevation: 3 },
      { hex: '01.02', terrain: 'woods', elevation: 1 },
    ],
    elevationSystem: { elevationLevels: 22 },
  });
  const hexIndex = computed(() => new Map(mapData.value.hexes.map((h, i) => [h.hex, i])));
  const editorMode = ref('select');
  const paintTerrain = ref('clear');
  const paintEdgeFeature = ref('road');
  const elevationMax = computed(() => 21);
  const calibration = ref({ cols: 10, rows: 10, northOffset: 0, orientation: 'pointy' });
  const openPanel = ref(null);
  const onHexUpdate = vi.fn();
  return {
    mapData,
    hexIndex,
    editorMode,
    paintTerrain,
    paintEdgeFeature,
    elevationMax,
    calibration,
    openPanel,
    onHexUpdate,
    ...overrides,
  };
}

describe('useHexInteraction', () => {
  describe('selection unification — selectedHexId is a computed alias for selectedHexIds', () => {
    it('selectedHexId is null when selectedHexIds is empty', () => {
      const args = makeArgs();
      const { selectedHexId, selectedHexIds } = useHexInteraction(args);
      expect(selectedHexIds.value.size).toBe(0);
      expect(selectedHexId.value).toBeNull();
    });

    it('selectedHexId returns the single id when selectedHexIds has exactly one element', () => {
      const args = makeArgs();
      const { selectedHexId, selectedHexIds } = useHexInteraction(args);
      selectedHexIds.value = new Set(['01.01']);
      expect(selectedHexId.value).toBe('01.01');
    });

    it('selectedHexId is null when selectedHexIds has more than one element', () => {
      const args = makeArgs();
      const { selectedHexId, selectedHexIds } = useHexInteraction(args);
      selectedHexIds.value = new Set(['01.01', '01.02']);
      expect(selectedHexId.value).toBeNull();
    });
  });

  describe('onHexClick — select mode', () => {
    it('non-shift click sets selectedHexIds to {hexId}', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { selectedHexIds, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(selectedHexIds.value).toEqual(new Set(['01.01']));
    });

    it('non-shift click on a new hex replaces previous selection', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { selectedHexIds, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.02', {});
      expect(selectedHexIds.value).toEqual(new Set(['01.02']));
    });

    it('shift-click adds to selection', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { selectedHexIds, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.02', { shiftKey: true });
      expect(selectedHexIds.value).toEqual(new Set(['01.01', '01.02']));
    });

    it('shift-click on already-selected hex removes it', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { selectedHexIds, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.01', { shiftKey: true });
      expect(selectedHexIds.value.has('01.01')).toBe(false);
    });
  });

  describe('onHexClick — elevation mode', () => {
    it('click selects hex and calls onHexUpdate with elevation +1', () => {
      const args = makeArgs({ editorMode: ref('elevation') });
      const { selectedHexId, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(selectedHexId.value).toBe('01.01');
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', elevation: 4 })
      );
    });

    it('clicking the already-selected hex deselects it without adjusting elevation', () => {
      const args = makeArgs({ editorMode: ref('elevation') });
      const { selectedHexId, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {}); // select
      args.onHexUpdate.mockClear();
      onHexClick('01.01', {}); // deselect
      expect(selectedHexId.value).toBeNull();
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });
  });

  describe('onHexClick — wedge mode', () => {
    it('click selects hex', () => {
      const args = makeArgs({ editorMode: ref('wedge') });
      const { selectedHexId, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(selectedHexId.value).toBe('01.01');
    });

    it('clicking already-selected hex deselects', () => {
      const args = makeArgs({ editorMode: ref('wedge') });
      const { selectedHexId, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.01', {});
      expect(selectedHexId.value).toBeNull();
    });
  });

  describe('onHexClick — paint mode', () => {
    it('click paints terrain on hex', () => {
      const args = makeArgs({ editorMode: ref('paint'), paintTerrain: ref('woods') });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', terrain: 'woods' })
      );
    });
  });

  describe('onHexClick — LOS pick mode', () => {
    it('while picking A, sets losHexA and clears losSelectingHex', () => {
      const args = makeArgs();
      const { losSelectingHex, losHexA, onHexClick } = useHexInteraction(args);
      losSelectingHex.value = 'A';
      onHexClick('01.01', {});
      expect(losHexA.value).toBe('01.01');
      expect(losSelectingHex.value).toBeNull();
      expect(args.openPanel.value).toBe('losTest');
    });

    it('while picking B, sets losHexB and clears losSelectingHex', () => {
      const args = makeArgs();
      const { losSelectingHex, losHexB, onHexClick } = useHexInteraction(args);
      losSelectingHex.value = 'B';
      onHexClick('01.02', {});
      expect(losHexB.value).toBe('01.02');
      expect(losSelectingHex.value).toBeNull();
    });
  });

  describe('onHexRightClick', () => {
    it('decrements elevation in elevation mode', () => {
      const args = makeArgs({ editorMode: ref('elevation') });
      const { onHexRightClick } = useHexInteraction(args);
      onHexRightClick('01.01');
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', elevation: 2 })
      );
    });

    it('is a no-op in select mode', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexRightClick } = useHexInteraction(args);
      onHexRightClick('01.01');
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });
  });

  describe('onHexMouseenter', () => {
    it('paints terrain in paint mode', () => {
      const args = makeArgs({ editorMode: ref('paint'), paintTerrain: ref('rough') });
      const { onHexMouseenter } = useHexInteraction(args);
      onHexMouseenter('01.02');
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.02', terrain: 'rough' })
      );
    });

    it('is a no-op in select mode', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexMouseenter } = useHexInteraction(args);
      onHexMouseenter('01.01');
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });
  });

  describe('adjustHexElevation', () => {
    it('increments elevation within bounds', () => {
      const args = makeArgs();
      const { adjustHexElevation } = useHexInteraction(args);
      adjustHexElevation('01.01', +1);
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', elevation: 4 })
      );
    });

    it('clamps at elevationMax', () => {
      const args = makeArgs();
      args.mapData.value.hexes[0].elevation = 21;
      const { adjustHexElevation } = useHexInteraction(args);
      adjustHexElevation('01.01', +1);
      expect(args.onHexUpdate).toHaveBeenCalledWith(expect.objectContaining({ elevation: 21 }));
    });

    it('clamps at 0', () => {
      const args = makeArgs();
      args.mapData.value.hexes[0].elevation = 0;
      const { adjustHexElevation } = useHexInteraction(args);
      adjustHexElevation('01.01', -1);
      expect(args.onHexUpdate).toHaveBeenCalledWith(expect.objectContaining({ elevation: 0 }));
    });
  });

  describe('LOS helpers', () => {
    it('onLosPickStart sets losSelectingHex', () => {
      const args = makeArgs();
      const { losSelectingHex, onLosPickStart } = useHexInteraction(args);
      onLosPickStart('A');
      expect(losSelectingHex.value).toBe('A');
    });

    it('onLosPickCancel clears losSelectingHex', () => {
      const args = makeArgs();
      const { losSelectingHex, onLosPickCancel } = useHexInteraction(args);
      losSelectingHex.value = 'B';
      onLosPickCancel();
      expect(losSelectingHex.value).toBeNull();
    });

    it('losPathHexes extracts intermediate steps', () => {
      const args = makeArgs();
      const { losResult, losPathHexes } = useHexInteraction(args);
      losResult.value = {
        steps: [
          { hexId: '01.01', role: 'start' },
          { hexId: '01.02', role: 'intermediate' },
          { hexId: '01.03', role: 'end' },
        ],
      };
      expect(losPathHexes.value).toEqual(['01.02']);
    });

    it('losBlockedHex returns the first blocked step hexId', () => {
      const args = makeArgs();
      const { losResult, losBlockedHex } = useHexInteraction(args);
      losResult.value = {
        steps: [{ hexId: '01.02', blocked: true, role: 'intermediate' }],
      };
      expect(losBlockedHex.value).toBe('01.02');
    });
  });

  describe('selectedHex computed', () => {
    it('returns null when nothing selected', () => {
      const args = makeArgs();
      const { selectedHex } = useHexInteraction(args);
      expect(selectedHex.value).toBeNull();
    });

    it('returns the hex data for the selected id', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { selectedHex, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(selectedHex.value).toMatchObject({ hex: '01.01', terrain: 'clear' });
    });
  });
});
