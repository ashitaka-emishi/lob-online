const VALID_ORIENTATIONS = ['flat', 'pointy'];

export const DEFAULT_CALIBRATION = {
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

/**
 * Sanitises a raw calibration object against DEFAULT_CALIBRATION.
 * Rejects NaN/Infinity numerics, non-boolean booleans, and invalid orientation
 * strings, falling back to the default value for each field. Unknown keys are
 * dropped; known optional extension fields (rotation, locked) are type-checked
 * and included only when present.
 */
export function sanitizeCalibration(raw) {
  const safeNumeric = (val, fallback) => (Number.isFinite(val) ? val : fallback);
  const safeBoolean = (val, fallback) => (typeof val === 'boolean' ? val : fallback);
  const safeOrientation = (val, fallback) => (VALID_ORIENTATIONS.includes(val) ? val : fallback);
  const D = DEFAULT_CALIBRATION;
  const result = {
    cols: safeNumeric(raw.cols, D.cols),
    rows: safeNumeric(raw.rows, D.rows),
    dx: safeNumeric(raw.dx, D.dx),
    dy: safeNumeric(raw.dy, D.dy),
    hexWidth: safeNumeric(raw.hexWidth, D.hexWidth),
    hexHeight: safeNumeric(raw.hexHeight, D.hexHeight),
    imageScale: safeNumeric(raw.imageScale, D.imageScale),
    strokeWidth: safeNumeric(raw.strokeWidth, D.strokeWidth),
    northOffset: safeNumeric(raw.northOffset, D.northOffset),
    orientation: safeOrientation(raw.orientation, D.orientation),
    evenColUp: safeBoolean(raw.evenColUp, D.evenColUp),
  };
  if (raw.rotation !== undefined) result.rotation = safeNumeric(raw.rotation, 0);
  if (raw.locked !== undefined) result.locked = safeBoolean(raw.locked, false);
  return result;
}
