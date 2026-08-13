import { GameStateSchema } from '../../schemas/gameState.schema.js';
import { PHASES, STEPS } from '../../constants/phases.js';
import { MORALE_PENDING_TYPES } from '../../constants/resolution.js';
import { ActionError } from './actionError.js';
import {
  loadOob,
  buildUnitSideMap,
  loadLeaders,
  buildLeaderSideMap,
  safeFindOobUnit,
} from '../oob.js';
import { applySection64AutoRecovery } from '../tables/rally.js';
import { handleEndPhase } from './endPhase.js';
import { handleRollInitiative, handleIssueOrder } from './issueOrder.js';
import { handleActivateStack } from './activateStack.js';
import { handleEndActivation } from './endActivation.js';
import { handleFireCombat } from './fireCombat.js';
import { handleCloseCombat } from './closeCombat.js';
import { handleResolveMorale } from './resolveMorale.js';
import { handleResolveLeaderCasualty } from './resolveLeaderCasualty.js';
import { handleRallyRoll } from './rallyRoll.js';
import {
  handleLimber,
  handleUnlimber,
  handleFireArtillery,
  handleReplenishArtillery,
} from './artillery.js';
import {
  handleRollAttackRecovery,
  handleAcknowledgeRandomEvent,
  resolveRandomEvent,
} from './endOfTurn.js';
import { resolveMove } from './move.js';
import { computeVP, evaluateVictory } from '../vp.js';

export { ActionError };

// LOB §2.1 — returns the legal action candidates for playerSide in the current state.
// Each candidate is { type, payload } where payload is concrete when derivable from state,
// or null when the client must supply it at submission time. (#550)
export function getValidActions(state, playerSide) {
  if (state.status !== 'active') return [];
  if (state.activePlayer !== playerSide) return [];

  // SM §7.0 — random event pending acknowledgement: only ACKNOWLEDGE_RANDOM_EVENT is valid.
  if (state.ordersPhase?.pendingRandomEvent) {
    return [{ type: 'ACKNOWLEDGE_RANDOM_EVENT', payload: null }];
  }

  // LOB §10.8c — attack recovery pending: only ROLL_ATTACK_RECOVERY is valid.
  if (state.pendingAttackRecovery?.divisionIds?.length > 0) {
    return state.pendingAttackRecovery.divisionIds.map((divisionId) => ({
      type: 'ROLL_ATTACK_RECOVERY',
      payload: { divisionId },
    }));
  }

  // LOB §9.1a — when a leader casualty check is pending, only RESOLVE_LEADER_CASUALTY is valid.
  // Player must supply leaderId, roll, and situation before the game can continue.
  if (state.pendingResolution?.type === 'leaderCasualty') {
    return [{ type: 'RESOLVE_LEADER_CASUALTY', payload: null }];
  }

  // LOB §6.1/§7.0/§6.3 — any combat-result, closing-roll, or morale-cascade pending type
  // requires morale resolution before play can continue. (#571)
  if (MORALE_PENDING_TYPES.has(state.pendingResolution?.type)) {
    return [{ type: 'RESOLVE_MORALE', payload: null }];
  }

  if (state.pendingResolution !== null) return [];

  // LOB §6.4 step 3 — when routed units are pending rally rolls, surface one RALLY_ROLL
  // candidate per pending unit. No other actions are valid until all rolls are resolved.
  if (state.phase === PHASES.RALLY && state.rallyPhase?.pendingRallyRoll) {
    return state.rallyPhase.pendingRallyRoll.unitIds.map((unitId) => ({
      type: 'RALLY_ROLL',
      payload: { unitId },
    }));
  }

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
    // LOB §10.3 — initiative is rolled by the active player's own leaders only (#587).
    // Build leader side map; leaders not found in OOB are excluded as a safe fallback.
    let leaderSideMapForOrders;
    try {
      leaderSideMapForOrders = buildLeaderSideMap(loadLeaders());
    } catch {
      leaderSideMapForOrders = null;
    }
    const eligibleLeaders = leaderEntries.filter(([id, ls]) => {
      if (leaderRollUsed[id] || !ls.isOnBoard) return false;
      if (!leaderSideMapForOrders) return true; // degraded mode — include all on-board leaders
      const side = leaderSideMapForOrders.get(id);
      return side === playerSide;
    });
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
      // #676 — loadOob() reads from disk; hoisted to a single call reused below for the
      // per-unit artillery lookup too, instead of re-reading once per active unit.
      let oob;
      let unitSideMap;
      try {
        oob = loadOob();
        unitSideMap = buildUnitSideMap(oob);
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
      // TODO(M7): enumerate concrete (attackerHex, defenderHex) pairs when map data is available. (#609)
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

      // LOB §3.6 / §8.2 — artillery action candidates for batteries in the active hex
      const artilleryCandidates = activeUnits.flatMap((u) => {
        const oobUnit = safeFindOobUnit(oob, u.id);
        if (!oobUnit || (oobUnit.type !== 'artillery' && oobUnit.gunType === undefined)) return [];
        const formation = u.formation ?? 'unlimbered';
        const candidates = [];
        if (formation === 'unlimbered') {
          // LOB §3.6a — unlimbered battery can limber (no range restriction)
          candidates.push({ type: 'LIMBER', payload: { unitId: u.id } });
          // LOB §8.2 — unlimbered battery can fire; client supplies full payload
          candidates.push({ type: 'FIRE_ARTILLERY', payload: { attackerUnitId: u.id } });
        } else {
          // LOB §3.6b — limbered battery can unlimber (subject to range gate in handler)
          candidates.push({ type: 'UNLIMBER', payload: { unitId: u.id } });
        }
        // LOB §8.3 — depleted battery can replenish if supply trace exists
        if (u.ammo !== 'full') {
          candidates.push({ type: 'REPLENISH_ARTILLERY', payload: { unitId: u.id } });
        }
        return candidates;
      });

      // LOB §3 — MOVE candidates: one per unit in the active hex with remaining MPs.
      // Payload is intentionally partial: client must append payload.path ([start, ...hexes, dest])
      // before submitting — see resolveMove for the full required payload contract.
      const moveCandidates = activeUnits
        .filter((u) => (u.remainingMPs ?? 0) > 0)
        .map((u) => ({ type: 'MOVE', payload: { unitId: u.id } }));

      return [
        { type: 'END_ACTIVATION', payload: null },
        ...moveCandidates,
        ...closeCombatCandidates,
        // LOB §5.5 — generic FIRE_COMBAT candidate; client supplies full payload
        { type: 'FIRE_COMBAT', payload: null },
        ...artilleryCandidates,
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
  ['MOVE', resolveMove],
  ['ROLL_INITIATIVE', handleRollInitiative],
  ['ISSUE_ORDER', handleIssueOrder],
  ['ACTIVATE_STACK', handleActivateStack],
  ['END_ACTIVATION', handleEndActivation],
  ['FIRE_COMBAT', handleFireCombat],
  ['CLOSE_COMBAT', handleCloseCombat],
  ['RESOLVE_MORALE', handleResolveMorale],
  ['RESOLVE_LEADER_CASUALTY', handleResolveLeaderCasualty],
  ['RALLY_ROLL', handleRallyRoll],
  ['LIMBER', handleLimber],
  ['UNLIMBER', handleUnlimber],
  ['FIRE_ARTILLERY', handleFireArtillery],
  ['REPLENISH_ARTILLERY', handleReplenishArtillery],
  ['ROLL_ATTACK_RECOVERY', handleRollAttackRecovery],
  ['ACKNOWLEDGE_RANDOM_EVENT', handleAcknowledgeRandomEvent],
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
// ctx: passed from dispatch; used for scenario-dependent auto-steps (random events, reinforcements).
export function drainAutoSteps(state, ctx = {}) {
  let s = state;

  // Iteration cap guards against a future handler bug that creates a cycle in the step state machine,
  // which would otherwise block the Node event loop indefinitely (single-process Express).
  for (let i = 0; i < MAX_AUTO_STEPS; i++) {
    const { phase, step } = s;

    assertEnvelope(s.activityPhase, 'activityPhase', PHASES.ACTIVITY, phase, step);
    assertEnvelope(s.ordersPhase, 'ordersPhase', PHASES.COMMAND, phase, step);
    assertEnvelope(s.rallyPhase, 'rallyPhase', PHASES.RALLY, phase, step);

    // LOB §3.7 / SM reinforcements — place units that are due this turn from the queue.
    // Fires every time we land on ORDERS step so arriving units are ready before activation.
    // Only runs if there are queue entries for the current turn.
    if (phase === PHASES.COMMAND && step === STEPS.ORDERS) {
      const due = s.reinforcementQueue.filter((e) => e.turn === s.turn);
      if (due.length > 0) {
        const remainingQueue = s.reinforcementQueue.filter((e) => e.turn !== s.turn);
        const updatedUnits = { ...s.units };
        for (const { unitId, entryHex } of due) {
          if (updatedUnits[unitId]) {
            updatedUnits[unitId] = { ...updatedUnits[unitId], isOnBoard: true, hex: entryHex };
          }
        }
        s = { ...s, reinforcementQueue: remainingQueue, units: updatedUnits };
        // Continue — do not advance step; let ORDERS interactive loop proceed normally.
        // We must return here to avoid re-processing arrivals on subsequent drain iterations.
        return s;
      }
    }

    // SM §7.0 — Random Event: roll 2d6 for the active player after the Orders step ends.
    // Fires exactly once per Command Phase when entering ATTACK_RECOVERY (SM §7.0 — one check
    // per active player per Command Phase). Guard: completedSteps must not already include
    // 'randomEvent'; the flag is pushed when the event is acknowledged or resolved to no-op.
    if (phase === PHASES.COMMAND && step === STEPS.ATTACK_RECOVERY) {
      const scenario = ctx.scenario;
      const alreadyRolled = s.completedSteps.includes('randomEvent');
      // ordersPhase is always non-null at ATTACK_RECOVERY (handleEndPhase no longer clears it here).
      if (scenario?.randomEventsEnabled && !alreadyRolled) {
        const side = s.activePlayer;
        // Use ctx.rollFn if supplied (test injection); fall back to Math.random() at the boundary.
        const rollFn = ctx.rollFn ?? (() => Math.ceil(Math.random() * 6));
        const roll = rollFn() + rollFn();
        // SM §7.1/§7.2 — reroll triggers not yet implemented; take first roll only.
        // Reroll wiring deferred to M8+ — see #633.
        const resolved = resolveRandomEvent(roll, side, scenario);
        if (resolved) {
          s = {
            ...s,
            ordersPhase: { ...s.ordersPhase, pendingRandomEvent: resolved },
          };
          return s; // pause — player must submit ACKNOWLEDGE_RANDOM_EVENT
        }
        // No event matched (roll out of table range) — mark done so we don't re-fire.
        s = { ...s, completedSteps: [...s.completedSteps, 'randomEvent'] };
      }
    }

    // LOB §10.8c — Attack Recovery: roll per division with a 'stopped' attack order.
    // Pause for player dice when stopped divisions are present; auto-advance otherwise.
    if (phase === PHASES.COMMAND && step === STEPS.ATTACK_RECOVERY) {
      // LOB §10.8c — automatic recovery on first twilight turn (LOB_CHARTS).
      // First twilight turn is the first turn where lightingSchedule condition !== 'day'.
      const scenario = ctx.scenario;
      const lightingSchedule = scenario?.lightingSchedule ?? [];
      const firstTwilightTurn =
        lightingSchedule.find((e) => e.condition !== 'day')?.startTurn ?? null;
      const isAutoRecoveryTurn = firstTwilightTurn !== null && s.turn >= firstTwilightTurn;

      // LOB §10.8c — enumerate divisions with 'stopped' attack orders
      const stoppedDivisionIds = Object.values(s.units)
        .filter((u) => u.isOnBoard && u.orders?.status === 'stopped')
        .map((u) => u.id);

      if (stoppedDivisionIds.length > 0 && !isAutoRecoveryTurn) {
        // LOB §10.8c — pause for interactive recovery rolls; set pendingAttackRecovery
        if (!s.pendingAttackRecovery) {
          s = { ...s, pendingAttackRecovery: { divisionIds: stoppedDivisionIds } };
          return s; // pause — player must submit ROLL_ATTACK_RECOVERY for each division
        }
        // pendingAttackRecovery already set — still waiting for submissions
        return s;
      } else if (stoppedDivisionIds.length > 0 && isAutoRecoveryTurn) {
        // LOB_CHARTS — automatic recovery: clear all stopped orders unconditionally
        const autoRecoveredUnits = { ...s.units };
        for (const divId of stoppedDivisionIds) {
          const u = autoRecoveredUnits[divId];
          if (u) {
            autoRecoveredUnits[divId] = {
              ...u,
              orders: { ...u.orders, status: 'none', type: null, deliveryTurnDue: null },
            };
          }
        }
        s = { ...s, units: autoRecoveredUnits, pendingAttackRecovery: null };
      }

      // SM §7.0 — ordersPhase kept alive through ATTACK_RECOVERY for random-event pendingRandomEvent;
      // null it here when advancing to FLUKE_STOPPAGE (schema: ordersPhase null outside command/orders).
      s = {
        ...s,
        step: STEPS.FLUKE_STOPPAGE,
        completedSteps: [...s.completedSteps, STEPS.ATTACK_RECOVERY],
        ordersPhase: null,
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
      // TODO(M7): when _attackOrderUnitIds.length > 0, pause for player dice and apply fluke table. (#609)
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

    // LOB §6.4, §6.3, §5.8c — Rally Phase.
    // Sequence: §6.4 automatic recovery → §5.8c clear CBF → §6.3 per-unit rolls.
    // §6.4 steps 1+2 are unconditional (no CBF gate). CBF cleared after §6.4 per sequence-of-play.
    // §6.3 per-unit rolls require interactive dice (M7); auto-advance when no units remain pending.
    if (phase === PHASES.RALLY && step === STEPS.RALLY) {
      // LOB §6.4 steps 1+2 — unconditional: Sh→Normal, DG→Sh (CBF does not gate either step).
      const { units: unitsAfter64, unitsPendingRallyRoll: _unitsPendingRallyRoll } =
        applySection64AutoRecovery(s.units);

      // LOB §5.8c — clear CBF markers from all on-board units after §6.4 completes
      const unitsAfterCbf = clearCbfMarkers(unitsAfter64);

      // LOB §6.4 step 3 / §6.3 — routed units require an interactive rally roll.
      // Pause drainAutoSteps and set pendingRallyRoll so getValidActions surfaces RALLY_ROLL.
      if (_unitsPendingRallyRoll.length > 0) {
        s = {
          ...s,
          units: unitsAfterCbf,
          rallyPhase: {
            ...s.rallyPhase,
            unitsPendingRally: s.rallyPhase?.unitsPendingRally ?? [],
            pendingRallyRoll: { unitIds: _unitsPendingRallyRoll },
          },
        };
        return s; // pause — player must submit RALLY_ROLL for each pending unit
      }

      const nextActivePlayer = s.activePlayer === 'union' ? 'confederate' : 'union';
      const nextTurn = s.turn + 1;

      // SM §5.0 / SM §5.3 — compute VP and evaluate victory at end of each turn.
      // Only runs when ctx.scenario and ctx.oob are available (production path).
      // ctx.scenario.turnStructure.totalTurns used to detect last turn.
      const scenario = ctx.scenario;
      const oob =
        ctx.oob ??
        (() => {
          try {
            return loadOob();
          } catch {
            return null;
          }
        })();
      let vpResult = s.vp;
      let victoryResult = s.victoryResult;
      let gameOver = s.gameOver ?? false;

      if (scenario && oob && !gameOver) {
        vpResult = computeVP({ ...s, units: unitsAfterCbf }, oob, scenario);
        const totalTurns = scenario.turnStructure?.totalTurns ?? 45; // SM §1.0 — 45 turns
        if (s.turn >= totalTurns) {
          // SM §5.3 — evaluate final outcome after last turn
          victoryResult = evaluateVictory(vpResult.net, scenario.victoryConditions?.results ?? []);
          gameOver = true;
        }
      }

      // SM §5.3 — terminal state: status='complete' with phase/step/activePlayer/all-envelopes null
      // so GameStateSchema biconditionals pass. Turn is NOT incremented when gameOver to avoid
      // storing turn=46 for a 45-turn game.
      s = {
        ...s,
        turn: gameOver ? s.turn : nextTurn, // do not increment past totalTurns on game over
        phase: gameOver ? null : PHASES.COMMAND,
        step: gameOver ? null : STEPS.ORDERS,
        completedSteps: [],
        activePlayer: gameOver ? null : nextActivePlayer,
        units: unitsAfterCbf,
        activityPhase: null,
        ordersPhase: null,
        rallyPhase: null,
        vp: vpResult,
        victoryResult,
        gameOver,
        status: gameOver ? 'complete' : s.status,
      };
      if (!gameOver) {
        s = { ...s, ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null } };
      }
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

// Action types that require full ctx. FIRE_COMBAT and CLOSE_COMBAT degrade gracefully when ctx
// is absent; MOVE fails hard (throws INVALID_ACTION). All three emit a dispatch-level warning
// so wiring gaps surface before the handler throws. (accepted for test-compat; #594)
const CTX_RECOMMENDED_ACTIONS = new Set(['FIRE_COMBAT', 'CLOSE_COMBAT', 'MOVE']);

// Pure reducer: validate → route → drain → validate output state.
// action: { type: string, payload: object|null, playerSide: 'union'|'confederate' }
// ctx: { oob, scenario, mapData, hexIndex } — injected by the route layer for LOS/range validation
export function dispatch(state, action, ctx = {}) {
  const { type, payload, playerSide } = action;

  // #594 — warn when combat handlers receive empty ctx; they fall back to degraded mode silently.
  if (CTX_RECOMMENDED_ACTIONS.has(type) && (!ctx.oob || !ctx.mapData)) {
    console.warn(
      `[dispatch] ${type} dispatched without full ctx (oob/mapData missing) — LOS and range validation degraded (#594)`
    );
  }

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
  const drainedState = drainAutoSteps(nextState, ctx);

  const parsed = GameStateSchema.safeParse(drainedState);
  if (!parsed.success) {
    throw new ActionError('INVALID_STATE', parsed.error.message);
  }

  return parsed.data;
}
