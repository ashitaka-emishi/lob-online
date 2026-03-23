import { usePaintStroke } from './usePaintStroke.js';

// ── Composable composition contract (#155) ─────────────────────────────────────
//
// Three composables share responsibility for edge tool panels:
//
//   useEdgePaintTool   — drag-paint + right-click-erase + clearAll for a typed edge
//                        feature. The primary composable for RoadToolPanel,
//                        StreamWallToolPanel, and ContourToolPanel.
//
//   useClickHexside    — single-click place / right-click remove with validateFn.
//                        Used as a sub-control inside RoadToolPanel (bridge) and
//                        StreamWallToolPanel (ford). Composes alongside useEdgePaintTool
//                        in the same panel component; the panel routes edge-click events
//                        to whichever composable is active based on mode state.
//
//   useHexPaintTool    — hex click / paint-drag / right-click for hex-level tools.
//                        Used by ElevationToolPanel. Not used in edge tool panels.
//
// Event routing contract (panel → MapEditorView):
//   All three composables are wired inside a tool panel component. The panel emits
//   'edge-click' / 'edge-right-click' / 'edge-paint' / 'edge-clear' events upward;
//   MapEditorView routes them to the correct mutation handler (handleEdgePaint /
//   handleEdgeClear). No composable calls a server or store directly.
//
// Overlay config contract:
//   Each tool panel computes its own ownOverlayConfig (computed ref) and emits it via
//   'overlay-config' to MapEditorView on every change (watch + immediate: true).
//   MapEditorView merges the active panel's slice with global editor state and passes
//   a unified overlayConfig to HexMapOverlay. HexMapOverlay does not know panel names.
//
// ──────────────────────────────────────────────────────────────────────────────

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
