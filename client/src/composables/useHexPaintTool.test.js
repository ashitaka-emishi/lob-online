import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useHexPaintTool } from './useHexPaintTool.js';

function makeHex(id = '01.01') {
  return { hex: id, terrain: 'clear', elevation: 0 };
}

describe('useHexPaintTool', () => {
  it('returns onHexClick, onHexRightClick, onHexMouseenter, paintStrokeActive', () => {
    const result = useHexPaintTool({ onPaint: vi.fn(), onClear: vi.fn() });
    expect(typeof result.onHexClick).toBe('function');
    expect(typeof result.onHexRightClick).toBe('function');
    expect(typeof result.onHexMouseenter).toBe('function');
    expect(typeof result.paintStrokeActive.value).toBe('boolean');
  });

  describe('click mode (default)', () => {
    it('onHexClick calls onPaint with the hex', () => {
      const onPaint = vi.fn();
      const paintMode = ref('click');
      const { onHexClick } = useHexPaintTool({ onPaint, onClear: vi.fn(), paintMode });
      onHexClick(makeHex('02.03'));
      expect(onPaint).toHaveBeenCalledWith(makeHex('02.03'));
    });

    it('onHexRightClick calls onClear with the hex', () => {
      const onClear = vi.fn();
      const paintMode = ref('click');
      const { onHexRightClick } = useHexPaintTool({ onPaint: vi.fn(), onClear, paintMode });
      onHexRightClick(makeHex('02.03'));
      expect(onClear).toHaveBeenCalledWith(makeHex('02.03'));
    });

    it('onHexMouseenter does NOT call onPaint in click mode', () => {
      const onPaint = vi.fn();
      const paintMode = ref('click');
      const { onHexMouseenter } = useHexPaintTool({ onPaint, onClear: vi.fn(), paintMode });
      onHexMouseenter(makeHex('02.03'));
      expect(onPaint).not.toHaveBeenCalled();
    });
  });

  describe('paint mode', () => {
    it('onHexClick starts a stroke and calls onPaint', () => {
      const onPaint = vi.fn();
      const onMutated = vi.fn();
      const paintMode = ref('paint');
      const { onHexClick, paintStrokeActive } = useHexPaintTool({
        onPaint,
        onClear: vi.fn(),
        onMutated,
        paintMode,
      });
      onHexClick(makeHex());
      expect(paintStrokeActive.value).toBe(true);
      expect(onPaint).toHaveBeenCalled();
    });

    it('onHexMouseenter calls onPaint while stroke is active', () => {
      const onPaint = vi.fn();
      const paintMode = ref('paint');
      const { onHexClick, onHexMouseenter } = useHexPaintTool({
        onPaint,
        onClear: vi.fn(),
        paintMode,
      });
      onHexClick(makeHex('01.01'));
      onHexMouseenter(makeHex('01.02'));
      expect(onPaint).toHaveBeenCalledTimes(2);
    });

    it('onHexMouseenter does NOT call onPaint when stroke is not active', () => {
      const onPaint = vi.fn();
      const paintMode = ref('paint');
      const { onHexMouseenter } = useHexPaintTool({ onPaint, onClear: vi.fn(), paintMode });
      onHexMouseenter(makeHex());
      expect(onPaint).not.toHaveBeenCalled();
    });

    it('strokeEnd flushes onMutated', () => {
      const onMutated = vi.fn();
      const paintMode = ref('paint');
      const { onHexClick, strokeEnd } = useHexPaintTool({
        onPaint: vi.fn(),
        onClear: vi.fn(),
        onMutated,
        paintMode,
      });
      onHexClick(makeHex());
      strokeEnd();
      expect(onMutated).toHaveBeenCalledTimes(1);
    });
  });

  it('onHexClick is a no-op when hex is null', () => {
    const onPaint = vi.fn();
    const { onHexClick } = useHexPaintTool({ onPaint, onClear: vi.fn() });
    expect(() => onHexClick(null)).not.toThrow();
    expect(onPaint).not.toHaveBeenCalled();
  });
});
