// Re-export from the canonical compass module.
// This shim exists so CalibrationControls can import from utils/ while the
// implementation lives alongside the other formula modules in formulas/.
export { compassLabel } from '../formulas/compass.js';
