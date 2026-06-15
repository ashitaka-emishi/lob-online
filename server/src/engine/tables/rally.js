/**
 * Rally Phase table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Source: LOB_CHARTS p.6 (Rally Phase §6.3 / §6.4).
 * No SM-specific overrides to this table.
 */

// ─── Rally Roll Thresholds ────────────────────────────────────────────────────

/**
 * LOB §6.3 — 2d6 success thresholds for per-unit rally rolls.
 * Roll 2d6 ≤ threshold to improve morale state by one step.
 * A-rated units succeed most often; F-rated units least often.
 */
export const RALLY_THRESHOLDS = Object.freeze({
  A: 10, // LOB_CHARTS §6.3
  B: 9, // LOB_CHARTS §6.3
  C: 8, // LOB_CHARTS §6.3
  D: 7, // LOB_CHARTS §6.3
  E: 6, // LOB_CHARTS §6.3
  F: 5, // LOB_CHARTS §6.3
});

// ─── Morale state step-up map ────────────────────────────────────────────────

/**
 * LOB §6.3 — on a successful rally roll, the unit's morale state improves by one step.
 * routed → disorganized → shaken → normal (bloodlust is unaffected by rally).
 */
const RALLY_STEP_UP = Object.freeze({
  routed: 'disorganized',
  disorganized: 'shaken',
  shaken: 'normal',
});

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Determine whether a rally roll succeeds.
 * LOB §6.3 — 2d6 ≤ morale threshold = success; improve morale state by one step.
 *
 * @param {'A'|'B'|'C'|'D'|'E'|'F'} moraleRating - unit's printed morale rating
 * @param {number} diceRoll - 2d6 total (2–12)
 * @returns {{ success: boolean, threshold: number|null, newMoraleState: string|null }}
 *   success:       true when diceRoll ≤ threshold
 *   threshold:     numeric threshold used, or null if rating unknown
 *   newMoraleState: improved state if success; null if failure or rating unknown
 */
export function rallyRollResult(moraleRating, diceRoll, currentMoraleState) {
  const threshold = RALLY_THRESHOLDS[moraleRating];
  if (threshold === undefined) {
    return { success: false, threshold: null, newMoraleState: null };
  }

  const success = diceRoll <= threshold;
  const newMoraleState = success ? (RALLY_STEP_UP[currentMoraleState] ?? currentMoraleState) : null;

  return { success, threshold, newMoraleState };
}

/**
 * Apply §6.4 automatic recovery steps to a units map before per-unit rally rolls.
 * LOB §6.4 — applied to all on-board units at Rally Phase entry:
 *   - shaken units that did NOT take a combat loss this turn (cbfMarker === false)
 *     automatically recover to normal
 *   - disorganized units automatically flip to shaken
 *   - routed units are flagged as requiring a rally roll (no automatic recovery)
 *
 * CBF markers have already been cleared before entering Rally Phase (LOB §8.1);
 * this function must be called BEFORE clearCbfMarkers() to evaluate the cbfMarker flag.
 *
 * @param {Record<string, object>} units - current unit state map (cbfMarkers still set)
 * @returns {{ units: Record<string, object>, unitsPendingRallyRoll: string[] }}
 *   units:                  updated units map with §6.4 morale state changes applied
 *   unitsPendingRallyRoll:  unit IDs that still need a §6.3 rally roll (routed after §6.4)
 */
export function applySection64AutoRecovery(units) {
  const updated = { ...units };
  const unitsPendingRallyRoll = [];

  for (const [id, unit] of Object.entries(units)) {
    if (!unit.isOnBoard) continue;

    const { moraleState, cbfMarker } = unit;

    if (moraleState === 'shaken' && !cbfMarker) {
      // LOB §6.4 — shaken units that did not take a loss auto-recover to normal
      updated[id] = { ...unit, moraleState: 'normal' };
    } else if (moraleState === 'disorganized') {
      // LOB §6.4 — disorganized units automatically flip to shaken
      updated[id] = { ...unit, moraleState: 'shaken' };
    } else if (moraleState === 'routed') {
      // LOB §6.4 — routed units require an individual rally-eligibility roll (§6.3)
      unitsPendingRallyRoll.push(id);
    }
    // shaken with cbfMarker: no automatic recovery — stays shaken (must roll §6.3)
    // normal / bloodlust: no action
  }

  // Shaken units with cbfMarker also need a §6.3 roll to recover
  for (const [id, unit] of Object.entries(updated)) {
    if (!unit.isOnBoard) continue;
    if (
      unit.moraleState === 'shaken' &&
      units[id]?.moraleState === 'shaken' &&
      units[id]?.cbfMarker
    ) {
      unitsPendingRallyRoll.push(id);
    }
  }

  return { units: updated, unitsPendingRallyRoll };
}
