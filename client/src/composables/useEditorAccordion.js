import { ref, computed } from 'vue';

const PANEL_DISPLAY_NAMES = {
  calibration: 'Grid Calibration',
  elevation: 'Elevation Tool',
  terrain: 'Terrain Tool',
  linearFeature: 'Linear Feature',
  hexEdit: 'Hex Edit',
  wedge: 'Wedge Editor',
  losTest: 'LOS Test',
};

// Which panels activate a tool mode when opened
export const TOOL_PANEL_MODES = {
  elevation: 'elevation',
  terrain: 'paint',
  linearFeature: 'linearFeature',
  wedge: 'wedge',
};

/**
 * Accordion panel state, editor mode derivation, and panel toggle logic.
 *
 * @param {object} [args]
 * @param {function} [args.onClearSelection] - called when closing an active tool panel
 */
export function useEditorAccordion({ onClearSelection } = {}) {
  const openPanel = ref('hexEdit');
  const editorMode = ref('select');

  const activeToolName = computed(() =>
    openPanel.value ? (PANEL_DISPLAY_NAMES[openPanel.value] ?? openPanel.value) : null
  );

  function togglePanel(name) {
    const prevPanel = openPanel.value;
    const wasOpen = prevPanel === name;
    openPanel.value = wasOpen ? null : name;

    // Derive editorMode from the now-open panel
    editorMode.value = TOOL_PANEL_MODES[openPanel.value] ?? 'select';

    // Clear selection when a tool panel closes
    if (TOOL_PANEL_MODES[prevPanel] && !TOOL_PANEL_MODES[openPanel.value]) {
      onClearSelection?.();
    }
  }

  return { openPanel, editorMode, activeToolName, togglePanel };
}
