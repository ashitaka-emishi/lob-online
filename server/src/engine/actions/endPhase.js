import { PHASES, STEPS } from '../../constants/phases.js';
import { ActionError } from './actionError.js';

// LOB §2.1 — END_PHASE advances the turn sequence from the current interactive step.
// drainAutoSteps() in index.js handles all subsequent automatic steps.
export function handleEndPhase(state, _action) {
  const { phase, step } = state;

  // Command phase → end Orders step; drainAutoSteps handles attackRecovery → flukeStoppage → activity
  if (phase === PHASES.COMMAND && step === STEPS.ORDERS) {
    return {
      ...state,
      step: STEPS.ATTACK_RECOVERY,
      completedSteps: [...state.completedSteps, STEPS.ORDERS],
      ordersPhase: null,
    };
  }

  // Activity phase → end a player's activation turn (LOB §2.1 — activity ends per player)
  if (phase === PHASES.ACTIVITY && step === STEPS.ACTIVATION) {
    // LOB §3.0d — cannot end phase while a stack is mid-activation
    if (state.activityPhase?.currentActivation !== null) {
      throw new ActionError(
        'INVALID_ACTION',
        'Cannot end the activation phase while a stack is mid-activation'
      );
    }

    const currentSide = state.activePlayer;
    const otherSide = currentSide === 'union' ? 'confederate' : 'union';
    const doneKey = `activation-${currentSide}`;
    const updatedCompleted = [...state.completedSteps, doneKey];

    // Check whether the other player has already had their activation this turn
    const otherKey = `activation-${otherSide}`;
    const bothDone = updatedCompleted.includes(otherKey);

    if (bothDone) {
      // LOB §2.1 — both players completed their activation → Rally Phase.
      // We set activePlayer to otherSide (the turn's original FIRST player) here so that
      // drainAutoSteps' Rally branch (index.js) flips it to the other side, producing the
      // correct next-turn first player. Both files must be edited together if this invariant changes.
      return {
        ...state,
        phase: PHASES.RALLY,
        step: STEPS.RALLY,
        completedSteps: [],
        activePlayer: otherSide,
        activityPhase: null,
        ordersPhase: null,
      };
    }

    // LOB §2.1 — first player done → second player gets their activation
    return {
      ...state,
      completedSteps: updatedCompleted,
      activePlayer: otherSide,
      activityPhase: { activatedUnits: [], currentActivation: null },
    };
  }

  throw new ActionError(
    'INVALID_ACTION',
    `END_PHASE is not valid in phase '${phase}', step '${step}'`
  );
}
