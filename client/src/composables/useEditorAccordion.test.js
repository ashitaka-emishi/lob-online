import { describe, it, expect, vi } from 'vitest';
import { useEditorAccordion, TOOL_PANEL_MODES } from './useEditorAccordion.js';

describe('useEditorAccordion', () => {
  describe('initial state', () => {
    it('openPanel defaults to hexEdit', () => {
      const { openPanel } = useEditorAccordion();
      expect(openPanel.value).toBe('hexEdit');
    });

    it('editorMode defaults to select', () => {
      const { editorMode } = useEditorAccordion();
      expect(editorMode.value).toBe('select');
    });

    it('activeToolName reflects the open panel display name', () => {
      const { activeToolName } = useEditorAccordion();
      expect(activeToolName.value).toBe('Hex Edit');
    });
  });

  describe('togglePanel', () => {
    it('opens a closed panel', () => {
      const { openPanel, togglePanel } = useEditorAccordion();
      togglePanel('calibration');
      expect(openPanel.value).toBe('calibration');
    });

    it('closes an already-open panel', () => {
      const { openPanel, togglePanel } = useEditorAccordion();
      togglePanel('calibration');
      togglePanel('calibration');
      expect(openPanel.value).toBeNull();
    });

    it('switching panels replaces the open one', () => {
      const { openPanel, togglePanel } = useEditorAccordion();
      togglePanel('elevation');
      togglePanel('terrain');
      expect(openPanel.value).toBe('terrain');
    });
  });

  describe('editorMode derivation', () => {
    it('sets editorMode to elevation when elevation panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('elevation');
      expect(editorMode.value).toBe('elevation');
    });

    it('sets editorMode to paint when terrain panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('terrain');
      expect(editorMode.value).toBe('paint');
    });

    it('sets editorMode to linearFeature when linearFeature panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('linearFeature');
      expect(editorMode.value).toBe('linearFeature');
    });

    it('sets editorMode to wedge when wedge panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('wedge');
      expect(editorMode.value).toBe('wedge');
    });

    it('resets editorMode to select when closing a tool panel', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('elevation');
      togglePanel('elevation'); // close
      expect(editorMode.value).toBe('select');
    });

    it('non-tool panels (calibration) set editorMode to select', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('calibration');
      expect(editorMode.value).toBe('select');
    });
  });

  describe('activeToolName', () => {
    it('returns null when no panel is open', () => {
      const { activeToolName, togglePanel } = useEditorAccordion();
      togglePanel('hexEdit'); // close it (it's already open by default)
      expect(activeToolName.value).toBeNull();
    });

    it('returns display name for a known panel', () => {
      const { activeToolName, togglePanel } = useEditorAccordion();
      togglePanel('elevation');
      expect(activeToolName.value).toBe('Elevation Tool');
    });

    it('falls back to panel key for unknown panel names', () => {
      const { activeToolName, togglePanel } = useEditorAccordion();
      togglePanel('unknown-panel');
      expect(activeToolName.value).toBe('unknown-panel');
    });
  });

  describe('onClearSelection callback', () => {
    it('calls onClearSelection when closing a tool panel', () => {
      const onClearSelection = vi.fn();
      const { togglePanel } = useEditorAccordion({ onClearSelection });
      togglePanel('elevation'); // open tool panel
      togglePanel('elevation'); // close tool panel
      expect(onClearSelection).toHaveBeenCalledOnce();
    });

    it('does not call onClearSelection when opening a tool panel', () => {
      const onClearSelection = vi.fn();
      const { togglePanel } = useEditorAccordion({ onClearSelection });
      togglePanel('elevation');
      expect(onClearSelection).not.toHaveBeenCalled();
    });

    it('does not call onClearSelection when toggling a non-tool panel', () => {
      const onClearSelection = vi.fn();
      const { togglePanel } = useEditorAccordion({ onClearSelection });
      togglePanel('calibration');
      togglePanel('calibration');
      expect(onClearSelection).not.toHaveBeenCalled();
    });

    it('does not call onClearSelection when switching between tool panels', () => {
      const onClearSelection = vi.fn();
      const { togglePanel } = useEditorAccordion({ onClearSelection });
      togglePanel('elevation');
      togglePanel('terrain'); // switch — prevPanel had a tool mode, new panel also has one
      expect(onClearSelection).not.toHaveBeenCalled();
    });

    it('works without onClearSelection (no error)', () => {
      const { togglePanel } = useEditorAccordion();
      expect(() => {
        togglePanel('elevation');
        togglePanel('elevation');
      }).not.toThrow();
    });
  });

  describe('TOOL_PANEL_MODES export', () => {
    it('contains the expected panel-to-mode mappings', () => {
      expect(TOOL_PANEL_MODES).toMatchObject({
        elevation: 'elevation',
        terrain: 'paint',
        linearFeature: 'linearFeature',
        wedge: 'wedge',
      });
    });
  });
});
