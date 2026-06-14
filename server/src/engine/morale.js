/**
 * Morale cascade engine — applies morale check results to game state and
 * propagates upward through the command hierarchy.
 *
 * LOB §6 — Morale; §6.2a — Additive Morale Effects Chart; §6.3 — cascade.
 *
 * Pure functions only — no I/O. All state mutations return new objects.
 */

import { moraleResult, moraleTransition } from './tables/morale.js';

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

  for (const unit of hexUnits) {
    // LOB §6.1 — each unit checked with its own morale rating
    const rating = getRating ? (getRating(unit.id) ?? 'D') : 'D';
    const { unit: updated, leaderLossCheck } = applyMoraleCheck(unit, rating, mods, diceRoll);
    updatedUnits[unit.id] = updated;
    if (leaderLossCheck) anyLeaderLossCheck = true;
  }

  return {
    state: { ...state, units: updatedUnits },
    anyLeaderLossCheck,
  };
}

// ─── Morale cascade ───────────────────────────────────────────────────────────

/**
 * Cascade morale upward: if a unit in targetHex routes, trigger a morale check
 * for its parent brigade/division per LOB §6.3.
 *
 * At M6 depth: cascade checks whether any unit in the hex is now 'routed' and
 * sets a pending resolution for the cascade morale check if so. Full hierarchy
 * walk (brigade → division → corps) is deferred to M7 when hierarchy data is
 * co-located with the dispatch pipeline.
 *
 * LOB §6.3 — a brigade routs when its last non-routed unit routs; division routs
 * when all brigades rout.
 *
 * @param {object} state - GameState after morale check applied
 * @param {string} targetHex - hex where morale check occurred
 * @returns {object} state — possibly with pendingResolution for cascade check
 */
export function cascadeMorale(state, targetHex) {
  const hexUnits = Object.values(state.units).filter((u) => u.isOnBoard && u.hex === targetHex);

  // LOB §6.3 — if all units in hex are routed, flag for cascade resolution
  const allRouted = hexUnits.length > 0 && hexUnits.every((u) => u.moraleState === 'routed');

  if (allRouted && state.pendingResolution === null) {
    // LOB §6.3 — cascade morale check pending for the brigade/division above this hex
    // Full cascade resolution deferred to M7 when OOB hierarchy walk is wired.
    // For M6: record that a cascade check is needed; the morale cascade route
    // can resolve it via a subsequent RESOLVE_MORALE action.
    return {
      ...state,
      pendingResolution: {
        type: 'moraleCheck',
        context: {
          hex: targetHex,
          cascade: true,
          reason: 'all units routed — brigade cascade check required (LOB §6.3)',
        },
      },
    };
  }

  return state;
}

// ─── RESOLVE_MORALE handler helper ────────────────────────────────────────────

/**
 * Resolve a pending 'combatResult' by applying morale checks and clearing pendingResolution.
 *
 * LOB §6.1 — called by the RESOLVE_MORALE action handler after the player
 * supplies the morale dice roll(s) for the affected units.
 *
 * NOTE: only handles 'combatResult' pending type. 'closingRoll' and 'moraleCheck' cascade
 * resolution are deferred to M7 — see GitHub issues #571 (soft-lock) and #577 (cascade scope).
 *
 * @param {object} state - GameState with pendingResolution set
 * @param {number} diceRoll - raw 2d6 result for the morale check
 * @param {object} mods - morale modifier flags
 * @param {Function} getRating - (unitId) => moraleRating from OOB
 * @returns {object} new state with morale applied and pendingResolution cleared or updated
 */
export function resolvePendingMorale(state, diceRoll, mods, getRating) {
  const pending = state.pendingResolution;
  if (!pending || pending.type !== 'combatResult') {
    return state;
  }

  const { defenderHex } = pending.context;

  // LOB §6.1 — apply morale check to all units in the defender hex
  const { state: afterMorale, anyLeaderLossCheck } = applyMoraleToHex(
    state,
    defenderHex,
    mods,
    diceRoll,
    getRating
  );

  // LOB §6.3 — check for cascade condition
  const afterCascade = cascadeMorale(afterMorale, defenderHex);

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
