/**
 * Rally Phase table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Source: LOB_RULES §6.4 step 3; LOB_CHARTS Sequence of Play / Rally Phase.
 * No SM-specific overrides to this table.
 */

// ─── Rally Roll ───────────────────────────────────────────────────────────────

/**
 * LOB §6.4 step 3 — Routed unit rally roll.
 * Roll 1d6, add the Morale Value of one leader in the hex.
 * Modified total ≥ 5 → Routed converts to Disorganized (one step up).
 * Any other result → unit remains Routed.
 *
 * The unit's morale rating (A–F) is NOT used for this roll; the morale rating
 * applies only to the Morale Table (§6.1). Only Routed units make this roll.
 *
 * @param {number} dieRoll - 1d6 raw result (1–6)
 * @param {number} leaderMoraleValue - Morale Value of best available leader (0 if no leader)
 * @param {string} [currentMoraleState='routed'] - caller's morale state; only 'routed' units roll
 * @returns {{ success: boolean, modifiedRoll: number, newMoraleState: string|null }}
 *   success:        true when modifiedRoll ≥ 5
 *   modifiedRoll:   dieRoll + leaderMoraleValue
 *   newMoraleState: 'disorganized' on success; null on failure
 */
export function rallyRollResult(dieRoll, leaderMoraleValue) {
  const modifiedRoll = dieRoll + leaderMoraleValue;
  const success = modifiedRoll >= 5; // LOB §6.4 step 3 — 5 or more succeeds
  return {
    success,
    modifiedRoll,
    newMoraleState: success ? 'disorganized' : null, // LOB §6.4 — Routed → DG on success
  };
}

/**
 * Apply §6.4 automatic recovery steps to a units map before per-unit rally rolls.
 * LOB §6.4 — applied to all on-board units at Rally Phase entry:
 *   1. Remove all Sh markers → shaken units recover to normal (unconditional; no CBF gate)
 *   2. Flip all DG markers to Sh → disorganized units become shaken (unconditional)
 *   3. Routed units require an individual rally roll (§6.3); flagged in unitsPendingRallyRoll
 *
 * CBF markers do not affect morale recovery (LOB §5.8 lists only two CBF effects:
 * precludes By Caisson replenishment and applies a Combat Table shift). This function
 * must still be called BEFORE clearCbfMarkers() in index.js so the CBF clear follows
 * the rally application in the correct sequence-of-play order.
 *
 * @param {Record<string, object>} units - current unit state map
 * @returns {{ units: Record<string, object>, unitsPendingRallyRoll: string[] }}
 *   units:                  updated units map with §6.4 morale state changes applied
 *   unitsPendingRallyRoll:  unit IDs requiring a §6.3 rally roll (routed units only)
 */
export function applySection64AutoRecovery(units) {
  const updated = { ...units };
  const unitsPendingRallyRoll = [];

  for (const [id, unit] of Object.entries(units)) {
    if (!unit.isOnBoard) continue;

    const { moraleState } = unit;

    if (moraleState === 'shaken') {
      // LOB §6.4 step 1 — "Remove all Sh markers": unconditional, no CBF gate
      updated[id] = { ...unit, moraleState: 'normal' };
    } else if (moraleState === 'disorganized') {
      // LOB §6.4 step 2 — "Flip all DG markers to Sh": unconditional
      updated[id] = { ...unit, moraleState: 'shaken' };
    } else if (moraleState === 'routed') {
      // LOB §6.4 step 3 — routed units require an individual §6.3 rally roll
      unitsPendingRallyRoll.push(id);
    }
    // normal / bloodlust: no action
  }

  return { units: updated, unitsPendingRallyRoll };
}
