import { ref } from 'vue';

/**
 * Single-click edge placement with validation. Right-click removes.
 * Used by: Road (bridge), Stream & Stone Wall (ford).
 *
 * @param {object} options
 * @param {Function} options.validateFn  - `(hexId, faceIndex) => { valid, reason }` — called before placing
 * @param {Function} options.onPlace     - `(hexId, faceIndex) => void`
 * @param {Function} options.onRemove    - `(hexId, faceIndex) => void`
 * @returns {{ onEdgeClick, onEdgeRightClick, validationError }}
 */
export function useClickHexside({ validateFn, onPlace, onRemove }) {
  const validationError = ref('');

  function onEdgeClick(hexId, faceIndex) {
    const { valid, reason } = validateFn(hexId, faceIndex);
    if (!valid) {
      validationError.value = reason ?? '';
      return;
    }
    validationError.value = '';
    onPlace(hexId, faceIndex);
  }

  function onEdgeRightClick(hexId, faceIndex) {
    validationError.value = '';
    onRemove(hexId, faceIndex);
  }

  return { onEdgeClick, onEdgeRightClick, validationError };
}
