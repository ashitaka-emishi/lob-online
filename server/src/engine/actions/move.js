import { ActionError } from './actionError.js';
import { pathCost } from '../movement.js';
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

// LOB §3 — no legal move can visit more hexes than a unit has MPs; 50 is a safe ceiling.
const MAX_PATH_HEXES = 50;

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

  // Guard: path length cap — prevents DoS via arbitrarily long path arrays (M1)
  if (path.length > MAX_PATH_HEXES) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `MOVE: path length ${path.length} exceeds maximum of ${MAX_PATH_HEXES} hexes`
    );
  }

  // Guard: unitId must exist in state
  const unit = state.units[unitId];
  if (!unit) {
    throw new ActionError('INVALID_PAYLOAD', `MOVE: unit '${unitId}' not found in state`);
  }

  // Guard: unit must be in the activated roster (allows partial moves — LOB §3.0d)
  if (!activation.activatedUnitIds.includes(unitId)) {
    throw new ActionError(
      'INVALID_ACTION',
      `MOVE: unit '${unitId}' was not in the activated stack (LOB §3.0d)`
    );
  }

  // Guard: §3.0d — once unit A's move sequence is interrupted by unit B moving, A cannot resume.
  // movedUnitIds tracks all units that have moved; lastMovedUnitId is the unit currently active.
  const { lastMovedUnitId, movedUnitIds = [] } = activation;
  if (movedUnitIds.includes(unitId) && lastMovedUnitId !== unitId) {
    throw new ActionError(
      'INVALID_ACTION',
      `MOVE: unit '${unitId}' cannot resume movement after another unit moved (LOB §3.0d)`
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

  // LOB §3.0 — validate path and compute cost from the submitted hex sequence.
  // pathCost charges the hexes the unit actually enters, not the Dijkstra optimal (#675).
  if (!ctx.scenario || !ctx.mapData) {
    throw new ActionError('INVALID_ACTION', 'MOVE requires scenario and mapData in ctx');
  }

  // ctx.hexIndex is pre-built by the route layer; passing it avoids rebuilding the ~2.3k-hex index per call.
  const pathResult = pathCost(path, formation, ctx.scenario, ctx.mapData, ctx.hexIndex);

  if (pathResult === Infinity) {
    throw new ActionError(
      'INVALID_MOVE',
      `Path to '${destination}' is impassable or contains non-adjacent hexes`
    );
  }

  // LOB §3.0c — one-hex move guarantee: on its first move of the activation, a unit with MPs
  // remaining can always enter one hex regardless of terrain cost. Impassable hexsides and
  // non-adjacent hex pairs are excluded (already caught by Infinity check above).
  const isFirstMove = !movedUnitIds.includes(unitId);
  const oneHexGuaranteeApplies = isFirstMove && path.length === 2 && unit.remainingMPs > 0;

  // LOB §3.0 — guard: path cost must not exceed remaining MPs (§3.0c is the only exception)
  if (pathResult > unit.remainingMPs && !oneHexGuaranteeApplies) {
    throw new ActionError(
      'INSUFFICIENT_MPS',
      `Move to '${destination}' costs ${pathResult} MPs but unit has ${unit.remainingMPs}`
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

  // Produce updated unit with new position and decremented MPs (immutable spread).
  // LOB §3.0c — clamp to 0: when the one-hex guarantee applies, cost may exceed remainingMPs.
  const movedUnit = {
    ...unit,
    hex: destination,
    remainingMPs: Math.max(0, unit.remainingMPs - pathResult),
  };

  return {
    ...state,
    units: { ...state.units, [unitId]: movedUnit },
    hexControl: updatedHexControl,
    activityPhase: {
      ...state.activityPhase,
      currentActivation: {
        ...activation,
        // LOB §5.4 — mark this activation as having included a move (enables Opening Volley on fire)
        movedThisActivation: true,
        // LOB §3.0d — track which unit is currently mid-move-sequence
        lastMovedUnitId: unitId,
        // LOB §3 / §3.0c — record that this unit has moved (for §3.0c and §3.0d enforcement)
        movedUnitIds: movedUnitIds.includes(unitId) ? movedUnitIds : [...movedUnitIds, unitId],
      },
    },
  };
}
