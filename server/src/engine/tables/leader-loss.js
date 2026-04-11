/**
 * Leader Loss table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Source: LOB_CHARTS p.5 (Leader Loss Table §9.1a).
 * No SM-specific overrides. No errata affecting this table.
 */

// ─── Leader Loss Table ────────────────────────────────────────────────────────

/**
 * Legal result values from the Leader Loss Table.
 * LOB_CHARTS §9.1a — four possible results.
 */
export const LEADER_LOSS_RESULTS = Object.freeze(['noEffect', 'captured', 'wounded', 'killed']);

/**
 * Result breakpoints per situation type.
 * LOB_CHARTS §9.1a — two-dice roll thresholds (before any modifier).
 *
 * The "Capture" situation is the only one that can produce 'captured'.
 * "Defender" and "Attacker" columns only apply when the respective side has a loss
 * during a Charge sequence — the caller must enforce this precondition.
 *
 * For each situation: { woundedMin, killedMin, capturedMin?, capturedMax? }
 * Any roll below woundedMin → noEffect.
 */
const SITUATION_BREAKPOINTS = Object.freeze({
  // LOB_CHARTS §9.1a — Other Cases: 2-10 → noEffect, 11 → wounded, 12+ → killed
  other: { woundedMin: 11, killedMin: 12 },

  // LOB_CHARTS §9.1a — Capture: 2-8 → noEffect, 9-10 → captured, 11 → wounded, 12+ → killed
  capture: { capturedMin: 9, capturedMax: 10, woundedMin: 11, killedMin: 12 },

  // LOB_CHARTS §9.1a — Defender (Charge, if side has loss): 2-9 → noEffect, 10 → wounded, 11+ → killed
  defender: { woundedMin: 10, killedMin: 11 },

  // LOB_CHARTS §9.1a — Attacker (Charge, if side has loss): 2-7 → noEffect, 8 → wounded, 9+ → killed
  attacker: { woundedMin: 8, killedMin: 9 },
});

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up a Leader Loss result.
 * LOB_CHARTS §9.1a — two-dice roll; +1 if fire is from a Sharpshooter-Capable unit.
 *
 * The Defender and Attacker situations apply only when the respective side has a
 * SP loss during the Charge sequence — this precondition is enforced by the caller.
 *
 * @param {'other'|'capture'|'defender'|'attacker'} situation
 * @param {boolean} isSharpshooter - true if fire originates from a Sharpshooter-Capable unit
 * @param {number} diceRoll - raw 2d6 result (2–12)
 * @returns {{ result: 'noEffect'|'captured'|'wounded'|'killed' }}
 */
export function leaderLossResult(situation, isSharpshooter, diceRoll) {
  const bp = SITUATION_BREAKPOINTS[situation];
  if (!bp) return { result: 'noEffect' };

  // LOB_CHARTS §9.1a — +1 if fire is from a Sharpshooter-Capable unit
  const effectiveRoll = diceRoll + (isSharpshooter ? 1 : 0);

  if (effectiveRoll >= bp.killedMin) return { result: 'killed' };
  if (effectiveRoll >= bp.woundedMin) return { result: 'wounded' };

  // Capture is only possible in the 'capture' situation column
  if (
    bp.capturedMin !== undefined &&
    effectiveRoll >= bp.capturedMin &&
    effectiveRoll <= bp.capturedMax
  ) {
    return { result: 'captured' };
  }

  return { result: 'noEffect' };
}
