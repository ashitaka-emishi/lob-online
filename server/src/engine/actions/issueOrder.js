import { ActionError } from './actionError.js';

// LOB §10.6 — Command Roll: one roll per leader per turn; marks the leader as rolled.
// M5 steel-thread: the roll always succeeds, setting pendingOrderIssuance for ISSUE_ORDER.
// The caller (HTTP route) supplies the diceResult; the reducer records the transition only.
// payload: { leaderId: string, unitId: string, diceResult: number }
export function handleRollInitiative(state, action) {
  const { leaderId, unitId } = action.payload ?? {};
  if (!leaderId || !unitId) {
    throw new ActionError('INVALID_PAYLOAD', 'ROLL_INITIATIVE requires leaderId and unitId');
  }

  const leaderRollUsed = state.ordersPhase?.leaderRollUsed ?? {};
  if (leaderRollUsed[leaderId]) {
    throw new ActionError(
      'INVALID_ACTION',
      `Leader '${leaderId}' has already rolled initiative this turn (LOB §10.6)`
    );
  }

  // M5 steel-thread: roll always succeeds → pendingOrderIssuance is set immediately
  return {
    ...state,
    ordersPhase: {
      ...state.ordersPhase,
      leaderRollUsed: { ...leaderRollUsed, [leaderId]: true },
      pendingOrderIssuance: { leaderId, unitId },
    },
  };
}

// LOB §10.4a–b — assigns an accepted order to the target unit after a successful Command Roll.
// payload: { unitId: string, orderType: 'attack' | 'move' }
export function handleIssueOrder(state, action) {
  const { unitId, orderType } = action.payload ?? {};
  if (!unitId || !orderType) {
    throw new ActionError('INVALID_PAYLOAD', 'ISSUE_ORDER requires unitId and orderType');
  }

  const pending = state.ordersPhase?.pendingOrderIssuance;
  if (!pending) {
    throw new ActionError(
      'INVALID_ACTION',
      'ISSUE_ORDER requires a preceding successful ROLL_INITIATIVE'
    );
  }

  if (pending.unitId !== unitId) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `ISSUE_ORDER unitId '${unitId}' does not match pending initiative target '${pending.unitId}'`
    );
  }

  const unit = state.units[unitId];
  if (!unit) {
    throw new ActionError('INVALID_PAYLOAD', `Unit '${unitId}' not found in game state`);
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        // LOB §10.6 — newly issued order is accepted (no delay pipeline at M5 depth)
        orders: { type: orderType, status: 'accepted', deliveryTurnDue: null },
      },
    },
    ordersPhase: {
      ...state.ordersPhase,
      pendingOrderIssuance: null,
    },
  };
}
