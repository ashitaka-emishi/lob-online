import { describe, it, expect, vi } from 'vitest';
import { useEditorAccordion } from './useEditorAccordion.js';

describe('useEditorAccordion', () => {
  describe('initial state', () => {
    it('openPanel defaults to null (no panel open)', () => {
      const { openPanel } = useEditorAccordion();
      expect(openPanel.value).toBeNull();
    });

    it('editorMode defaults to select when no panel is open', () => {
      const { editorMode } = useEditorAccordion();
      expect(editorMode.value).toBe('select');
    });

    it('activeToolName is null when no panel is open', () => {
      const { activeToolName } = useEditorAccordion();
      expect(activeToolName.value).toBeNull();
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

    it('sets editorMode to edge when road panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('road');
      expect(editorMode.value).toBe('edge');
    });

    it('sets editorMode to edge when stream panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('stream');
      expect(editorMode.value).toBe('edge');
    });

    it('sets editorMode to edge when contour panel opens', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('contour');
      expect(editorMode.value).toBe('edge');
    });

    it('resets editorMode to select when closing a tool panel', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('elevation');
      togglePanel('elevation'); // close
      expect(editorMode.value).toBe('select');
    });

    it('non-tool panels (calibration) keep editorMode as select', () => {
      const { editorMode, togglePanel } = useEditorAccordion();
      togglePanel('calibration');
      expect(editorMode.value).toBe('select');
    });
  });

  describe('activeToolName', () => {
    it('returns null when no panel is open', () => {
      const { activeToolName } = useEditorAccordion();
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

  describe('isToolPanel', () => {
    it('returns true for data-editing tool panels', () => {
      const { isToolPanel } = useEditorAccordion();
      expect(isToolPanel('elevation')).toBe(true);
      expect(isToolPanel('terrain')).toBe(true);
      expect(isToolPanel('road')).toBe(true);
      expect(isToolPanel('stream')).toBe(true);
      expect(isToolPanel('contour')).toBe(true);
    });

    it('returns false for non-tool panels', () => {
      const { isToolPanel } = useEditorAccordion();
      expect(isToolPanel('calibration')).toBe(false);
      expect(isToolPanel('losTest')).toBe(false);
      expect(isToolPanel('unknown')).toBe(false);
    });
  });
});
