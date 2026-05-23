/**
 * Shared test fixtures for client-side unit tests.
 *
 * _WIRE fixtures match the API wire format (pre-sanitize): they omit the six fields
 * that sanitizeCalibration fills from DEFAULT_CALIBRATION (dx, dy, strokeWidth,
 * orientation, evenColUp, northOffset). Assertions against post-sanitize state must
 * use toMatchObject or { ...DEFAULT_CALIBRATION, ...STUB_GRID_SPEC_WIRE } with
 * toEqual — not toEqual(STUB_GRID_SPEC_WIRE).
 */

// South Mountain map scale — matches the real SM scenario dimensions.
export const STUB_GRID_SPEC_WIRE = {
  cols: 64,
  rows: 35,
  hexWidth: 40.5,
  hexHeight: 40.7,
  imageScale: 1,
};

// Minimal grid — used where a small, fast-to-reason-about grid is sufficient.
export const STUB_GRID_SPEC_MINI_WIRE = {
  cols: 4,
  rows: 3,
  hexWidth: 20,
  hexHeight: 20,
  imageScale: 1,
};
