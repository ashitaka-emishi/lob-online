import { ActionError } from './actionError.js';
import { movementPath } from '../movement.js';
import { findOobUnit, buildUnitSideMap } from '../oob.js';
import { updateHexControl } from '../vp.js';

// LOB §3 — resolve the movement-table formation key for a unit.
// Returns null for unlimbered artillery (cannot move per LOB §3.6a).
function resolveMovementFormation(unit, oobUnit) {
  if (unit.formation === 'unlimbered') return null;
  if (unit.formation === 'limbered') return 'limbered';
  const type = oobUnit?.type;
  if (type === 'cavalry') return 'mounted';
  if (type === 'leader') return 'leader';
  return 'line'; // infantry default
}

// LOB §3 / SM §5.1 — MOVE action handler.
// payload: { unitId: string, path: string[] } — full hex path from current position to destination.
// ctx: { scenario, mapData, oob? } — injected by dispatch; scenario and mapData required for cost validation.
export function resolveMove(state, action, ctx = {}) {
  const { payload, playerSide } = action;
  const { unitId, path } = payload ?? {};

  // Guard: activation must be in progress (MOVE only valid mid-activation)
  const activation = state.activityPhase?.currentActivation;
  if (!activation) {
    throw new ActionError('INVALID_ACTION', 'MOVE is only valid when a stack is mid-activation');
  }

  // Guard: path must have at least two hexes (start + destination)
  if (!Array.isArray(path) || path.length < 2) {
    throw new ActionError('INVALID_PAYLOAD', 'MOVE payload.path must contain at least two hexes');
  }

  // Guard: unitId must exist in state
  const unit = state.units[unitId];
  if (!unit) {
    throw new ActionError('INVALID_PAYLOAD', `MOVE: unit '${unitId}' not found in state`);
  }

  // Guard: unit must be in the active stack hex (checked before path validation)
  if (unit.hex !== activation.hex) {
    throw new ActionError(
      'INVALID_ACTION',
      `MOVE: unit '${unitId}' is not in the active stack hex '${activation.hex}'`
    );
  }

  // Guard: path must start at unit's current hex
  if (path[0] !== unit.hex) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `MOVE: path[0] '${path[0]}' does not match unit hex '${unit.hex}'`
    );
  }

  // Guard: unit must have remaining MPs
  if ((unit.remainingMPs ?? 0) <= 0) {
    throw new ActionError('INSUFFICIENT_MPS', `Unit '${unitId}' has no remaining movement points`);
  }

  const destination = path[path.length - 1];

  // Resolve OOB unit for formation and VP eligibility checks
  const oobUnit = (() => {
    try {
      return ctx.oob ? findOobUnit(ctx.oob, unitId) : null;
    } catch {
      return null;
    }
  })();

  // LOB §3 — verify the moving unit belongs to the acting player (mirror combat handler pattern).
  // Skipped when ctx.oob is absent (test-stub environments without OOB injection).
  if (ctx.oob) {
    const unitSideMap = buildUnitSideMap(ctx.oob);
    const unitInfo = unitSideMap.get(unitId);
    if (unitInfo && unitInfo.side !== playerSide) {
      throw new ActionError(
        'INVALID_ACTION',
        `Player '${playerSide}' cannot move ${unitInfo.side} units (LOB §3)`
      );
    }
  }

  const formation = resolveMovementFormation(unit, oobUnit);

  // LOB §3.6a — unlimbered artillery has no movement allowance; formation === null signals this.
  if (formation === null) {
    throw new ActionError(
      'INVALID_MOVE',
      `Unit '${unitId}' cannot move: unlimbered artillery has no movement allowance (LOB §3.6a)`
    );
  }

  // LOB §3 — validate path reachability and compute cost via movement engine.
  // movementPath computes the optimal path; totalCost is the authoritative MP cost to destination.
  if (!ctx.scenario || !ctx.mapData) {
    throw new ActionError('INVALID_ACTION', 'MOVE requires scenario and mapData in ctx');
  }

  // ctx.hexIndex is pre-built by the route layer; passing it avoids rebuilding the 2240-hex index per call.
  const pathResult = movementPath(
    unit.hex,
    destination,
    formation,
    ctx.scenario,
    ctx.mapData,
    ctx.hexIndex
  );

  if (pathResult.impassable || pathResult.totalCost === Infinity) {
    throw new ActionError(
      'INVALID_MOVE',
      `Destination '${destination}' is not reachable from '${unit.hex}'`
    );
  }

  // LOB §3 — guard: path cost must not exceed remaining MPs
  if (pathResult.totalCost > unit.remainingMPs) {
    throw new ActionError(
      'INSUFFICIENT_MPS',
      `Move to '${destination}' costs ${pathResult.totalCost} MPs but unit has ${unit.remainingMPs}`
    );
  }

  // SM §5.1 — update hex control for VP hexes the unit moves through.
  // updateHexControl returns unchanged hexControl when destination is not a VP hex.
  const vpHexSet = new Set((ctx.scenario.victoryPoints?.terrain ?? []).map((e) => e.hex));
  const updatedHexControl = updateHexControl(
    state.hexControl,
    destination,
    playerSide,
    unit,
    oobUnit,
    vpHexSet
  );

  // Produce updated unit with new position and decremented MPs (immutable spread)
  const movedUnit = {
    ...unit,
    hex: destination,
    remainingMPs: unit.remainingMPs - pathResult.totalCost,
  };

  return {
    ...state,
    units: { ...state.units, [unitId]: movedUnit },
    hexControl: updatedHexControl,
    // LOB §5.4 — mark this activation as having included a move (enables Opening Volley on fire)
    activityPhase: {
      ...state.activityPhase,
      currentActivation: { ...activation, movedThisActivation: true },
    },
  };
}
