import { ActionError } from './actionError.js';
import { loadOob, findOobUnit } from '../oob.js';

// LOB §3 — resolve movement allowance for a unit from scenario movementAllowances.
// Artillery formation state determines whether the unit can move at all.
function resolveUnitMPs(unit, oobUnit, movementAllowances) {
  // Artillery: unlimbered batteries cannot move (LOB §3.6)
  if (unit.formation === 'unlimbered') return 0;
  if (unit.formation === 'limbered') return movementAllowances.limbered ?? 0;

  const type = oobUnit?.type;
  if (type === 'cavalry') return movementAllowances.mounted ?? 0;
  if (type === 'leader') return movementAllowances.leader ?? 0;
  // Default: infantry (line formation)
  return movementAllowances.line ?? 0;
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
    const unitsInHex = Object.values(state.units).filter((u) => u.isOnBoard && u.hex === hex);
    if (unitsInHex.length > 0) {
      updatedUnits = { ...state.units };
      for (const unit of unitsInHex) {
        const oobUnit = loadedOob ? findOobUnit(loadedOob, unit.id) : null;
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
