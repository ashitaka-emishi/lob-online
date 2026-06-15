import { GameStateSchema } from '../../schemas/gameState.schema.js';
import { PHASES, STEPS } from '../../constants/phases.js';
import { ActionError } from './actionError.js';
import { loadOob, buildUnitSideMap } from '../oob.js';
import { applySection64AutoRecovery } from '../tables/rally.js';
import { handleEndPhase } from './endPhase.js';
import { handleRollInitiative, handleIssueOrder } from './issueOrder.js';
import { handleActivateStack } from './activateStack.js';
import { handleEndActivation } from './endActivation.js';
import { handleFireCombat } from './fireCombat.js';
import { handleCloseCombat } from './closeCombat.js';
import { handleResolveMorale } from './resolveMorale.js';
import { handleResolveLeaderCasualty } from './resolveLeaderCasualty.js';

export { ActionError };

// LOB §2.1 — returns the legal action candidates for playerSide in the current state.
// Each candidate is { type, payload } where payload is concrete when derivable from state,
// or null when the client must supply it at submission time. (#550)
export function getValidActions(state, playerSide) {
  if (state.status !== 'active') return [];
  if (state.activePlayer !== playerSide) return [];

  // LOB §9.1a — when a leader casualty check is pending, only RESOLVE_LEADER_CASUALTY is valid.
  // Player must supply leaderId, roll, and situation before the game can continue.
  if (state.pendingResolution?.type === 'leaderCasualty') {
    return [{ type: 'RESOLVE_LEADER_CASUALTY', payload: null }];
  }

  // LOB §6.1 — fire combat result requires morale resolution before play can continue. (#571)
  if (state.pendingResolution?.type === 'combatResult') {
    return [{ type: 'RESOLVE_MORALE', payload: null }];
  }

  // NOTE: 'closingRoll' and 'moraleCheck' pending types will surface RESOLVE_MORALE here
  // once handleResolveMorale is extended to handle those types (deferred to M7).
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
    // LOB §10.3 — initiative candidates limited to active side's units
    // Side is looked up via OOB data; units whose side cannot be determined are excluded
    // as a safe fallback. If OOB is unavailable, all on-board units are included (degraded mode).
    let unitSideMapForOrders;
    try {
      unitSideMapForOrders = buildUnitSideMap(loadOob());
    } catch {
      unitSideMapForOrders = null;
    }
    const onBoardUnitIds = Object.keys(state.units).filter((uid) => {
      if (!state.units[uid].isOnBoard) return false;
      if (!unitSideMapForOrders) return true; // OOB unavailable — include all (degraded mode)
      const info = unitSideMapForOrders.get(uid);
      // LOB §10.3 — initiative candidates limited to active side's units
      return info ? info.side === playerSide : false;
    });
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
    // LOB §3.0d — if a stack is mid-activation, offer combat actions plus END_ACTIVATION
    if (state.activityPhase?.currentActivation !== null) {
      const activation = state.activityPhase.currentActivation;
      const activeHex = activation.hex;

      // LOB §5.5 / §7.0 — build unit → side map to filter friendly vs. enemy targets.
      // loadOob() reads from disk; this is acceptable for the candidate-generation path
      // since getValidActions is informational (handlers re-validate independently).
      let unitSideMap;
      try {
        unitSideMap = buildUnitSideMap(loadOob());
      } catch {
        // If OOB is unavailable, degrade gracefully to END_ACTIVATION only
        return [{ type: 'END_ACTIVATION', payload: null }];
      }

      // Determine attacker side from the first on-board unit in the active hex
      const activeUnits = Object.values(state.units).filter(
        (u) => u.isOnBoard && u.hex === activeHex
      );
      const attackerSide =
        activeUnits.length > 0 ? (unitSideMap.get(activeUnits[0].id)?.side ?? null) : null;

      // LOB §5.5 — FIRE_COMBAT: enumerate enemy hexes in range; candidates use null payload
      // (client supplies dice at submission time; exact LOS/range gating deferred to handler).
      // TODO(M7): enumerate concrete (attackerHex, defenderHex) pairs when map data is available.
      const enemyHexesOnBoard = new Set(
        Object.values(state.units)
          .filter((u) => {
            if (!u.isOnBoard || !u.hex) return false;
            const info = unitSideMap.get(u.id);
            return info && attackerSide && info.side !== attackerSide;
          })
          .map((u) => u.hex)
      );

      // LOB §7.0 — CLOSE_COMBAT: enumerate enemy-occupied adjacent hexes.
      // Adjacency requires gridSpec from mapData; without it produce no candidates.
      // Candidates use null payload (client supplies dice at submission time).
      const closeCombatCandidates = [...enemyHexesOnBoard]
        .filter((hex) => {
          // Simple Manhattan adjacency as fallback (single col or row step).
          // Full cube-distance adjacency requires gridSpec; this approximation is safe
          // for candidate generation since handler re-validates with exact distance.
          const ac = parseInt(activeHex.split('.')[0]);
          const ar = parseInt(activeHex.split('.')[1]);
          const dc = parseInt(hex.split('.')[0]);
          const dr = parseInt(hex.split('.')[1]);
          return Math.abs(ac - dc) <= 1 && Math.abs(ar - dr) <= 1 && hex !== activeHex;
        })
        .map((defenderHex) => ({
          type: 'CLOSE_COMBAT',
          payload: { attackerHex: activeHex, defenderHex },
        }));

      return [
        { type: 'END_ACTIVATION', payload: null },
        ...closeCombatCandidates,
        // LOB §5.5 — generic FIRE_COMBAT candidate; client supplies full payload
        { type: 'FIRE_COMBAT', payload: null },
      ];
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
  ['FIRE_COMBAT', handleFireCombat],
  ['CLOSE_COMBAT', handleCloseCombat],
  ['RESOLVE_MORALE', handleResolveMorale],
  ['RESOLVE_LEADER_CASUALTY', handleResolveLeaderCasualty],
]);

// Current auto-advance steps: attackRecovery, flukeStoppage, rally (3 steps, 8 gives headroom for M6+)
const MAX_AUTO_STEPS = 8;

// LOB §8.1 — clear CBF (Can't Be Fought) markers from all on-board units entering Rally Phase.
// Returns a new units map with cbfMarker cleared; does not alter other unit fields.
function clearCbfMarkers(units) {
  const updated = {};
  for (const [id, unit] of Object.entries(units)) {
    updated[id] = unit.cbfMarker ? { ...unit, cbfMarker: false } : unit;
  }
  return updated;
}

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

    // LOB §10.8c — Attack Recovery: roll per division with a 'stopped' attack order.
    // Auto-advance when no stopped divisions exist (common at game start).
    // M7 will add interactive dice when stopped divisions are present mid-game.
    if (phase === PHASES.COMMAND && step === STEPS.ATTACK_RECOVERY) {
      // LOB §10.8c — enumerate units whose orders are 'stopped' (stopped attack order).
      // At M6 depth: stopped orders are not yet created in the South Mountain scenario startup;
      // auto-advance is correct for all current game states.
      // TODO(M7): when _stoppedUnitIds.length > 0, pause for player dice and roll recovery table.
      const _stoppedUnitIds = Object.values(s.units)
        .filter((u) => u.isOnBoard && u.orders?.status === 'stopped')
        .map((u) => u.id);
      s = {
        ...s,
        step: STEPS.FLUKE_STOPPAGE,
        completedSteps: [...s.completedSteps, STEPS.ATTACK_RECOVERY],
      };
      continue;
    }

    // LOB §10.7b — Fluke Stoppage: roll per division whose accepted order is 'attack'.
    // Auto-advance when no applicable divisions exist.
    // M7 will add interactive dice when attack orders are present.
    if (phase === PHASES.COMMAND && step === STEPS.FLUKE_STOPPAGE) {
      // LOB §10.7b — enumerate units whose accepted order is 'attack'.
      // At M6 depth: accepted attack orders without a completed fluke roll require a die roll,
      // but the South Mountain scenario startup has no such orders. Auto-advance is correct.
      // TODO(M7): when _attackOrderUnitIds.length > 0, pause for player dice and apply fluke table.
      const _attackOrderUnitIds = Object.values(s.units)
        .filter(
          (u) => u.isOnBoard && u.orders?.type === 'attack' && u.orders?.status === 'accepted'
        )
        .map((u) => u.id);
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

    // LOB §6.4, §6.3, §8.1 — Rally Phase.
    // Sequence: §6.4 automatic recovery (uses cbfMarker) → §8.1 clear CBF → §6.3 per-unit rolls.
    // §6.3 per-unit rolls require interactive dice (M7); auto-advance when no units remain pending.
    if (phase === PHASES.RALLY && step === STEPS.RALLY) {
      // LOB §6.4 — apply automatic recovery BEFORE clearing CBF markers (cbfMarker determines
      // whether a shaken unit auto-recovers). Must run first so cbfMarker values are still set.
      const { units: unitsAfter64, unitsPendingRallyRoll } = applySection64AutoRecovery(s.units);

      // LOB §8.1 — clear CBF markers from all on-board units after §6.4 has consumed them
      const unitsAfterCbf = clearCbfMarkers(unitsAfter64);

      // LOB §6.3 — units still needing a rally roll after §6.4 (routed units, shaken+CBF survivors).
      // TODO(M7): when unitsPendingRallyRoll.length > 0, pause for player dice and apply rally table.
      // At M6 depth: auto-advance regardless (no DG/Routed units in scenario startup state).
      const _pendingRallyRoll = unitsPendingRallyRoll;

      const nextActivePlayer = s.activePlayer === 'union' ? 'confederate' : 'union';
      s = {
        ...s,
        turn: s.turn + 1,
        phase: PHASES.COMMAND,
        step: STEPS.ORDERS,
        completedSteps: [],
        activePlayer: nextActivePlayer,
        units: unitsAfterCbf,
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
// ctx: { oob, scenario, mapData, hexIndex } — injected by the route layer for LOS/range validation
export function dispatch(state, action, ctx = {}) {
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

  const nextState = handler(state, { type, payload, playerSide }, ctx);
  const drainedState = drainAutoSteps(nextState);

  const parsed = GameStateSchema.safeParse(drainedState);
  if (!parsed.success) {
    throw new ActionError('INVALID_STATE', parsed.error.message);
  }

  return parsed.data;
}
