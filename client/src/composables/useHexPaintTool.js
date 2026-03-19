import { ref } from 'vue';
import { usePaintStroke } from './usePaintStroke.js';

/**
 * Handles hex click / paint-drag / right-click-clear for a single-value hex tool
 * (e.g. Elevation, Terrain).
 *
 * @param {object} options
 * @param {Function} options.onPaint  - `(hex) => void` — called on click or drag-enter
 * @param {Function} options.onClear  - `(hex) => void` — called on right-click
 * @param {import('vue').Ref<string>} [options.paintMode] - 'click' | 'paint' (ref); defaults to 'click'
 * @param {Function} [options.onMutated] - Flushed once at stroke end (optional)
 * @returns {{ onHexClick, onHexRightClick, onHexMouseenter, strokeEnd, paintStrokeActive }}
 */
export function useHexPaintTool({ onPaint, onClear, paintMode, onMutated }) {
  const _paintMode = paintMode ?? ref('click');
  const { strokeStart, strokeEnd, paintStrokeActive } = usePaintStroke(onMutated ?? (() => {}));

  function onHexClick(hex) {
    if (!hex) return;
    if (_paintMode.value === 'paint') strokeStart();
    onPaint(hex);
  }

  function onHexRightClick(hex) {
    if (!hex) return;
    onClear(hex);
  }

  function onHexMouseenter(hex) {
    if (!hex) return;
    if (_paintMode.value !== 'paint' || !paintStrokeActive.value) return;
    onPaint(hex);
  }

  return { onHexClick, onHexRightClick, onHexMouseenter, strokeEnd, paintStrokeActive };
}
