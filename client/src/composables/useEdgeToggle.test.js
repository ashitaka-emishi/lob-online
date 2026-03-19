import { describe, it, expect, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useEdgeToggle } from './useEdgeToggle.js';

function makeArgs(overrides = {}) {
  const mapData = ref({
    hexes: [
      { hex: '01.01', terrain: 'clear' },
      { hex: '02.01', terrain: 'clear' },
    ],
  });
  const hexIndex = computed(() => new Map(mapData.value.hexes.map((h, i) => [h.hex, i])));
  const paintEdgeFeature = ref('road');
  // calibration needed by adjacentHexId (cols/rows/orientation/northOffset)
  const calibration = ref({ cols: 10, rows: 10, northOffset: 0, orientation: 'flat' });
  const onHexUpdate = vi.fn();
  return {
    mapData,
    hexIndex,
    paintEdgeFeature,
    calibration,
    onHexUpdate,
    ...overrides,
  };
}

describe('useEdgeToggle', () => {
  describe('initial state', () => {
    it('returns onEdgeClick function', () => {
      const { onEdgeClick } = useEdgeToggle(makeArgs());
      expect(typeof onEdgeClick).toBe('function');
    });
  });

  describe('onEdgeClick', () => {
    it('is a no-op when mapData is null', () => {
      const args = makeArgs({ mapData: ref(null) });
      const { onEdgeClick } = useEdgeToggle(args);
      onEdgeClick({ hexId: '01.01', dir: 'N' });
      expect(args.onHexUpdate).not.toHaveBeenCalled();
    });

    it('adds edge feature to the clicked hex', () => {
      const args = makeArgs();
      const { onEdgeClick } = useEdgeToggle(args);
      onEdgeClick({ hexId: '01.01', dir: 'N' });
      const call = args.onHexUpdate.mock.calls.find(([h]) => h.hex === '01.01');
      expect(call).toBeDefined();
      expect(call[0].edges.N).toEqual([{ type: 'road' }]);
    });

    it('removes edge feature on second click (toggle off)', () => {
      const args = makeArgs();
      args.mapData.value.hexes[0] = {
        hex: '01.01',
        terrain: 'clear',
        edges: { N: [{ type: 'road' }] },
      };
      const { onEdgeClick } = useEdgeToggle(args);
      onEdgeClick({ hexId: '01.01', dir: 'N' });
      const call = args.onHexUpdate.mock.calls.find(([h]) => h.hex === '01.01');
      expect(call[0].edges.N).toBeUndefined();
    });

    it('uses paintEdgeFeature type', () => {
      const args = makeArgs({ paintEdgeFeature: ref('stream') });
      const { onEdgeClick } = useEdgeToggle(args);
      onEdgeClick({ hexId: '01.01', dir: 'N' });
      const call = args.onHexUpdate.mock.calls.find(([h]) => h.hex === '01.01');
      expect(call[0].edges.N).toEqual([{ type: 'stream' }]);
    });

    it('defaults to road when paintEdgeFeature is null', () => {
      const args = makeArgs({ paintEdgeFeature: ref(null) });
      const { onEdgeClick } = useEdgeToggle(args);
      onEdgeClick({ hexId: '01.01', dir: 'N' });
      const call = args.onHexUpdate.mock.calls.find(([h]) => h.hex === '01.01');
      expect(call[0].edges.N).toEqual([{ type: 'road' }]);
    });

    it('uses stub for unknown hex id', () => {
      const args = makeArgs();
      const { onEdgeClick } = useEdgeToggle(args);
      onEdgeClick({ hexId: '99.99', dir: 'N' });
      const call = args.onHexUpdate.mock.calls.find(([h]) => h.hex === '99.99');
      expect(call).toBeDefined();
      expect(call[0].terrain).toBe('unknown');
    });
  });
});
