/**
 * Morale cascade engine — applies morale check results to game state and
 * propagates upward through the command hierarchy.
 *
 * LOB §6 — Morale; §6.2a — Additive Morale Effects Chart; §6.3 — cascade.
 *
 * Pure functions only — no I/O. All state mutations return new objects.
 */

import { moraleResult, moraleTransition } from './tables/morale.js';
import { findBrigadeForUnit, findOobUnit } from './oob.js';
import { ActionError } from './actions/actionError.js';
import { MORALE_PENDING_TYPES } from '../constants/resolution.js';
import { applyRetreat } from './retreat.js';

// LOB §6.0 — Schema moraleState and morale table result types now share the same vocabulary:
// 'normal' (NM), 'bloodlust' (BL), 'shaken' (SH), 'disorganized' (DG), 'routed' (RT).
// No translation maps needed.

// ─── Wrecked threshold ─────────────────────────────────────────────────────────

/**
 * Determine whether a unit should be marked Wrecked.
 * LOB §5.7 — a unit is Wrecked when its current SPs fall below 50% of printed strength.
 *
 * @param {number} currentSPs - current strength points
 * @param {number} printedSPs - original printed strength from OOB
 * @returns {boolean}
 */
export function isWrecked(currentSPs, printedSPs) {
  // LOB §5.7 — strictly less than 50% (not equal)
  return currentSPs < printedSPs * 0.5;
}

// ─── Single-unit morale check ──────────────────────────────────────────────────

/**
 * Apply a morale check to a single unit, returning an updated unit state.
 *
 * LOB §6.1 — roll 2d6, apply modifiers, look up result on Morale Table.
 * LOB §6.2a — apply Additive Morale Effects Chart to transition moraleState.
 *
 * @param {object} unit - UnitStateSchema object
 * @param {'A'|'B'|'C'|'D'} moraleRating - from OOB
 * @param {object} mods - morale modifier flags (see tables/morale.js computeEffectiveRoll)
 * @param {number} diceRoll - raw 2d6 result (2–12)
 * @returns {{ unit: object, result: object, leaderLossCheck: boolean }}
 */
export function applyMoraleCheck(unit, moraleRating, mods, diceRoll) {
  // LOB §6.1 — look up morale result from table
  const result = moraleResult(moraleRating, mods, diceRoll);

  // LOB §6.2a — apply Additive Morale Effects Chart to transition state.
  // Schema moraleState and table result type now share the same vocabulary (NM/BL/SH/DG/RT).
  const currentState = unit.moraleState ?? 'normal';
  const incomingCode = result.type === 'noEffect' ? 'normal' : result.type;
  const transition = moraleTransition(currentState, incomingCode);

  const newMoraleState = transition ? transition.newState : unit.moraleState;

  const suppressRetreats = transition?.suppressRetreatsAndLosses ?? false;

  const updatedUnit = {
    ...unit,
    moraleState: newMoraleState,
  };

  return {
    unit: updatedUnit,
    result,
    suppressRetreats,
    leaderLossCheck: result.leaderLossCheck,
  };
}

// ─── State-level morale application ───────────────────────────────────────────

/**
 * Apply morale check results to all units in a hex and return updated state.
 *
 * LOB §6.1–6.2a — each unit in the target hex takes the morale check independently
 * with the same dice roll and modifiers.
 *
 * @param {object} state - GameState
 * @param {string} targetHex - hex whose units take the morale check
 * @param {'A'|'B'|'C'|'D'} moraleRating - rating to use (attacker's or defender's per context)
 * @param {object} mods - morale modifier flags
 * @param {number} diceRoll - raw 2d6 result
 * @param {Function} getRating - (unitId) => moraleRating string from OOB; fallback to 'D'
 * @returns {{ state: object, leaderLossCheck: boolean, anyLeaderLossCheck: boolean }}
 */
export function applyMoraleToHex(state, targetHex, mods, diceRoll, getRating) {
  const hexUnits = Object.values(state.units).filter((u) => u.isOnBoard && u.hex === targetHex);

  let updatedUnits = { ...state.units };
  let anyLeaderLossCheck = false;
  // Per-unit retreat/SP data for callers that apply position and strength changes
  const unitEffects = [];

  for (const unit of hexUnits) {
    // LOB §6.1 — each unit checked with its own morale rating
    const rating = getRating ? (getRating(unit.id) ?? 'D') : 'D';
    const {
      unit: updated,
      result,
      suppressRetreats,
      leaderLossCheck,
    } = applyMoraleCheck(unit, rating, mods, diceRoll);
    updatedUnits[unit.id] = updated;
    if (leaderLossCheck) anyLeaderLossCheck = true;
    unitEffects.push({
      unitId: unit.id,
      retreatHexes: suppressRetreats ? 0 : (result.retreatHexes ?? 0),
      spLoss: suppressRetreats ? 0 : (result.spLoss ?? 0),
    });
  }

  return {
    state: { ...state, units: updatedUnits },
    anyLeaderLossCheck,
    unitEffects,
  };
}

// ─── Morale cascade ───────────────────────────────────────────────────────────

/**
 * Cascade morale: if all units in a brigade route, trigger a pending morale check
 * for co-occupants in the triggering hex.
 *
 * Designer extension — no LOB v2.0 or SM source document defines a morale cascade mechanic.
 * LOB §6.3 is the Retreat rule, not cascade. Brigade-scoped detection is used to correctly
 * identify which brigade triggered the cascade; resolution applies to hex co-occupants.
 * The closest analog in the rules is SM §7.1 Confederate Random Event #4 ("Brigade Morale"),
 * but that is a random event, not an automatic cascade. See issue #627.
 *
 * @param {object} state - GameState after morale check applied
 * @param {string} targetHex - hex where morale check occurred (used to find routing units)
 * @param {object|null} oob - loaded OOB data for brigade lookup
 * @returns {object} state — possibly with pendingResolution for cascade check
 */
export function cascadeMorale(state, targetHex, oob = null) {
  // Designer extension — cascade detection is brigade-scoped: gather hex units only to
  // identify which brigade(s) to check; the brigade check itself spans all on-board members.
  const hexUnits = Object.values(state.units).filter((u) => u.isOnBoard && u.hex === targetHex);
  if (hexUnits.length === 0) return state;

  if (state.pendingResolution !== null) return state;

  // Degraded mode: OOB absent — fall back to hex-scope check only when oob is null (#606).
  // This must not trigger when oob is present but a unit happens to not be in any brigade
  // (e.g. corps-level units, batteries). Those cases are silently skipped.
  if (!oob) {
    const allHexRouted = hexUnits.every((u) => u.moraleState === 'routed');
    if (allHexRouted) {
      return {
        ...state,
        pendingResolution: {
          type: 'moraleCheck',
          context: {
            hex: targetHex,
            cascade: true,
            reason:
              'all units in hex routed — degraded hex-scope heuristic (OOB unavailable; #606)',
          },
        },
      };
    }
    return state;
  }

  // Designer extension — check each brigade represented by routed hex units.
  // When multiple brigades fully rout simultaneously, return cascade for the first one found
  // and let the next RESOLVE_MORALE cycle handle subsequent cascades (#605).
  const checkedBrigades = new Set();
  for (const unit of hexUnits) {
    if (unit.moraleState !== 'routed') continue;

    // Designer extension — find the brigade for this unit via OOB hierarchy.
    // If the unit is not in any brigade (corps-level unit, battery), skip it — do not degrade.
    const brigInfo = findBrigadeForUnit(oob, unit.id);
    if (!brigInfo) continue;

    if (checkedBrigades.has(brigInfo.brigadeId)) continue;
    checkedBrigades.add(brigInfo.brigadeId);

    // Designer extension — brigade cascades when ALL its on-board members are routed
    const brigadeOnBoardUnits = brigInfo.unitIds.filter(
      (id) => state.units[id]?.isOnBoard ?? false
    );
    const allBrigadeRouted =
      brigadeOnBoardUnits.length > 0 &&
      brigadeOnBoardUnits.every((id) => state.units[id]?.moraleState === 'routed');

    if (allBrigadeRouted) {
      return {
        ...state,
        pendingResolution: {
          type: 'moraleCheck',
          context: {
            brigadeId: brigInfo.brigadeId,
            hex: targetHex,
            cascade: true,
            reason: `brigade ${brigInfo.brigadeId} — all units routed (designer extension; see #627)`,
          },
        },
      };
    }
  }

  return state;
}

// ─── Retreat and SP-loss application ──────────────────────────────────────────

/**
 * Apply retreat hex moves and SP losses from morale results to game state.
 *
 * LOB §6.1 — SP losses are taken AFTER retreat (footnote). Retreat moves the
 * unit's hex; SP loss reduces strengthPoints (falling back to OOB printed SPs).
 * LOB §5.7 — wrecked status is re-evaluated after SP loss.
 *
 * @param {object} state - GameState after morale state has been applied
 * @param {string} combatHex - the hex units are retreating FROM (enemy position)
 * @param {Array<{unitId: string, retreatHexes: number, spLoss: number}>} unitEffects
 * @param {object|null} oob - loaded OOB for printed SP lookup
 * @param {object|null} mapData - loaded map for retreat path computation
 * @returns {object} new state with hex positions and strengthPoints updated
 */
export function applyRetreatsAndSpLosses(
  state,
  combatHex,
  unitEffects,
  oob = null,
  mapData = null
) {
  let updatedUnits = { ...state.units };

  for (const { unitId, retreatHexes, spLoss } of unitEffects) {
    const unit = updatedUnits[unitId];
    if (!unit || !unit.isOnBoard) continue;

    let updatedUnit = { ...unit };

    // LOB §6.1 — apply retreat before SP loss
    if (retreatHexes > 0 && combatHex) {
      const { destHex } = applyRetreat(unit.hex, combatHex, retreatHexes, mapData);
      updatedUnit = { ...updatedUnit, hex: destHex };
    }

    // LOB §6.1 footnote — SP loss taken after retreat
    if (spLoss > 0) {
      const oobUnit = oob ? findOobUnit(oob, unitId) : null;
      const printedSPs = oobUnit?.strengthPoints ?? 0;
      const currentSPs = updatedUnit.strengthPoints ?? printedSPs;
      const newSPs = Math.max(0, currentSPs - spLoss);
      updatedUnit = {
        ...updatedUnit,
        strengthPoints: newSPs,
        // LOB §5.7 — wrecked when current SPs fall below 50% of printed strength
        wrecked: printedSPs > 0 ? isWrecked(newSPs, printedSPs) : updatedUnit.wrecked,
      };
    }

    updatedUnits[unitId] = updatedUnit;
  }

  return { ...state, units: updatedUnits };
}

// ─── RESOLVE_MORALE handler helper ────────────────────────────────────────────

/**
 * Resolve a pending combat-result, closing-roll, or morale-cascade check by applying
 * the player-supplied dice roll to the affected hex units and clearing pendingResolution.
 *
 * LOB §6.1 — called by RESOLVE_MORALE after the player supplies the morale dice roll.
 * LOB §7.0d — closingRoll resolves defender morale after close combat.
 * LOB §6.3 — moraleCheck resolves brigade cascade check.
 *
 * @param {object} state - GameState with pendingResolution set
 * @param {number} diceRoll - raw 2d6 result for the morale check
 * @param {object} mods - morale modifier flags
 * @param {Function} getRating - (unitId) => moraleRating from OOB
 * @param {object|null} oob - loaded OOB data for brigade cascade lookup (see cascadeMorale)
 * @param {object|null} mapData - loaded map data for retreat path computation (LOB §6.1)
 * @returns {object} new state with morale applied and pendingResolution cleared or updated
 */
export function resolvePendingMorale(state, diceRoll, mods, getRating, oob = null, mapData = null) {
  const pending = state.pendingResolution;
  if (!pending || !MORALE_PENDING_TYPES.has(pending.type)) {
    return state;
  }

  // LOB §6.1 — target hex: combatResult uses defenderHex; closingRoll uses defenderHex;
  // moraleCheck (cascade) uses hex from context.
  const defenderHex = pending.context.defenderHex ?? pending.context.hex;
  if (!defenderHex) {
    throw new ActionError(
      'INVALID_STATE',
      `pendingResolution type '${pending.type}' context missing target hex`
    );
  }

  // LOB §6.1 — apply morale check to all units in the defender hex
  const {
    state: afterMorale,
    anyLeaderLossCheck,
    unitEffects,
  } = applyMoraleToHex(state, defenderHex, mods, diceRoll, getRating);

  // LOB §6.1 — apply retreat and SP losses; combat hex is the attacker hex for combatResult
  // and closingRoll (defenderHex is the target; attackerHex is where they retreat from).
  const combatHex = pending.context.attackerHex ?? null;
  const afterEffects = applyRetreatsAndSpLosses(afterMorale, combatHex, unitEffects, oob, mapData);

  // Designer extension — check for cascade via brigade hierarchy (see cascadeMorale, issue #627)
  const afterCascade = cascadeMorale(afterEffects, defenderHex, oob);

  // If cascade triggered a new pending resolution, preserve it; otherwise clear
  const newPending =
    afterCascade.pendingResolution !== null && afterCascade.pendingResolution !== pending
      ? afterCascade.pendingResolution
      : anyLeaderLossCheck
        ? {
            type: 'leaderCasualty',
            // LOB §9.1a — leader loss check triggered by m+ result
            context: { hex: defenderHex, reason: 'morale check with SP loss' },
          }
        : null;

  return { ...afterCascade, pendingResolution: newPending };
}
