import { ref, computed } from 'vue';

const PANEL_DISPLAY_NAMES = {
  calibration: 'Grid Calibration',
  elevation: 'Elevation Tool',
  terrain: 'Terrain Tool',
  road: 'Road Tool',
  stream: 'Stream & Stone Wall Tool',
  contour: 'Contour Line Tool',
  losTest: 'LOS Test',
};

// Panels that activate a data-editing tool mode when opened.
// These are the same panels that enable HexMapOverlay's interaction gate.
const TOOL_PANEL_MODES = Object.freeze({
  elevation: 'elevation',
  terrain: 'paint',
  road: 'edge',
  stream: 'edge',
  contour: 'edge',
});

/**
 * Accordion panel state, editor mode derivation, and panel toggle logic.
 *
 * @param {object} [args]
 * @param {function} [args.onClearSelection] - called when closing an active tool panel
 */
export function useEditorAccordion({ onClearSelection } = {}) {
  const openPanel = ref(null);

  // editorMode derives from openPanel reactively — no imperative assignment needed
  const editorMode = computed(() => TOOL_PANEL_MODES[openPanel.value] ?? 'select');

  const activeToolName = computed(() =>
    openPanel.value ? (PANEL_DISPLAY_NAMES[openPanel.value] ?? openPanel.value) : null
  );

  function togglePanel(name) {
    const prevPanel = openPanel.value;
    const wasOpen = prevPanel === name;
    openPanel.value = wasOpen ? null : name;

    // Clear selection when a tool panel closes
    if (TOOL_PANEL_MODES[prevPanel] && !TOOL_PANEL_MODES[openPanel.value]) {
      onClearSelection?.();
    }
  }

  /** Returns true if the named panel activates a tool mode when open. */
  function isToolPanel(name) {
    return Object.prototype.hasOwnProperty.call(TOOL_PANEL_MODES, name);
  }

  return { openPanel, editorMode, activeToolName, togglePanel, isToolPanel };
}
