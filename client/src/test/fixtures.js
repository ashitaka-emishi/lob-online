/**
 * Shared test fixtures for client-side unit tests.
 */

// South Mountain map scale — matches the real SM scenario dimensions.
export const STUB_GRID_SPEC = {
  cols: 64,
  rows: 35,
  hexWidth: 40.5,
  hexHeight: 40.7,
  imageScale: 1,
};

// Minimal grid — used where a small, fast-to-reason-about grid is sufficient.
export const STUB_GRID_SPEC_MINI = {
  cols: 4,
  rows: 3,
  hexWidth: 20,
  hexHeight: 20,
  imageScale: 1,
};
