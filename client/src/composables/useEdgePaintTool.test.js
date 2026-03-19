import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useEdgePaintTool } from './useEdgePaintTool.js';

describe('useEdgePaintTool', () => {
  it('returns onEdgeClick, onEdgeRightClick, onEdgeMousedown, clearAll, paintStrokeActive', () => {
    const result = useEdgePaintTool({
      allowedTypes: ['road'],
      selectedType: ref('road'),
      onPaint: vi.fn(),
      onClear: vi.fn(),
    });
    expect(typeof result.onEdgeClick).toBe('function');
    expect(typeof result.onEdgeRightClick).toBe('function');
    expect(typeof result.onEdgeMousedown).toBe('function');
    expect(typeof result.clearAll).toBe('function');
    expect(typeof result.paintStrokeActive.value).toBe('boolean');
  });

  describe('onEdgeClick', () => {
    it('calls onPaint with hexId, faceIndex, and selectedType', () => {
      const onPaint = vi.fn();
      const selectedType = ref('road');
      const { onEdgeClick } = useEdgePaintTool({
        allowedTypes: ['road'],
        selectedType,
        onPaint,
        onClear: vi.fn(),
      });
      onEdgeClick('05.05', 1);
      expect(onPaint).toHaveBeenCalledWith('05.05', 1, 'road');
    });

    it('does not call onPaint when selectedType is not in allowedTypes', () => {
      const onPaint = vi.fn();
      const selectedType = ref('stream');
      const { onEdgeClick } = useEdgePaintTool({
        allowedTypes: ['road', 'pike'],
        selectedType,
        onPaint,
        onClear: vi.fn(),
      });
      onEdgeClick('05.05', 1);
      expect(onPaint).not.toHaveBeenCalled();
    });
  });

  describe('onEdgeRightClick', () => {
    it('calls onClear with hexId, faceIndex, and selectedType', () => {
      const onClear = vi.fn();
      const selectedType = ref('trail');
      const { onEdgeRightClick } = useEdgePaintTool({
        allowedTypes: ['trail'],
        selectedType,
        onPaint: vi.fn(),
        onClear,
      });
      onEdgeRightClick('03.04', 2);
      expect(onClear).toHaveBeenCalledWith('03.04', 2, 'trail');
    });
  });

  describe('onEdgeMousedown (paint drag)', () => {
    it('starts a stroke and calls onPaint', () => {
      const onPaint = vi.fn();
      const selectedType = ref('road');
      const { onEdgeMousedown, paintStrokeActive } = useEdgePaintTool({
        allowedTypes: ['road'],
        selectedType,
        onPaint,
        onClear: vi.fn(),
      });
      onEdgeMousedown('05.05', 0);
      expect(paintStrokeActive.value).toBe(true);
      expect(onPaint).toHaveBeenCalledWith('05.05', 0, 'road');
    });
  });

  describe('clearAll', () => {
    it('is callable and does not throw', () => {
      const onClearAll = vi.fn();
      const { clearAll } = useEdgePaintTool({
        allowedTypes: ['road'],
        selectedType: ref('road'),
        onPaint: vi.fn(),
        onClear: vi.fn(),
        onClearAll,
      });
      expect(() => clearAll()).not.toThrow();
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });

    it('calls onClearAll with allowedTypes', () => {
      const onClearAll = vi.fn();
      const { clearAll } = useEdgePaintTool({
        allowedTypes: ['trail', 'road', 'pike'],
        selectedType: ref('road'),
        onPaint: vi.fn(),
        onClear: vi.fn(),
        onClearAll,
      });
      clearAll();
      expect(onClearAll).toHaveBeenCalledWith(['trail', 'road', 'pike']);
    });
  });

  describe('strokeEnd', () => {
    it('sets paintStrokeActive to false and flushes onMutated', () => {
      const onMutated = vi.fn();
      const { onEdgeMousedown, strokeEnd, paintStrokeActive } = useEdgePaintTool({
        allowedTypes: ['road'],
        selectedType: ref('road'),
        onPaint: vi.fn(),
        onClear: vi.fn(),
        onMutated,
      });
      onEdgeMousedown('05.05', 0);
      strokeEnd();
      expect(paintStrokeActive.value).toBe(false);
      expect(onMutated).toHaveBeenCalledTimes(1);
    });
  });
});
