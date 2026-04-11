/**
 * Morale table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Source: LOB_CHARTS p.5 (Morale Table) and p.4 (Additive Morale Effects Chart).
 * No SM-specific overrides to either table.
 */

// ─── Morale state constants ────────────────────────────────────────────────────

/**
 * Legal morale states for LOB v2.0 units.
 * LOB_CHARTS p.4 — Morale State Effects Chart.
 */
export const MORALE_STATES = Object.freeze(['bl', 'normal', 'shaken', 'dg', 'rout']);

// ─── Morale Table ──────────────────────────────────────────────────────────────

/**
 * Cell factory helpers — used only to build the table below.
 * Not exported; callers use the typed objects returned by moraleTableResult().
 */
const NE = null; // no effect (— in chart)
const BL = Object.freeze({ type: 'bl', retreatHexes: 0, spLoss: 0 }); // Blood Lust — LOB §6.2
const sh = (b, l = 0) => Object.freeze({ type: 'shaken', retreatHexes: b, spLoss: l });
const dg = (b, l = 0) => Object.freeze({ type: 'dg', retreatHexes: b, spLoss: l });
const ro = (b, l = 0) => Object.freeze({ type: 'rout', retreatHexes: b, spLoss: l });

/**
 * Morale Table — complete cell values.
 * LOB_CHARTS p.5 — LOB §6.1.
 *
 * Outer index: diceRoll - 2 (range 2–14 → indices 0–12)
 * Inner index: morale rating A=0, B=1, C=2, D=3, E=4, F=5
 *
 * null  = No effect
 * BL    = Blood Lust
 * sh(b, l) = Shaken, retreat b hexes, lose l SPs
 * dg(b, l) = Defensive Ground (Disorganized), retreat b hexes, lose l SPs
 * ro(b, l) = Rout, retreat b hexes, lose l SPs
 *
 * SP losses are taken AFTER retreat (LOB §6.1 footnote).
 */
export const MORALE_TABLE = Object.freeze(
  [
    //             A         B         C         D         E         F
    /* roll 2 */ [BL, BL, BL, NE, NE, NE],
    /* roll 3 */ [BL, BL, NE, NE, NE, NE],
    /* roll 4 */ [BL, NE, NE, NE, NE, sh(1)],
    /* roll 5 */ [NE, NE, NE, NE, sh(1), sh(2)],
    /* roll 6 */ [NE, NE, NE, sh(1), sh(2), dg(3, 1)],
    /* roll 7 */ [NE, NE, NE, sh(2), dg(3, 1), dg(4, 1)],
    /* roll 8 */ [NE, NE, sh(1), dg(3, 1), dg(3, 1), dg(4, 2)],
    /* roll 9 */ [NE, sh(1), sh(2, 1), dg(3, 1), dg(4, 2), dg(4, 2)],
    /* roll 10 */ [sh(1), sh(1, 1), dg(3, 1), dg(4, 2), dg(4, 2), ro(6, 2)],
    /* roll 11 */ [sh(2, 1), dg(3, 1), dg(4, 1), dg(4, 2), ro(6, 2), ro(6, 3)],
    /* roll 12 */ [dg(3, 1), dg(4, 1), dg(4, 2), ro(6, 2), ro(6, 3), ro(6, 4)],
    /* roll 13 */ [dg(3, 1), dg(4, 2), ro(6, 2), ro(6, 3), ro(6, 4), ro(6, 4)],
    /* roll 14 */ [dg(3, 2), ro(6, 2), ro(6, 3), ro(6, 4), ro(6, 4), ro(6, 4)],
  ].map((row) => Object.freeze(row))
);

/** Morale rating letter → column index (0=A … 5=F). */
export const MORALE_RATING_INDEX = Object.freeze({ A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 });

// ─── Additive Morale Effects Chart ────────────────────────────────────────────

/**
 * Additive Morale Effects Chart — resolved state transitions.
 * LOB_CHARTS p.4 — LOB §6.2a.
 *
 * Keys: `${currentState}/${incomingResult}` where incomingResult is
 *   'bl'|'normal'|'shaken'|'dg'|'rout'|'townHex'
 *
 * Value: { newState, suppressRetreatsAndLosses }
 *   newState: resolved morale state string
 *   suppressRetreatsAndLosses: true if the asterisk (*) rule applies — BL unit
 *     transitions to a bad state but ignores retreat and SP loss (LOB §6.2a).
 */
export const ADDITIVE_MORALE_EFFECTS = Object.freeze({
  // LOB_CHARTS p.4 — BL current state
  'bl/bl': { newState: 'bl', suppressRetreatsAndLosses: false },
  'bl/normal': { newState: 'bl', suppressRetreatsAndLosses: false },
  'bl/shaken': { newState: 'shaken', suppressRetreatsAndLosses: true }, // * — ignore retreat & loss
  'bl/dg': { newState: 'dg', suppressRetreatsAndLosses: true }, // * — ignore retreat & loss
  'bl/rout': { newState: 'rout', suppressRetreatsAndLosses: true }, // * — ignore retreat & loss
  'bl/townHex': { newState: 'dg', suppressRetreatsAndLosses: false }, // LOB §1.7g

  // LOB_CHARTS p.4 — Normal current state
  'normal/bl': { newState: 'bl', suppressRetreatsAndLosses: false },
  'normal/normal': { newState: 'normal', suppressRetreatsAndLosses: false },
  'normal/shaken': { newState: 'shaken', suppressRetreatsAndLosses: false },
  'normal/dg': { newState: 'dg', suppressRetreatsAndLosses: false },
  'normal/rout': { newState: 'rout', suppressRetreatsAndLosses: false },
  'normal/townHex': { newState: 'dg', suppressRetreatsAndLosses: false }, // LOB §1.7g

  // LOB_CHARTS p.4 — Shaken current state
  'shaken/bl': { newState: 'bl', suppressRetreatsAndLosses: false },
  'shaken/normal': { newState: 'shaken', suppressRetreatsAndLosses: false },
  'shaken/shaken': { newState: 'shaken', suppressRetreatsAndLosses: false },
  'shaken/dg': { newState: 'dg', suppressRetreatsAndLosses: false },
  'shaken/rout': { newState: 'rout', suppressRetreatsAndLosses: false },
  'shaken/townHex': { newState: 'dg', suppressRetreatsAndLosses: false }, // LOB §1.7g

  // LOB_CHARTS p.4 — DG current state
  'dg/bl': { newState: 'normal', suppressRetreatsAndLosses: false },
  'dg/normal': { newState: 'dg', suppressRetreatsAndLosses: false },
  'dg/shaken': { newState: 'dg', suppressRetreatsAndLosses: false },
  'dg/dg': { newState: 'rout', suppressRetreatsAndLosses: false },
  'dg/rout': { newState: 'rout', suppressRetreatsAndLosses: false },
  'dg/townHex': { newState: 'dg', suppressRetreatsAndLosses: false }, // LOB §1.7g

  // LOB_CHARTS p.4 — Rout current state
  'rout/bl': { newState: 'shaken', suppressRetreatsAndLosses: false },
  'rout/normal': { newState: 'rout', suppressRetreatsAndLosses: false },
  'rout/shaken': { newState: 'rout', suppressRetreatsAndLosses: false },
  'rout/dg': { newState: 'rout', suppressRetreatsAndLosses: false },
  'rout/rout': { newState: 'rout', suppressRetreatsAndLosses: false },
  'rout/townHex': { newState: 'rout', suppressRetreatsAndLosses: false }, // LOB §1.7g
});

// ─── Modifier constants ────────────────────────────────────────────────────────

/**
 * All morale table die-roll modifiers.
 * LOB_CHARTS p.5 — Morale Table Modifiers box. LOB §6.1.
 * Positive values increase the roll (bad for the target); negative decrease it (good).
 */
export const MORALE_MODIFIERS = Object.freeze({
  shakenOrDG: 1, // LOB §6.1 — checking unit is currently Shaken or DG
  wrecked: 3, // LOB §6.1 — checking unit is Wrecked
  rear: 2, // LOB §6.1 — fire/charge came from a rear hex
  small: 1, // LOB §6.1 — target is Small (≤3 SP, not Open Order Capable, range 1 or charge)
  cowardlyLegs: 1, // LOB §6.5 — Cowardly Legs condition triggered
  night: 3, // LOB §6.1 — night turn
  artilleryCavalryFromSmallArms: 1, // LOB §6.1 footnote 4 — arty/cav checked by small arms fire
  protectiveTerrain: -1, // LOB §6.1 footnote 1 — stone wall, rock ledge, slope, sunken road, boulder
});

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up a raw morale result from the Morale Table without applying modifiers.
 * LOB_CHARTS p.5 — LOB §6.1.
 *
 * @param {'A'|'B'|'C'|'D'|'E'|'F'} rating - unit morale rating
 * @param {number} diceRoll - effective 2d6 total (2–14; values outside range are clamped)
 * @returns {{ type: string, retreatHexes: number, spLoss: number } | null}
 *   null = no effect; object describes the morale result
 */
export function moraleTableResult(rating, diceRoll) {
  const colIdx = MORALE_RATING_INDEX[rating];
  if (colIdx === undefined) return null;

  // Clamp to table range 2-14
  const clampedRoll = Math.max(2, Math.min(14, diceRoll));
  const rowIdx = clampedRoll - 2;

  return MORALE_TABLE[rowIdx][colIdx];
}

/**
 * Compute the effective 2d6 dice total after applying morale modifiers.
 * LOB §6.1 — Morale Table Modifiers.
 *
 * Range 10+ special rule: at range 10 or more, only terrain and leader modifiers apply;
 * all other modifiers are ignored (LOB §6.1).
 *
 * @param {number} rawRoll - 2d6 base roll (2–12)
 * @param {object} mods - modifier flags
 * @param {number} [mods.leaderMoraleValue=0] - subtract this value from the roll (LOB §6.1)
 * @param {boolean} [mods.isShakenOrDG=false]
 * @param {boolean} [mods.isWrecked=false]
 * @param {boolean} [mods.isRear=false]
 * @param {boolean} [mods.isSmall=false]
 * @param {boolean} [mods.cowardlyLegs=false]
 * @param {boolean} [mods.isNight=false]
 * @param {boolean} [mods.isArtilleryOrCavalryFromSmallArms=false]
 * @param {boolean} [mods.hasProtectiveTerrain=false]
 * @param {number} [mods.range=0] - fire range (for range 10+ special rule)
 * @returns {number} effective roll (may exceed 12 or fall below 2; clamp when looking up)
 */
export function computeEffectiveRoll(rawRoll, mods = {}) {
  const {
    leaderMoraleValue = 0,
    isShakenOrDG = false,
    isWrecked = false,
    isRear = false,
    isSmall = false,
    cowardlyLegs = false,
    isNight = false,
    isArtilleryOrCavalryFromSmallArms = false,
    hasProtectiveTerrain = false,
    range = 0,
  } = mods;

  // LOB §6.1 — range 10+ special rule: only terrain and leader modifiers apply
  const longRange = range >= 10;

  let total = rawRoll;
  total -= leaderMoraleValue; // LOB §6.1 — leader's morale value subtracts from roll

  if (!longRange) {
    // LOB §6.1 — standard-range modifiers
    if (isShakenOrDG) total += MORALE_MODIFIERS.shakenOrDG;
    if (isWrecked) total += MORALE_MODIFIERS.wrecked;
    if (isRear) total += MORALE_MODIFIERS.rear;
    if (isSmall) total += MORALE_MODIFIERS.small;
    if (cowardlyLegs) total += MORALE_MODIFIERS.cowardlyLegs;
    if (isNight) total += MORALE_MODIFIERS.night;
    if (isArtilleryOrCavalryFromSmallArms) total += MORALE_MODIFIERS.artilleryCavalryFromSmallArms;
  }

  // LOB §6.1 footnote 1 — protective terrain applies at all ranges
  if (hasProtectiveTerrain) total += MORALE_MODIFIERS.protectiveTerrain;

  return total;
}

/**
 * Perform a full morale check: apply modifiers to the roll and look up the result.
 * LOB §6.1.
 *
 * @param {'A'|'B'|'C'|'D'|'E'|'F'} rating - unit morale rating
 * @param {object} modifiers - same shape as computeEffectiveRoll() mods parameter
 * @param {number} diceRoll - raw 2d6 roll (2–12)
 * @returns {{
 *   effectiveRoll: number,
 *   type: string,
 *   retreatHexes: number,
 *   spLoss: number,
 *   leaderLossCheck: boolean
 * }}
 */
export function moraleResult(rating, modifiers, diceRoll) {
  const effectiveRoll = computeEffectiveRoll(diceRoll, modifiers);
  const raw = moraleTableResult(rating, effectiveRoll);

  if (!raw) {
    return { effectiveRoll, type: 'noEffect', retreatHexes: 0, spLoss: 0, leaderLossCheck: false };
  }

  // LOB §6.1 — SP losses trigger a leader loss check
  const leaderLossCheck = raw.spLoss > 0;

  return {
    effectiveRoll,
    type: raw.type,
    retreatHexes: raw.retreatHexes,
    spLoss: raw.spLoss,
    leaderLossCheck,
  };
}

/**
 * Resolve a morale state transition using the Additive Morale Effects Chart.
 * LOB §6.2a.
 *
 * @param {'bl'|'normal'|'shaken'|'dg'|'rout'} currentState
 * @param {'bl'|'normal'|'shaken'|'dg'|'rout'|'townHex'} incomingResult
 *   Use 'normal' when the morale check had no adverse effect (null from moraleTableResult).
 * @returns {{ newState: string, suppressRetreatsAndLosses: boolean } | null}
 *   null if the combination is not in the chart.
 */
export function moraleTransition(currentState, incomingResult) {
  return ADDITIVE_MORALE_EFFECTS[`${currentState}/${incomingResult}`] ?? null;
}
