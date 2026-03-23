import { ref } from 'vue';

const STORAGE_KEY = 'lob-map-editor-calibration-v4';

const DEFAULT_CALIBRATION = {
  cols: 64,
  rows: 35,
  dx: 0,
  dy: 0,
  hexWidth: 35,
  hexHeight: 35,
  imageScale: 1,
  orientation: 'flat',
  strokeWidth: 1,
  evenColUp: true,
  northOffset: 0,
};

function loadCalibration() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const safeNumeric = (val, fallback) => (Number.isFinite(val) ? val : fallback);
      const safeBoolean = (val, fallback) => (typeof val === 'boolean' ? val : fallback);
      const safeString = (val, fallback) => (typeof val === 'string' ? val : fallback);
      const D = DEFAULT_CALIBRATION;
      return {
        cols: safeNumeric(parsed.cols, D.cols),
        rows: safeNumeric(parsed.rows, D.rows),
        dx: safeNumeric(parsed.dx, D.dx),
        dy: safeNumeric(parsed.dy, D.dy),
        hexWidth: safeNumeric(parsed.hexWidth, D.hexWidth),
        hexHeight: safeNumeric(parsed.hexHeight, D.hexHeight),
        imageScale: safeNumeric(parsed.imageScale, D.imageScale),
        strokeWidth: safeNumeric(parsed.strokeWidth, D.strokeWidth),
        northOffset: safeNumeric(parsed.northOffset, D.northOffset),
        orientation: safeString(parsed.orientation, D.orientation),
        evenColUp: safeBoolean(parsed.evenColUp, D.evenColUp),
      };
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
    calibration.value = val;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  }

  function onCalibrationLoaded(gridSpec) {
    const merged = { ...DEFAULT_CALIBRATION, ...gridSpec };
    calibration.value = merged;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
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
