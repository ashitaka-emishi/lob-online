/**
 * Closing Roll table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Source: LOB_CHARTS p.2 (Closing Roll Table §3.5).
 * No SM-specific overrides to this table.
 *
 * Note: §7.0g "Additional Charge Modifiers" apply to the defender's post-charge
 * Morale Check, NOT to the Closing Roll. They are not implemented here.
 */

// ─── Closing Roll Table ────────────────────────────────────────────────────────

/**
 * Success thresholds for the Closing Roll (one d6).
 * LOB_CHARTS §3.5 — modified die roll must meet or exceed the threshold to pass.
 * Ratings D, E, and F share the same threshold ("D or worse").
 */
export const CLOSING_ROLL_THRESHOLDS = Object.freeze({
  A: 2, // LOB_CHARTS §3.5
  B: 3, // LOB_CHARTS §3.5
  C: 4, // LOB_CHARTS §3.5
  D: 5, // LOB_CHARTS §3.5 — "D or worse"
  E: 5, // LOB_CHARTS §3.5 — same as D
  F: 5, // LOB_CHARTS §3.5 — same as D
});

// ─── Modifier constants ────────────────────────────────────────────────────────

/**
 * Closing Roll die-roll modifiers.
 * LOB_CHARTS §3.5 — "Die Roll Modifiers" block.
 * Positive values help the attacker (raise the modified roll).
 */
// #320 — modifier key array consumed by the route layer's pickMods() allowlist
export const CLOSING_BOOL_MOD_KEYS = Object.freeze([
  'hasLeaderMorale2Plus',
  'isRear',
  'isShaken',
  'frontalArtilleryWithCanister',
  'startsAdjacentToTarget',
  'targetInBreastworks',
]);

export const CLOSING_ROLL_MODIFIERS = Object.freeze({
  leaderMoraleValue2Plus: 1, // LOB_CHARTS §3.5 — leader with Morale Value 2+ in charging stack
  rear: 1, // LOB_CHARTS §3.5 — charging into a Rear hex
  shaken: -1, // LOB_CHARTS §3.5 — charging stack is Shaken
  frontalArtilleryWithCanister: -1, // LOB_CHARTS §3.5 — target hex has frontal Arty with Canister
  startsAdjacentOrBreastworks: -3, // LOB_CHARTS §3.5 — starts adjacent to target hex OR in Breastworks
  // SM §4.1 / LOB_GAME_UPDATES SM — no Breastworks in South Mountain; the Breastworks
  // half of the -3 condition can never trigger in SM, but the "adjacent to target" half still can.
});

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the modified die roll for a Closing Roll.
 * LOB_CHARTS §3.5 — die roll modifiers applied before threshold comparison.
 *
 * @param {object} mods
 * @param {boolean} [mods.hasLeaderMorale2Plus=false] - attacking stack has leader with Morale Value 2+
 * @param {boolean} [mods.isRear=false]               - charging into a Rear hex
 * @param {boolean} [mods.isShaken=false]             - charging stack is Shaken
 * @param {boolean} [mods.frontalArtilleryWithCanister=false] - target hex has frontal Arty with Canister
 * @param {boolean} [mods.startsAdjacentToTarget=false] - stack starts its move adjacent to target hex
 * @param {boolean} [mods.targetInBreastworks=false]  - target is in Breastworks (never applies in SM)
 * @param {number}  diceRoll - raw 1d6 result (1–6)
 * @returns {number} modified die roll
 */
export function computeClosingRoll(mods, diceRoll) {
  const {
    hasLeaderMorale2Plus = false,
    isRear = false,
    isShaken = false,
    frontalArtilleryWithCanister = false,
    startsAdjacentToTarget = false,
    targetInBreastworks = false,
  } = mods;

  let roll = diceRoll;

  if (hasLeaderMorale2Plus) roll += CLOSING_ROLL_MODIFIERS.leaderMoraleValue2Plus; // LOB_CHARTS §3.5
  if (isRear) roll += CLOSING_ROLL_MODIFIERS.rear; // LOB_CHARTS §3.5
  if (isShaken) roll += CLOSING_ROLL_MODIFIERS.shaken; // LOB_CHARTS §3.5
  if (frontalArtilleryWithCanister) roll += CLOSING_ROLL_MODIFIERS.frontalArtilleryWithCanister; // LOB_CHARTS §3.5

  // LOB_CHARTS §3.5 — -3 applies when either the stack starts adjacent OR target is in Breastworks
  // SM §4.1: Breastworks never built in SM, so targetInBreastworks is always false in SM play
  if (startsAdjacentToTarget || targetInBreastworks)
    roll += CLOSING_ROLL_MODIFIERS.startsAdjacentOrBreastworks;

  return roll;
}

/**
 * Resolve a Closing Roll result.
 * LOB_CHARTS §3.5 — one d6, modified roll must meet or exceed the morale rating threshold.
 *
 * Open Order Capable units have an automatic pass and never roll (LOB_CHARTS p.4).
 *
 * @param {'A'|'B'|'C'|'D'|'E'|'F'} moraleRating
 * @param {object} mods - same shape as computeClosingRoll() mods parameter
 * @param {number} diceRoll - raw 1d6 result (1–6)
 * @returns {{ pass: boolean, threshold: number, modifiedRoll: number }}
 */
export function closingRollResult(moraleRating, mods, diceRoll) {
  const threshold = CLOSING_ROLL_THRESHOLDS[moraleRating];
  if (threshold === undefined) {
    return { pass: false, threshold: null, modifiedRoll: diceRoll };
  }

  const modifiedRoll = computeClosingRoll(mods, diceRoll);
  const pass = modifiedRoll >= threshold;

  return { pass, threshold, modifiedRoll };
}
