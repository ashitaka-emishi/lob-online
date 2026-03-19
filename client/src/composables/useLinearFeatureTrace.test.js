import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useLinearFeatureTrace } from './useLinearFeatureTrace.js';

function makeMapData(hexes = []) {
  return ref({ hexes });
}

describe('useLinearFeatureTrace', () => {
  describe('onTraceProgress', () => {
    it('updates liveTraceCount', () => {
      const mapData = makeMapData();
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { liveTraceCount, onTraceProgress } = useLinearFeatureTrace({
        mapData,
        paintEdgeFeature,
        onMutated,
      });
      onTraceProgress(7);
      expect(liveTraceCount.value).toBe(7);
    });
  });

  describe('onTraceComplete', () => {
    it('stores edges and shows confirm dialog', () => {
      const mapData = makeMapData();
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const {
        showTraceConfirm,
        pendingTraceEdges,
        liveTraceCount,
        onTraceProgress,
        onTraceComplete,
      } = useLinearFeatureTrace({ mapData, paintEdgeFeature, onMutated });

      onTraceProgress(3); // set live count first
      const edges = [{ hexId: '01.01', dir: 'N' }];
      onTraceComplete(edges);

      expect(showTraceConfirm.value).toBe(true);
      expect(pendingTraceEdges.value).toEqual(edges);
      expect(liveTraceCount.value).toBe(0);
    });

    it('ignores empty edge arrays', () => {
      const mapData = makeMapData();
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { showTraceConfirm, onTraceComplete } = useLinearFeatureTrace({
        mapData,
        paintEdgeFeature,
        onMutated,
      });
      onTraceComplete([]);
      expect(showTraceConfirm.value).toBe(false);
    });
  });

  describe('cancelTrace', () => {
    it('hides confirm and clears pending edges', () => {
      const mapData = makeMapData();
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { showTraceConfirm, pendingTraceEdges, onTraceComplete, cancelTrace } =
        useLinearFeatureTrace({ mapData, paintEdgeFeature, onMutated });

      onTraceComplete([{ hexId: '01.01', dir: 'N' }]);
      expect(showTraceConfirm.value).toBe(true);

      cancelTrace();
      expect(showTraceConfirm.value).toBe(false);
      expect(pendingTraceEdges.value).toEqual([]);
    });
  });

  describe('applyTrace', () => {
    it('adds road features to existing hexes for each pending edge', () => {
      const mapData = makeMapData([{ hex: '01.01', terrain: 'clear' }]);
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { onTraceComplete, applyTrace, showTraceConfirm, pendingTraceEdges } =
        useLinearFeatureTrace({ mapData, paintEdgeFeature, onMutated });

      onTraceComplete([{ hexId: '01.01', dir: 'N' }]);
      applyTrace();

      expect(mapData.value.hexes[0].edges?.N).toEqual([{ type: 'road' }]);
      expect(showTraceConfirm.value).toBe(false);
      expect(pendingTraceEdges.value).toEqual([]);
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('creates a new hex entry when hex is not in mapData', () => {
      const mapData = makeMapData([]);
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { onTraceComplete, applyTrace } = useLinearFeatureTrace({
        mapData,
        paintEdgeFeature,
        onMutated,
      });

      onTraceComplete([{ hexId: '99.99', dir: 'SE' }]);
      applyTrace();

      const pushed = mapData.value.hexes.find((h) => h.hex === '99.99');
      expect(pushed).toBeDefined();
      expect(pushed.edges?.SE).toEqual([{ type: 'road' }]);
    });

    it('does not add duplicate features for the same type', () => {
      const mapData = makeMapData([
        { hex: '01.01', terrain: 'clear', edges: { N: [{ type: 'road' }] } },
      ]);
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { onTraceComplete, applyTrace } = useLinearFeatureTrace({
        mapData,
        paintEdgeFeature,
        onMutated,
      });

      onTraceComplete([{ hexId: '01.01', dir: 'N' }]);
      applyTrace();

      expect(mapData.value.hexes[0].edges.N).toHaveLength(1);
    });

    it('batches multiple edges for the same hex into one update', () => {
      const mapData = makeMapData([{ hex: '01.01', terrain: 'clear' }]);
      const paintEdgeFeature = ref('road');
      const onMutated = vi.fn();
      const { onTraceComplete, applyTrace } = useLinearFeatureTrace({
        mapData,
        paintEdgeFeature,
        onMutated,
      });

      onTraceComplete([
        { hexId: '01.01', dir: 'N' },
        { hexId: '01.01', dir: 'NE' },
      ]);
      applyTrace();

      const hex = mapData.value.hexes[0];
      expect(hex.edges?.N).toEqual([{ type: 'road' }]);
      expect(hex.edges?.NE).toEqual([{ type: 'road' }]);
      expect(onMutated).toHaveBeenCalledOnce();
    });

    it('respects paintEdgeFeature type', () => {
      const mapData = makeMapData([{ hex: '01.01', terrain: 'clear' }]);
      const paintEdgeFeature = ref('stream');
      const onMutated = vi.fn();
      const { onTraceComplete, applyTrace } = useLinearFeatureTrace({
        mapData,
        paintEdgeFeature,
        onMutated,
      });

      onTraceComplete([{ hexId: '01.01', dir: 'N' }]);
      applyTrace();

      expect(mapData.value.hexes[0].edges?.N).toEqual([{ type: 'stream' }]);
    });
  });
});
