import { ActionError } from './actionError.js';
import { rallyRollResult } from '../tables/rally.js';

/**
 * RALLY_ROLL action handler.
 *
 * LOB §6.4 step 3 — resolve an individual rally roll for a routed unit.
 * The player supplies a 1d6 die roll and optionally a leader Morale Value
 * for a leader in the unit's hex. Modified total ≥ 5 → unit recovers to
 * Disorganized. Otherwise the unit remains Routed.
 *
 * Payload: { unitId: string, die: number (1–6), leaderMoraleValue?: number }
 *
 * Precondition: state.rallyPhase.pendingRallyRoll.unitIds contains unitId.
 *
 * After each RALLY_ROLL, the resolved unitId is removed from pendingRallyRoll.
 * When the list empties, pendingRallyRoll is set to null (drainAutoSteps will
 * then advance the turn).
 */
export function handleRallyRoll(state, action) {
  // LOB §6.4 step 3 — only valid during Rally Phase with pending rally rolls
  if (state.phase !== 'rally') {
    throw new ActionError('INVALID_ACTION', 'RALLY_ROLL is only valid during the Rally Phase');
  }
  if (!state.rallyPhase?.pendingRallyRoll) {
    throw new ActionError(
      'INVALID_ACTION',
      'RALLY_ROLL is only valid when pendingRallyRoll is set (no pending rally rolls)'
    );
  }

  const { unitId, die, leaderMoraleValue = 0 } = action.payload ?? {};

  if (!unitId || typeof unitId !== 'string') {
    throw new ActionError('INVALID_PAYLOAD', 'RALLY_ROLL requires unitId');
  }
  if (!Number.isInteger(die) || die < 1 || die > 6) {
    throw new ActionError('INVALID_PAYLOAD', 'RALLY_ROLL die must be an integer 1–6');
  }
  if (!Number.isInteger(leaderMoraleValue) || leaderMoraleValue < 0) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      'RALLY_ROLL leaderMoraleValue must be a non-negative integer'
    );
  }

  const { unitIds } = state.rallyPhase.pendingRallyRoll;

  // LOB §6.4 step 3 — unitId must be in the pending list
  if (!unitIds.includes(unitId)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not in the pending rally roll list (LOB §6.4 step 3)`
    );
  }

  const unit = state.units[unitId];
  if (!unit || !unit.isOnBoard) {
    throw new ActionError('INVALID_ACTION', `Unit '${unitId}' is not on board`);
  }
  // LOB §6.4 step 3 — only routed units make a rally roll
  if (unit.moraleState !== 'routed') {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not routed (moraleState='${unit.moraleState}'); only routed units roll (LOB §6.4 step 3)`
    );
  }

  // LOB §6.4 step 3 — roll result
  const { success, newMoraleState } = rallyRollResult(die, leaderMoraleValue);

  // Apply result: update unit moraleState only if rally succeeded
  const updatedUnit = success ? { ...unit, moraleState: newMoraleState } : unit;
  const updatedUnits = { ...state.units, [unitId]: updatedUnit };

  // Remove resolved unit from the pending list
  const remainingUnitIds = unitIds.filter((id) => id !== unitId);
  const updatedPendingRallyRoll =
    remainingUnitIds.length > 0 ? { unitIds: remainingUnitIds } : null;

  return {
    ...state,
    units: updatedUnits,
    rallyPhase: {
      ...state.rallyPhase,
      pendingRallyRoll: updatedPendingRallyRoll,
    },
  };
}
