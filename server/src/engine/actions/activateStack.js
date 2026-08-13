import { ActionError } from './actionError.js';
import { resolveMovementFormationKey } from './formation.js';
import { loadOob, safeFindOobUnit } from '../oob.js';

// LOB §3 — resolve movement allowance for a unit from scenario movementAllowances.
// Artillery formation state determines whether the unit can move at all. The 'unlimbered'
// sentinel from resolveMovementFormationKey (#677) maps to 0 MP here — this call site's
// "cannot move" behavior is a zero allowance, not a thrown error (compare move.js's
// null-then-throw).
function resolveUnitMPs(unit, oobUnit, movementAllowances) {
  const key = resolveMovementFormationKey(unit, oobUnit);
  if (key === 'unlimbered') return 0;
  return movementAllowances[key] ?? 0;
}

// LOB §3.0d — activate one stack at a time; movement and combat stubs for M5.
// payload: { hex: string }
export function handleActivateStack(state, action, ctx = {}) {
  const { hex } = action.payload ?? {};
  if (!hex) {
    throw new ActionError('INVALID_PAYLOAD', 'ACTIVATE_STACK requires a hex');
  }

  const activity = state.activityPhase;
  if (!activity) {
    throw new ActionError(
      'INVALID_ACTION',
      'ACTIVATE_STACK is only valid during the Activity Phase'
    );
  }

  // LOB §3.0d — one stack must complete activity before another starts
  if (activity.currentActivation !== null) {
    throw new ActionError(
      'INVALID_ACTION',
      `Stack at '${activity.currentActivation.hex}' is already mid-activation (LOB §3.0d)`
    );
  }

  if (activity.activatedUnits.includes(hex)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Stack at hex '${hex}' has already been activated this phase`
    );
  }

  // LOB §3 — always compute the activated roster so resolveMove can check membership.
  // Must be outside the movementAllowances guard: if nested inside, test-stub environments
  // (no scenario) emit an empty roster and every subsequent MOVE is rejected (#680).
  const unitsInHex = Object.values(state.units).filter((u) => u.isOnBoard && u.hex === hex);

  // LOB §3 — initialize remainingMPs for each unit in the activated hex.
  // Allowances come from scenario.movementCosts.movementAllowances; absent in test stubs → skip.
  const movementAllowances = ctx.scenario?.movementCosts?.movementAllowances;
  let updatedUnits = state.units;
  if (movementAllowances) {
    const loadedOob = (() => {
      try {
        return ctx.oob ?? loadOob();
      } catch {
        return null;
      }
    })();
    if (unitsInHex.length > 0) {
      updatedUnits = { ...state.units };
      for (const unit of unitsInHex) {
        // #681 — safeFindOobUnit(oob, unitId) replaces the equivalent inline null-check;
        // was missed in the initial #681 pass since it wasn't wrapped in a try/catch IIFE
        // like the other three sites, but it's the same per-unit-lookup duplication.
        const oobUnit = safeFindOobUnit(loadedOob, unit.id);
        const mps = resolveUnitMPs(unit, oobUnit, movementAllowances);
        updatedUnits[unit.id] = { ...unit, remainingMPs: mps };
      }
    }
  }

  // LOB §3.0d — record the activation context; fire/move state tracked here through the activation
  return {
    ...state,
    units: updatedUnits,
    activityPhase: {
      ...activity,
      currentActivation: {
        hex,
        // LOB §3 — activation-time snapshot (not a live set); enables roster-membership check in resolveMove
        activatedUnitIds: unitsInHex.map((u) => u.id),
        // LOB §3.0d — unit currently mid-move-sequence; null until first MOVE this activation
        lastMovedUnitId: null,
        // LOB §3 / §3.0c — all units that have made ≥1 MOVE; used for §3.0c one-hex guarantee
        movedUnitIds: [],
        // LOB §5.4 — tracks whether this activation included a Move action (Opening Volley trigger)
        movedThisActivation: false,
        // LOB §5.4 — set to true when Opening Volley fires this activation
        openingVolley: false,
        // LOB §9.1e — set to true when Zero Rule MA roll produces a zero result
        zeroRuleFired: false,
      },
    },
  };
}
