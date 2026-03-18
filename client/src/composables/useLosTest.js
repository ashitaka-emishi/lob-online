import { ref, computed } from 'vue';

/**
 * LOS (line-of-sight) test state and hex pick logic.
 *
 * Extracted from useHexInteraction so LOS concerns live in one place.
 * Call tryPickLosHex(hexId) inside click handlers — returns true if the click
 * was consumed by an in-progress LOS pick, false otherwise.
 *
 * @param {object} [args]
 * @param {function} [args.onLosPanelOpen] - called when a hex is picked, to open the LOS panel
 */
export function useLosTest({ onLosPanelOpen } = {}) {
  const losHexA = ref(null);
  const losHexB = ref(null);
  const losSelectingHex = ref(null); // 'A' | 'B' | null
  const losResult = ref(null);

  const losPathHexes = computed(() => {
    if (!losResult.value) return [];
    return losResult.value.steps.filter((s) => s.role === 'intermediate').map((s) => s.hexId);
  });

  const losBlockedHex = computed(() => {
    if (!losResult.value) return null;
    return losResult.value.steps.find((s) => s.blocked)?.hexId ?? null;
  });

  // Returns true if the click was consumed by an active LOS pick, false otherwise.
  function tryPickLosHex(hexId) {
    if (losSelectingHex.value === 'A') {
      losHexA.value = hexId;
      losSelectingHex.value = null;
      onLosPanelOpen?.();
      return true;
    }
    if (losSelectingHex.value === 'B') {
      losHexB.value = hexId;
      losSelectingHex.value = null;
      onLosPanelOpen?.();
      return true;
    }
    return false;
  }

  function onLosPickStart(side) {
    losSelectingHex.value = side;
  }
  function onLosPickCancel() {
    losSelectingHex.value = null;
  }
  function onLosSetHexA(id) {
    losHexA.value = id;
  }
  function onLosSetHexB(id) {
    losHexB.value = id;
  }
  function onLosResult(r) {
    losResult.value = r;
  }

  return {
    losHexA,
    losHexB,
    losSelectingHex,
    losResult,
    losPathHexes,
    losBlockedHex,
    tryPickLosHex,
    onLosPickStart,
    onLosPickCancel,
    onLosSetHexA,
    onLosSetHexB,
    onLosResult,
  };
}
