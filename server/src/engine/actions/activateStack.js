import { ActionError } from './actionError.js';

// LOB §3.0d — activate one stack at a time; movement and combat stubs for M5.
// payload: { hex: string }
export function handleActivateStack(state, action) {
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
      `Stack at '${activity.currentActivation}' is already mid-activation (LOB §3.0d)`
    );
  }

  if (activity.activatedUnits.includes(hex)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Stack at hex '${hex}' has already been activated this phase`
    );
  }

  // M5 stub: record the activation in progress; movement/combat resolved in M6
  return {
    ...state,
    activityPhase: {
      ...activity,
      currentActivation: hex,
    },
  };
}
