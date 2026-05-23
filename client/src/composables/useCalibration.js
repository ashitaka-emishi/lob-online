import { ref } from 'vue';

import { DEFAULT_CALIBRATION, sanitizeCalibration } from '../utils/calibration.js';

export const STORAGE_KEY = 'lob-map-editor-calibration-v4';

function loadCalibration() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return sanitizeCalibration(JSON.parse(stored));
    }
  } catch (_) {
    /* ignore */
  }
  return { ...DEFAULT_CALIBRATION };
}

/**
 * Manages calibration state and localStorage persistence.
 *
 * mapData.gridSpec sync and unsaved marking are cross-composable concerns handled
 * by the caller (MapEditorView) after calling onCalibrationChange.
 *
 * @returns {{ calibration, calibrationMode, onCalibrationChange, onCalibrationLoaded }}
 */
export function useCalibration() {
  const calibration = ref(loadCalibration());
  const calibrationMode = ref(false);

  function onCalibrationChange(val) {
    const validated = sanitizeCalibration(val);
    calibration.value = validated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  }

  function onCalibrationLoaded(gridSpec) {
    const validated = sanitizeCalibration({ ...DEFAULT_CALIBRATION, ...gridSpec });
    calibration.value = validated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  }

  function toggleCalibrationMode() {
    calibrationMode.value = !calibrationMode.value;
  }

  return {
    calibration,
    calibrationMode,
    onCalibrationChange,
    onCalibrationLoaded,
    toggleCalibrationMode,
  };
}
