import { GameStateSchema } from '../../schemas/gameState.schema.js';
import { PHASES, STEPS } from '../../constants/phases.js';
import { ActionError } from './actionError.js';
import { handleEndPhase } from './endPhase.js';
import { handleRollInitiative, handleIssueOrder } from './issueOrder.js';
import { handleActivateStack } from './activateStack.js';
import { handleEndActivation } from './endActivation.js';

export { ActionError };

// LOB §2.1 — returns the legal action candidates for playerSide in the current state.
// Each candidate is { type, payload } where payload is concrete when derivable from state,
// or null when the client must supply it at submission time. (#550)
export function getValidActions(state, playerSide) {
  if (state.status !== 'active') return [];
  if (state.activePlayer !== playerSide) return [];
  if (state.pendingResolution !== null) return [];

  const { phase, step } = state;

  // Command phase — Orders step
  if (phase === PHASES.COMMAND && step === STEPS.ORDERS) {
    // LOB §10.6 — after a successful initiative roll, only order issuance is valid.
    // Return one candidate per order type so the client can present both choices. (#550)
    const pending = state.ordersPhase?.pendingOrderIssuance;
    if (pending !== null) {
      return [
        { type: 'ISSUE_ORDER', payload: { unitId: pending.unitId, orderType: 'attack' } },
        { type: 'ISSUE_ORDER', payload: { unitId: pending.unitId, orderType: 'move' } },
      ];
    }
    // LOB §10.3 — player may roll initiative for a leader or end the step.
    // Build one ROLL_INITIATIVE candidate per eligible (on-board, not-yet-rolled) leader. (#550)
    // Falls back to a single null-payload candidate when leaderState is empty (M5 steel-thread).
    const leaderRollUsed = state.ordersPhase?.leaderRollUsed ?? {};
    const leaderEntries = Object.entries(state.leaderState ?? {});
    const eligibleLeaders = leaderEntries.filter(([id, ls]) => !leaderRollUsed[id] && ls.isOnBoard);
    // Hoisted outside flatMap — invariant across all eligible leaders.
    // LOB §10.3 — only friendly units can be targeted for initiative. UnitStateSchema does not
    // carry a side field (unit affiliation is OOB data, not game state), so side-filtering is
    // deferred to M6 when OOB data is co-located with the engine. In M5 the scenario seeds only
    // one side's units; cross-side mixing is not yet possible. See #560 for M6 tracking.
    const onBoardUnitIds = Object.keys(state.units).filter((uid) => state.units[uid].isOnBoard);
    const rollCandidates =
      eligibleLeaders.length > 0
        ? eligibleLeaders.flatMap(([leaderId]) =>
            onBoardUnitIds.map((unitId) => ({
              type: 'ROLL_INITIATIVE',
              payload: { leaderId, unitId },
            }))
          )
        : [{ type: 'ROLL_INITIATIVE', payload: null }];
    return [...rollCandidates, { type: 'END_PHASE', payload: null }];
  }

  // Activity phase — Activation step
  if (phase === PHASES.ACTIVITY && step === STEPS.ACTIVATION) {
    // LOB §3.0d — if a stack is mid-activation, only END_ACTIVATION is valid
    if (state.activityPhase?.currentActivation !== null) {
      return [{ type: 'END_ACTIVATION', payload: null }];
    }
    // Build one ACTIVATE_STACK candidate per occupied, un-activated hex. (#550)
    // Deduplicate by hex so stacked units produce a single candidate per hex.
    const activatedSet = new Set(state.activityPhase?.activatedUnits ?? []);
    const occupiedHexes = new Set(
      Object.values(state.units)
        .filter((u) => u.isOnBoard && u.hex && !activatedSet.has(u.hex))
        .map((u) => u.hex)
    );
    const activateCandidates = [...occupiedHexes].map((hex) => ({
      type: 'ACTIVATE_STACK',
      payload: { hex },
    }));
    return [...activateCandidates, { type: 'END_PHASE', payload: null }];
  }

  // Generic escape for any other interactive step
  return [{ type: 'END_PHASE', payload: null }];
}

// Map of action type → handler function. Exported so tests can manipulate entries
// (e.g. delete a key to trigger the UNKNOWN_ACTION path). Map.get() is immune to
// prototype-chain attacks since Maps don't inherit from Object.prototype. (#CodeQL)
export const ACTION_HANDLERS = new Map([
  ['END_PHASE', handleEndPhase],
  ['ROLL_INITIATIVE', handleRollInitiative],
  ['ISSUE_ORDER', handleIssueOrder],
  ['ACTIVATE_STACK', handleActivateStack],
  ['END_ACTIVATION', handleEndActivation],
]);

// Current auto-advance steps: attackRecovery, flukeStoppage, rally (3 steps, 8 gives headroom for M6+)
const MAX_AUTO_STEPS = 8;

// Phase-envelope guard: a per-phase envelope (activityPhase / ordersPhase) must not bleed into a
// phase where it does not belong. See the biconditional .refine() calls in GameStateSchema
// (server/src/schemas/gameState.schema.js) for the full bidirectional invariant enforced at the
// terminal safeParse() in dispatch(). This one-directional check fires earlier in the loop to give
// a more specific error: ordersPhase may legitimately be null mid-command (after attackRecovery /
// flukeStoppage transitions), so only the "non-null in wrong phase" direction is checked here.
// INVALID_STATE messages embed phase/step details for diagnostics; the route layer (#478)
// sanitizes these before surfacing to clients.
function assertEnvelope(value, key, expectedPhase, phase, step) {
  if (value !== null && phase !== expectedPhase) {
    throw new ActionError(
      'INVALID_STATE',
      `drainAutoSteps: ${key} is non-null outside ${expectedPhase} phase (phase='${phase}', step='${step}')`
    );
  }
}

// LOB §2.1 — advances through automatic steps until the next interactive step.
// Called by dispatch after every handler invocation.
export function drainAutoSteps(state) {
  let s = state;

  // Iteration cap guards against a future handler bug that creates a cycle in the step state machine,
  // which would otherwise block the Node event loop indefinitely (single-process Express).
  for (let i = 0; i < MAX_AUTO_STEPS; i++) {
    const { phase, step } = s;

    assertEnvelope(s.activityPhase, 'activityPhase', PHASES.ACTIVITY, phase, step);
    assertEnvelope(s.ordersPhase, 'ordersPhase', PHASES.COMMAND, phase, step);
    assertEnvelope(s.rallyPhase, 'rallyPhase', PHASES.RALLY, phase, step);

    // LOB §10.6b — Attack Recovery: auto-advance at M5 depth (no stopped orders exist yet).
    // TODO(M6): roll per stopped attack order before advancing — see LOB §10.6b recovery table.
    if (phase === PHASES.COMMAND && step === STEPS.ATTACK_RECOVERY) {
      s = {
        ...s,
        step: STEPS.FLUKE_STOPPAGE,
        completedSteps: [...s.completedSteps, STEPS.ATTACK_RECOVERY],
      };
      continue;
    }

    // LOB §10.7 — Fluke Stoppage: auto-advance at M5 depth (no active attack orders exist yet).
    // TODO(M6): roll for each accepted attack order before advancing — see LOB §10.7 stoppage table.
    if (phase === PHASES.COMMAND && step === STEPS.FLUKE_STOPPAGE) {
      s = {
        ...s,
        phase: PHASES.ACTIVITY,
        step: STEPS.ACTIVATION,
        completedSteps: [],
        activityPhase: { activatedUnits: [], currentActivation: null },
        ordersPhase: null,
        rallyPhase: null,
      };
      continue;
    }

    // LOB §2.1, §6.3 — Rally Phase: auto-advance at M5 depth (all units start normal morale).
    // TODO(M6): roll Rally for each DG/Routed unit before advancing — see LOB §6.3.
    if (phase === PHASES.RALLY && step === STEPS.RALLY) {
      const nextActivePlayer = s.activePlayer === 'union' ? 'confederate' : 'union';
      s = {
        ...s,
        turn: s.turn + 1,
        phase: PHASES.COMMAND,
        step: STEPS.ORDERS,
        completedSteps: [],
        activePlayer: nextActivePlayer,
        activityPhase: null,
        ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
        rallyPhase: null,
      };
      continue;
    }

    return s;
  }

  // Reached only if a handler bug produces a cycle in the step state machine.
  throw new ActionError(
    'DRAIN_LOOP',
    'drainAutoSteps exceeded maximum iterations — state machine cycle detected'
  );
}

// Pure reducer: validate → route → drain → validate output state.
// action: { type: string, payload: object|null, playerSide: 'union'|'confederate' }
export function dispatch(state, action) {
  const { type, payload, playerSide } = action;

  // LOB §2.1 — explicit side check before getValidActions so the error is unambiguous whose-turn message.
  // Skipped during setup (activePlayer === null) where no player is designated active.
  // getValidActions() also returns [] for the wrong side (defense-in-depth), but this guard owns the
  // public error contract. Callers must source playerSide from the authenticated session, never from
  // the request body — the route layer is responsible for that mapping.
  if (state.activePlayer !== null && playerSide !== state.activePlayer) {
    throw new ActionError(
      'INVALID_ACTION',
      `It is ${state.activePlayer}'s turn, not ${playerSide}'s`
    );
  }

  const validActions = getValidActions(state, playerSide);
  // Type-only gate — payload is NOT validated here. The candidate list in getValidActions is
  // informational for the UI (which concrete moves are available); each handler re-validates
  // its own payload against state independently. (#550 review M1)
  if (!validActions.some((a) => a.type === type)) {
    throw new ActionError('INVALID_ACTION', `Action '${type}' is not valid in the current state`);
  }

  // Map.get() is safe for user-controlled keys: Maps have no prototype chain, so
  // '__proto__' or 'constructor' can never reach Object.prototype methods. (#CodeQL)
  const handler = ACTION_HANDLERS.get(type);
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
