import { GameStateSchema } from '../../schemas/gameState.schema.js';
import { ActionError } from './actionError.js';
import { handleEndPhase } from './endPhase.js';
import { handleRollInitiative, handleIssueOrder } from './issueOrder.js';
import { handleActivateStack } from './activateStack.js';
import { handleEndActivation } from './endActivation.js';

export { ActionError };

// LOB §2.1 — returns the legal action types for playerSide in the current state.
// payload is null for all returned entries; handlers validate specific payloads.
export function getValidActions(state, playerSide) {
  if (state.status !== 'active') return [];
  if (state.activePlayer !== playerSide) return [];
  if (state.pendingResolution !== null) return [];

  const { phase, step } = state;

  // Command phase — Orders step
  if (phase === 'command' && step === 'orders') {
    // LOB §10.6 — after a successful initiative roll, only order issuance is valid
    if (state.ordersPhase?.pendingOrderIssuance !== null) {
      return [{ type: 'ISSUE_ORDER', payload: null }];
    }
    // LOB §10.3 — player may roll initiative for a leader or end the step
    return [
      { type: 'ROLL_INITIATIVE', payload: null },
      { type: 'END_PHASE', payload: null },
    ];
  }

  // Activity phase — Activation step
  if (phase === 'activity' && step === 'activation') {
    // LOB §3.0d — if a stack is mid-activation, only END_ACTIVATION is valid
    if (state.activityPhase?.currentActivation !== null) {
      return [{ type: 'END_ACTIVATION', payload: null }];
    }
    return [
      { type: 'ACTIVATE_STACK', payload: null },
      { type: 'END_PHASE', payload: null },
    ];
  }

  // Generic escape for any other interactive step
  return [{ type: 'END_PHASE', payload: null }];
}

const HANDLERS = {
  END_PHASE: handleEndPhase,
  ROLL_INITIATIVE: handleRollInitiative,
  ISSUE_ORDER: handleIssueOrder,
  ACTIVATE_STACK: handleActivateStack,
  END_ACTIVATION: handleEndActivation,
};

// LOB §2.1 — advances through automatic steps until the next interactive step.
// Called by dispatch after every handler invocation.
export function drainAutoSteps(state) {
  let s = state;

  while (true) {
    const { phase, step } = s;

    // LOB §10.6b — Attack Recovery: automatic at M5 depth (no stopped orders in initial state)
    if (phase === 'command' && step === 'attackRecovery') {
      s = { ...s, step: 'flukeStoppage', completedSteps: [...s.completedSteps, 'attackRecovery'] };
      continue;
    }

    // LOB §10.7 — Fluke Stoppage: automatic at M5 depth (no active attack orders to roll for)
    if (phase === 'command' && step === 'flukeStoppage') {
      s = {
        ...s,
        phase: 'activity',
        step: 'activation',
        completedSteps: [],
        activityPhase: { activatedUnits: [], currentActivation: null },
        ordersPhase: null,
      };
      continue;
    }

    // LOB §2.1 — Rally Phase is an auto-drain pass-through in M5 (all units start normal morale)
    if (phase === 'rally' && step === 'rally') {
      const nextActivePlayer = s.activePlayer === 'union' ? 'confederate' : 'union';
      s = {
        ...s,
        turn: s.turn + 1,
        phase: 'command',
        step: 'orders',
        completedSteps: [],
        activePlayer: nextActivePlayer,
        activityPhase: null,
        ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
      };
      continue;
    }

    break;
  }

  return s;
}

// Pure reducer: validate → route → drain → validate output state.
// action: { type: string, payload: object|null, playerSide: 'union'|'confederate' }
export function dispatch(state, action) {
  const { type, payload, playerSide } = action;

  const validActions = getValidActions(state, playerSide);
  if (!validActions.some((a) => a.type === type)) {
    throw new ActionError('INVALID_ACTION', `Action '${type}' is not valid in the current state`);
  }

  const handler = HANDLERS[type];
  if (!handler) {
    throw new ActionError('UNKNOWN_ACTION', `No handler registered for action type '${type}'`);
  }

  const nextState = handler(state, { type, payload, playerSide });
  const drainedState = drainAutoSteps(nextState);

  const parsed = GameStateSchema.safeParse(drainedState);
  if (!parsed.success) {
    throw new ActionError('INVALID_STATE', parsed.error.message);
  }

  return parsed.data;
}
