import { describe, it, expect, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useHexInteraction } from './useHexInteraction.js';

function makeArgs(overrides = {}) {
  const selectedHexIds = ref(new Set());
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
  const elevationMax = computed(() => 21);
  const tryPickLosHex = vi.fn().mockReturnValue(false);
  const onHexUpdate = vi.fn();
  const elevationTarget = ref(1);
  const paintHexFeature = ref(null);
  return {
    selectedHexIds,
    mapData,
    hexIndex,
    editorMode,
    paintTerrain,
    elevationMax,
    elevationTarget,
    paintHexFeature,
    tryPickLosHex,
    onHexUpdate,
    ...overrides,
  };
}

describe('useHexInteraction', () => {
  describe('selection unification — selectedHexId is a computed alias for selectedHexIds', () => {
    it('selectedHexId is null when selectedHexIds is empty', () => {
      const args = makeArgs();
      const { selectedHexId } = useHexInteraction(args);
      expect(args.selectedHexIds.value.size).toBe(0);
      expect(selectedHexId.value).toBeNull();
    });

    it('selectedHexId returns the single id when selectedHexIds has exactly one element', () => {
      const args = makeArgs();
      const { selectedHexId } = useHexInteraction(args);
      args.selectedHexIds.value = new Set(['01.01']);
      expect(selectedHexId.value).toBe('01.01');
    });

    it('selectedHexId is null when selectedHexIds has more than one element', () => {
      const args = makeArgs();
      const { selectedHexId } = useHexInteraction(args);
      args.selectedHexIds.value = new Set(['01.01', '01.02']);
      expect(selectedHexId.value).toBeNull();
    });
  });

  describe('onHexClick — LOS pick mode', () => {
    it('calls tryPickLosHex and returns when consumed', () => {
      const args = makeArgs({ tryPickLosHex: vi.fn().mockReturnValue(true) });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(args.tryPickLosHex).toHaveBeenCalledWith('01.01');
      // No selection side-effects
      expect(args.selectedHexIds.value.size).toBe(0);
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('falls through to select mode when tryPickLosHex returns false', () => {
      const args = makeArgs({
        tryPickLosHex: vi.fn().mockReturnValue(false),
        editorMode: ref('select'),
      });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(args.selectedHexIds.value.has('01.01')).toBe(true);
    });
  });

  describe('onHexClick — select mode', () => {
    it('non-shift click sets selectedHexIds to {hexId}', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(args.selectedHexIds.value).toEqual(new Set(['01.01']));
    });

    it('non-shift click on a new hex replaces previous selection', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.02', {});
      expect(args.selectedHexIds.value).toEqual(new Set(['01.02']));
    });

    it('shift-click adds to selection', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.02', { shiftKey: true });
      expect(args.selectedHexIds.value).toEqual(new Set(['01.01', '01.02']));
    });

    it('shift-click on already-selected hex removes it', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.01', { shiftKey: true });
      expect(args.selectedHexIds.value.has('01.01')).toBe(false);
    });
  });

  describe('onHexClick — elevation mode', () => {
    it('click sets elevation to elevationTarget value without selecting hex', () => {
      const args = makeArgs({ editorMode: ref('elevation'), elevationTarget: ref(5) });
      const { selectedHexId, onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(selectedHexId.value).toBeNull();
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', elevation: 5 })
      );
    });

    it('clicking the same hex twice applies elevation both times', () => {
      const args = makeArgs({ editorMode: ref('elevation'), elevationTarget: ref(3) });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      onHexClick('01.01', {});
      expect(args.onHexUpdate).toHaveBeenCalledTimes(2);
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

    it('click with paintHexFeature sets hexFeature not terrain', () => {
      const args = makeArgs({
        editorMode: ref('paint'),
        paintHexFeature: ref({ type: 'building' }),
      });
      const { onHexClick } = useHexInteraction(args);
      onHexClick('01.01', {});
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', hexFeature: { type: 'building' } })
      );
      // terrain should NOT be touched
      expect(args.onHexUpdate.mock.calls[0][0].terrain).not.toBe('building');
    });
  });

  describe('onHexRightClick', () => {
    it('clears elevation to 0 in elevation mode', () => {
      const args = makeArgs({ editorMode: ref('elevation') });
      const { onHexRightClick } = useHexInteraction(args);
      onHexRightClick('01.01'); // hex.elevation = 3 → 0
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', elevation: 0 })
      );
    });

    it('is a no-op in select mode', () => {
      const args = makeArgs({ editorMode: ref('select') });
      const { onHexRightClick } = useHexInteraction(args);
      onHexRightClick('01.01');
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('clears hexFeature when paint mode and paintHexFeature is set', () => {
      const args = makeArgs({
        editorMode: ref('paint'),
        paintHexFeature: ref({ type: 'building' }),
      });
      args.mapData.value.hexes[0].hexFeature = { type: 'building' };
      const { onHexRightClick } = useHexInteraction(args);
      onHexRightClick('01.01');
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', hexFeature: null })
      );
    });
  });

  describe('onHexMouseenter', () => {
    it('paints terrain in paint mode when paintMode is paint', () => {
      const args = makeArgs({
        editorMode: ref('paint'),
        paintTerrain: ref('rough'),
        paintMode: ref('paint'),
      });
      const { onHexMouseenter } = useHexInteraction(args);
      onHexMouseenter('01.02');
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.02', terrain: 'rough' })
      );
    });

    it('does NOT paint terrain in paint mode when paintMode is click', () => {
      const args = makeArgs({
        editorMode: ref('paint'),
        paintTerrain: ref('rough'),
        paintMode: ref('click'),
      });
      const { onHexMouseenter } = useHexInteraction(args);
      onHexMouseenter('01.02');
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('sets elevation to target in elevation mode when paintMode is paint', () => {
      const args = makeArgs({
        editorMode: ref('elevation'),
        paintMode: ref('paint'),
        elevationTarget: ref(7),
      });
      const { onHexMouseenter } = useHexInteraction(args);
      onHexMouseenter('01.01');
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', elevation: 7 })
      );
    });

    it('does NOT raise elevation in elevation mode when paintMode is click', () => {
      const args = makeArgs({
        editorMode: ref('elevation'),
        paintMode: ref('click'),
      });
      const { onHexMouseenter } = useHexInteraction(args);
      onHexMouseenter('01.01');
      expect(args.onHexUpdate).not.toHaveBeenCalled();
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
