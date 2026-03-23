import { ref } from 'vue';

/**
 * Encapsulates the repeated per-panel wiring for edge tool panels
 * (Road, Stream, Contour). Each panel needs an independent selectedType ref
 * and the same four event handlers wired to the shared edge mutation functions.
 *
 * @param {string} defaultType - Initial selected edge type for this panel.
 * @param {{ handleEdgePaint, handleEdgeClear, handleEdgeClearAll, activePanelOverlayConfig }} deps
 *   `activePanelOverlayConfig` is a shared Ref written by all panel instances. This is an
 *   intentional last-writer-wins pattern that relies on the accordion's single-panel exclusivity
 *   guarantee — only one panel is active at a time. If multiple panels were ever open
 *   simultaneously they would race on this ref.
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
    activePanelOverlayConfig.value = cfg;
  }

  return { selectedType, onTypeChange, onEdgePaint, onEdgeClear, onEdgeClearAll, onOverlayConfig };
}
