/**
 * Client-side shape validators for OOB editor data files.
 *
 * These validators are intentionally minimal — they check structural shape, not
 * field-level correctness (which the server Zod schemas handle). They exist to
 * distinguish valid drafts from corrupted localStorage or unrecognised server
 * responses before assigning to application state.
 *
 * Keep these in sync with the server schemas. The cross-layer contract is verified
 * by server/src/schemas/oob-client-contract.test.js (#257).
 */

/**
 * Validates that `data` has the sided-object shape used by oob.json and leaders.json:
 *   { union: { ... }, confederate: { ... } }
 * Both sides must be non-null, non-array objects.
 *
 * @param {unknown} data
 * @returns {boolean}
 */
export function isValidSidedObjectShape(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    data.union !== null &&
    typeof data.union === 'object' &&
    !Array.isArray(data.union) &&
    data.confederate !== null &&
    typeof data.confederate === 'object' &&
    !Array.isArray(data.confederate)
  );
}

/**
 * Validates that `data` has the sided-array shape used by succession.json:
 *   { union: [...], confederate: [...] }
 * Both sides must be arrays.
 *
 * @param {unknown} data
 * @returns {boolean}
 */
export function isValidSuccessionShape(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.union) &&
    Array.isArray(data.confederate)
  );
}
