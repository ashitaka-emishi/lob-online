import { usePaintStroke } from './usePaintStroke.js';

/**
 * Handles edge-snapped paint drag / right-click-clear / clearAll for a
 * typed edge tool (Road, Stream & Stone Wall, Contour Line).
 *
 * @param {object} options
 * @param {string[]} options.allowedTypes  - Types this tool is allowed to paint.
 * @param {import('vue').Ref<string>} options.selectedType - Currently selected type (must be in allowedTypes).
 * @param {Function} options.onPaint      - `(hexId, faceIndex, type) => void`
 * @param {Function} options.onClear      - `(hexId, faceIndex, type) => void`
 * @param {Function} [options.onClearAll] - `(allowedTypes) => void` — called by clearAll()
 * @param {Function} [options.onMutated]  - Flushed once at stroke end
 * @returns {{ onEdgeClick, onEdgeRightClick, onEdgeMousedown, strokeEnd, clearAll, paintStrokeActive }}
 */
export function useEdgePaintTool({
  allowedTypes,
  selectedType,
  onPaint,
  onClear,
  onClearAll,
  onMutated,
}) {
  const { strokeStart, strokeEnd, paintStrokeActive } = usePaintStroke(onMutated ?? (() => {}));

  function _isAllowed() {
    return allowedTypes.includes(selectedType.value);
  }

  function onEdgeClick(hexId, faceIndex) {
    if (!_isAllowed()) return;
    onPaint(hexId, faceIndex, selectedType.value);
  }

  function onEdgeRightClick(hexId, faceIndex) {
    onClear(hexId, faceIndex, selectedType.value);
  }

  function onEdgeMousedown(hexId, faceIndex) {
    if (!_isAllowed()) return;
    strokeStart();
    onPaint(hexId, faceIndex, selectedType.value);
  }

  function clearAll() {
    onClearAll?.(allowedTypes);
  }

  return { onEdgeClick, onEdgeRightClick, onEdgeMousedown, strokeEnd, clearAll, paintStrokeActive };
}
