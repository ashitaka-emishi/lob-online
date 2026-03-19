import { ref } from 'vue';

/**
 * Manages a paint stroke lifecycle: suppresses per-hex saves during drag,
 * then flushes a single `onMutated` call on stroke end.
 *
 * Usage:
 *   const { strokeStart, strokeEnd, paintStrokeActive } = usePaintStroke(onMutated);
 *   // call strokeStart() on mousedown, strokeEnd() on mouseup
 *
 * Used by: useHexPaintTool, useEdgePaintTool
 *
 * @param {Function} onMutated - Flushed once when the stroke ends.
 */
export function usePaintStroke(onMutated) {
  const paintStrokeActive = ref(false);

  function strokeStart() {
    paintStrokeActive.value = true;
  }

  function strokeEnd() {
    if (!paintStrokeActive.value) return;
    paintStrokeActive.value = false;
    onMutated();
  }

  return { strokeStart, strokeEnd, paintStrokeActive };
}
