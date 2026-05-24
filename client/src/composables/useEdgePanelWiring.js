import { ref, reactive } from 'vue';

/**
 * Encapsulates the repeated per-panel wiring for edge tool panels
 * (Road, Stream, Contour). Each panel needs an independent selectedType ref
 * and the same four event handlers wired to the shared edge mutation functions.
 *
 * @param {string} defaultType - Initial selected edge type for this panel.
 * @param {{ handleEdgePaint, handleEdgeClear, handleEdgeClearAll, activePanelOverlayConfig }} deps
 *   `activePanelOverlayConfig` is a shared Ref written by all panel instances.
 *
 *   **INVARIANT: caller must guarantee only one panel instance is active at a time.**
 *   This composable uses a last-writer-wins pattern on the shared ref; if multiple panels
 *   were ever open simultaneously they would race. The enforcement mechanism lives in
 *   MapEditorView: it watches `openPanel` and resets `activePanelOverlayConfig` to `null`
 *   on every panel transition, so stale config from the previous panel never bleeds into
 *   the next.
 * @returns {{ selectedType, onTypeChange, onEdgePaint, onEdgeClear, onEdgeClearAll, onOverlayConfig }}
 */
export function useEdgePanelWiring(defaultType, deps) {
  const { handleEdgePaint, handleEdgeClear, handleEdgeClearAll, activePanelOverlayConfig } = deps;
  const selectedType = ref(defaultType);

  function onTypeChange(type) {
    selectedType.value = type;
  }

  function onEdgePaint({ hexId, faceIndex, type }) {
    handleEdgePaint(hexId, faceIndex, type);
  }

  function onEdgeClear({ hexId, faceIndex, type }) {
    handleEdgeClear(hexId, faceIndex, type);
  }

  function onEdgeClearAll(types) {
    handleEdgeClearAll(types);
  }

  function onOverlayConfig(cfg) {
    activePanelOverlayConfig.value = cfg; // INVARIANT: single-panel exclusivity guaranteed by caller
  }

  // reactive() auto-unwraps the selectedType ref so callers access road.selectedType
  // directly (no .value needed), matching Vue 3 template auto-unwrap behaviour.
  // Do NOT destructure the return value — destructuring breaks reactivity by extracting
  // raw values from the reactive proxy at the moment of destructuring.
  return reactive({
    selectedType,
    onTypeChange,
    onEdgePaint,
    onEdgeClear,
    onEdgeClearAll,
    onOverlayConfig,
  });
}
