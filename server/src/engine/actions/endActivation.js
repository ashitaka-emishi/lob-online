import { ActionError } from './actionError.js';

// LOB §3.0d — completes the current stack's activation, freeing the next stack to activate.
// M5 stub: no movement or combat to resolve; just records the activation as complete.
export function handleEndActivation(state, _action) {
  const activity = state.activityPhase;
  if (!activity) {
    throw new ActionError(
      'INVALID_ACTION',
      'END_ACTIVATION is only valid during the Activity Phase'
    );
  }

  if (activity.currentActivation === null) {
    throw new ActionError('INVALID_ACTION', 'No stack is currently mid-activation');
  }

  const completedHex = activity.currentActivation;

  return {
    ...state,
    activityPhase: {
      activatedUnits: [...activity.activatedUnits, completedHex],
      currentActivation: null,
    },
  };
}
