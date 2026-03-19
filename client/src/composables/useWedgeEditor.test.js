import { describe, it, expect, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useWedgeEditor } from './useWedgeEditor.js';

function makeArgs(overrides = {}) {
  const mapData = ref({
    hexes: [
      { hex: '01.01', terrain: 'clear', elevation: 2 },
      { hex: '01.02', terrain: 'woods' },
    ],
  });
  const hexIndex = computed(() => new Map(mapData.value.hexes.map((h, i) => [h.hex, i])));
  const selectedHexId = ref(null);
  const onHexUpdate = vi.fn();
  return { mapData, hexIndex, selectedHexId, onHexUpdate, ...overrides };
}

describe('useWedgeEditor', () => {
  describe('onWedgeUpdate', () => {
    it('is a no-op when selectedHexId is null', () => {
      const args = makeArgs();
      const { onWedgeUpdate } = useWedgeEditor(args);
      onWedgeUpdate([1, 0, 0, 0, 0, 0]);
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('is a no-op when mapData is null', () => {
      const args = makeArgs();
      args.mapData.value = null;
      args.selectedHexId.value = '01.01';
      const { onWedgeUpdate } = useWedgeEditor(args);
      onWedgeUpdate([1, 0, 0, 0, 0, 0]);
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('calls onHexUpdate with wedgeElevations set on existing hex', () => {
      const args = makeArgs();
      args.selectedHexId.value = '01.01';
      const { onWedgeUpdate } = useWedgeEditor(args);
      onWedgeUpdate([1, 2, 3, 0, 0, 0]);
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hex: '01.01',
          terrain: 'clear',
          wedgeElevations: [1, 2, 3, 0, 0, 0],
        })
      );
    });

    it('creates a new hex entry when hex is not in mapData', () => {
      const args = makeArgs();
      args.selectedHexId.value = '99.99';
      const { onWedgeUpdate } = useWedgeEditor(args);
      onWedgeUpdate([0, 1, 0, 0, 0, 0]);
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hex: '99.99',
          terrain: 'unknown',
          wedgeElevations: [0, 1, 0, 0, 0, 0],
        })
      );
    });
  });

  describe('initWedgeElevations', () => {
    it('is a no-op when selectedHexId is null', () => {
      const args = makeArgs();
      const { initWedgeElevations } = useWedgeEditor(args);
      initWedgeElevations();
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('calls onHexUpdate with zero wedgeElevations on existing hex', () => {
      const args = makeArgs();
      args.selectedHexId.value = '01.01';
      const { initWedgeElevations } = useWedgeEditor(args);
      initWedgeElevations();
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ hex: '01.01', wedgeElevations: [0, 0, 0, 0, 0, 0] })
      );
    });

    it('creates a new hex entry when hex is not in mapData', () => {
      const args = makeArgs();
      args.selectedHexId.value = '99.99';
      const { initWedgeElevations } = useWedgeEditor(args);
      initWedgeElevations();
      expect(args.onHexUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hex: '99.99',
          terrain: 'unknown',
          wedgeElevations: [0, 0, 0, 0, 0, 0],
        })
      );
    });
  });
});
