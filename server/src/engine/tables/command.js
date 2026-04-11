/**
 * Command table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Sources: LOB_CHARTS p.1 (§10.6, §10.6a, §10.7b, §10.8c, §9.1e),
 *          LOB_RULES pp.22, 27-29, LOB_GAME_UPDATES SM section.
 *
 * SM Override: All Army Commanders rated Normal (LOB_GAME_UPDATES SM §).
 */

// ─── Command Roll (§10.6) ─────────────────────────────────────────────────────

/**
 * Threshold for a successful Command Roll.
 * LOB_CHARTS §10.6 — 2d6, modified roll of 10+ = success.
 */
export const COMMAND_ROLL_THRESHOLD = 10;

/**
 * Bonus for Deployment from a Move Order or a formation currently in Reserve.
 * LOB_CHARTS §10.6 — +2 for Reserve or Deployment Command Rolls.
 */
export const COMMAND_ROLL_RESERVE_BONUS = 2;

/**
 * Resolve a Command Roll.
 * LOB_CHARTS §10.6 — 2d6 + commandValue (+ 2 if reserve/deployment) ≥ 10 = yes.
 *
 * @param {number} commandValue - leader's Command Value (printed on counter)
 * @param {boolean} isReserve - true if formation is currently in Reserve status
 * @param {boolean} isDeployment - true if deploying from a Move Order
 * @param {number} diceRoll - 2d6 result (2–12)
 * @returns {{ yes: boolean, modifiedRoll: number }}
 */
export function commandRollResult(commandValue, isReserve, isDeployment, diceRoll) {
  const bonus = isReserve || isDeployment ? COMMAND_ROLL_RESERVE_BONUS : 0; // LOB_CHARTS §10.6
  const modifiedRoll = diceRoll + commandValue + bonus;
  return { yes: modifiedRoll >= COMMAND_ROLL_THRESHOLD, modifiedRoll };
}

// ─── Order Delivery Turns (§10.6a) ───────────────────────────────────────────

/**
 * Army CO Awareness values in turns.
 * LOB_CHARTS §10.6a — delivery time contribution from CO's awareness level.
 * SM Override (LOB_GAME_UPDATES SM): all SM army COs are Normal.
 */
export const AWARENESS_TURNS = Object.freeze({
  onFire: 1, // LOB_CHARTS §10.6a
  normal: 2, // LOB_CHARTS §10.6a — SM override: all SM army COs use this value
  notSoSure: 4, // LOB_CHARTS §10.6a
  comatose: 8, // LOB_CHARTS §10.6a
});

/**
 * Distance-based delivery turns.
 * LOB_CHARTS §10.6a — delivery time contribution from HQ-to-HQ distance.
 */
export const DISTANCE_TURNS = Object.freeze({
  withinRadius: 1, // LOB_CHARTS §10.6a — HQs within command radius
  beyondRadius: 2, // LOB_CHARTS §10.6a — beyond command radius
  beyondRadiusFar: 3, // LOB_CHARTS §10.6a — beyond radius AND 50+ hexes away
});

/**
 * Compute order delivery turns.
 * LOB_CHARTS §10.6a — total = awarenessValue + distanceTurns; halved (round down) for Reserve orders.
 *
 * SM Override: For SM, armyCOType is always 'normal' (LOB_GAME_UPDATES SM).
 *
 * @param {'onFire'|'normal'|'notSoSure'|'comatose'} armyCOType
 * @param {'withinRadius'|'beyondRadius'|'beyondRadiusFar'} distanceCategory
 * @param {boolean} [isReserveOrder=false] - true if this is a Reserve order (halves delivery time)
 * @returns {{ turnsToDeliver: number }}
 */
export function orderDeliveryTurns(armyCOType, distanceCategory, isReserveOrder = false) {
  const awareness = AWARENESS_TURNS[armyCOType] ?? AWARENESS_TURNS.normal;
  const distance = DISTANCE_TURNS[distanceCategory] ?? DISTANCE_TURNS.withinRadius;
  const total = awareness + distance;
  const turnsToDeliver = isReserveOrder ? Math.floor(total / 2) : total; // LOB_CHARTS §10.6a
  return { turnsToDeliver };
}

// ─── Fluke Stoppage (§10.7b) ──────────────────────────────────────────────────

/**
 * Fluke Stoppage Leader Roll thresholds (Step 2).
 * LOB_CHARTS §10.7b — minimum 2d6 roll to AVOID stoppage on the Leader Roll.
 * If roll is less than threshold, Fluke Stoppage occurs.
 */
export const FLUKE_LEADER_THRESHOLDS = Object.freeze({
  4: 6, // LOB_CHARTS §10.7b — Command Value 4: pass on 6+
  3: 7, // LOB_CHARTS §10.7b — Command Value 3: pass on 7+
  2: 8, // LOB_CHARTS §10.7b — Command Value 2 or less: pass on 8+
  1: 8, // LOB_CHARTS §10.7b — same as 2
  0: 8, // LOB_CHARTS §10.7b — same as 2
});

/**
 * Resolve a Fluke Stoppage check for one division.
 * LOB_CHARTS §10.7b — two-step roll.
 *
 * Step 1 (Base Check): 2d6 + modifiers ≥ 6 → no stoppage (pass), no step 2 needed.
 * Step 2 (Leader Roll): Only if step 1 fails. 2d6 (−1 at night) ≥ threshold → no stoppage.
 *                       If step 2 also fails: Fluke Stoppage occurs.
 *
 * SM note: 9th Corps cavalry units cannot fulfill reserve requirements (LOB_GAME_UPDATES SM).
 * This is a data validation concern at the caller level, not handled here.
 *
 * @param {number} commandValue - divisional leader's Command Value
 * @param {boolean} hasReserve - whether the division has a qualifying Reserve (§10.7c)
 * @param {boolean} isNight - whether this is a Night turn
 * @param {number} step1Roll - 2d6 result for the Base Check
 * @param {number} step2Roll - 2d6 result for the Leader Roll (needed if step 1 fails)
 * @param {boolean} [originalLeaderWounded=false] - original divisional leader was Wounded/Killed
 * @returns {{
 *   step1EffectiveRoll: number,
 *   basePass: boolean,
 *   step2Required: boolean,
 *   step2EffectiveRoll: number|null,
 *   step2Threshold: number|null,
 *   stoppage: boolean
 * }}
 */
export function flukeStoppageResult(
  commandValue,
  hasReserve,
  isNight,
  step1Roll,
  step2Roll,
  originalLeaderWounded = false
) {
  // Step 1 Base Check modifiers (LOB_CHARTS §10.7b)
  let step1Mod = 0;
  if (hasReserve && !isNight) step1Mod += 2; // +2 Reserve — ignored at Night
  if (originalLeaderWounded) step1Mod -= 1; // -1 original leader Wounded/Killed
  if (isNight) step1Mod -= 2; // -2 Night turn

  const step1EffectiveRoll = step1Roll + step1Mod;
  const basePass = step1EffectiveRoll >= 6; // LOB_CHARTS §10.7b — pass on 6+

  if (basePass) {
    return {
      step1EffectiveRoll,
      basePass: true,
      step2Required: false,
      step2EffectiveRoll: null,
      step2Threshold: null,
      stoppage: false,
    };
  }

  // Step 2 Leader Roll (LOB_CHARTS §10.7b)
  const step2EffectiveRoll = step2Roll + (isNight ? -1 : 0); // -1 at Night
  const cvClamped = Math.min(4, Math.max(0, commandValue));
  const step2Threshold = FLUKE_LEADER_THRESHOLDS[cvClamped] ?? 8;
  const step2Passed = step2EffectiveRoll >= step2Threshold;

  return {
    step1EffectiveRoll,
    basePass: false,
    step2Required: true,
    step2EffectiveRoll,
    step2Threshold,
    stoppage: !step2Passed,
  };
}

// ─── Attack Recovery (§10.8c) ────────────────────────────────────────────────

/**
 * Attack Recovery Base Check thresholds (Step 1).
 * LOB_CHARTS §10.8c — 2d6 must meet or exceed threshold to proceed to step 2.
 */
export const RECOVERY_BASE_THRESHOLDS = Object.freeze({
  clean: 8, // LOB_CHARTS §10.8c — no Wrecked or Dead units
  wrecked: 9, // LOB_CHARTS §10.8c — has Wrecked but no Dead units
  dead: 10, // LOB_CHARTS §10.8c — has Dead (eliminated) units
});

/**
 * Attack Recovery Leader Roll thresholds (Step 2).
 * LOB_CHARTS §10.8c — 2d6 must meet or exceed threshold for successful recovery.
 */
export const RECOVERY_LEADER_THRESHOLDS = Object.freeze({
  4: 7, // LOB_CHARTS §10.8c — Command Value 4: recover on 7+
  3: 8, // LOB_CHARTS §10.8c — Command Value 3: recover on 8+
  2: 9, // LOB_CHARTS §10.8c — Command Value 2: recover on 9+
  1: 10, // LOB_CHARTS §10.8c — Command Value 1 or 0: recover on 10+
  0: 10, // LOB_CHARTS §10.8c — same as 1
});

/**
 * Resolve an Attack Recovery check.
 * LOB_CHARTS §10.8c — two-step roll; checked every turn until recovery achieved.
 *
 * Ignore Open Order and Sharpshooter units when assessing division status.
 * Automatic recovery occurs on the first Twilight turn of each new calendar day.
 *
 * @param {'clean'|'wrecked'|'dead'} divisionStatus - worst condition in the division
 * @param {number} commandValue - divisional leader's Command Value
 * @param {number} step1Roll - 2d6 result for the Base Check (no modifiers)
 * @param {number} step2Roll - 2d6 result for the Leader Roll (needed if step 1 passes)
 * @returns {{
 *   step1Threshold: number,
 *   basePass: boolean,
 *   step2Required: boolean,
 *   step2EffectiveRoll: number|null,
 *   step2Threshold: number|null,
 *   recovered: boolean
 * }}
 */
export function attackRecoveryResult(divisionStatus, commandValue, step1Roll, step2Roll) {
  const step1Threshold = RECOVERY_BASE_THRESHOLDS[divisionStatus] ?? RECOVERY_BASE_THRESHOLDS.dead;
  const basePass = step1Roll >= step1Threshold; // LOB_CHARTS §10.8c — no modifiers on step 1

  if (!basePass) {
    return {
      step1Threshold,
      basePass: false,
      step2Required: false,
      step2EffectiveRoll: null,
      step2Threshold: null,
      recovered: false,
    };
  }

  // Step 2 Leader Roll (LOB_CHARTS §10.8c)
  const cvClamped = Math.min(4, Math.max(0, commandValue));
  const step2Threshold = RECOVERY_LEADER_THRESHOLDS[cvClamped] ?? 10;
  const recovered = step2Roll >= step2Threshold;

  return {
    step1Threshold,
    basePass: true,
    step2Required: true,
    step2EffectiveRoll: step2Roll,
    step2Threshold,
    recovered,
  };
}

// ─── Zero Rule (§9.1e) ───────────────────────────────────────────────────────

/**
 * Zero Rule MA results.
 * LOB_CHARTS §9.1e — 1d6 roll determines movement allowance for Zero-command-value brigades.
 *
 * Applies to: brigade leaders with Command Value 0 (including Repl leaders),
 * ONLY when the brigade is following Attack orders. Does NOT apply if the Zero
 * was just gained this Activity Phase or if the leader is above brigade level.
 */
export const ZERO_RULE_TABLE = Object.freeze([
  { rollMin: 1, rollMax: 1, ma: 'none' }, // LOB_CHARTS §9.1e — 1 → no MA
  { rollMin: 2, rollMax: 3, ma: 'half' }, // LOB_CHARTS §9.1e — 2-3 → half MA
  { rollMin: 4, rollMax: 6, ma: 'full' }, // LOB_CHARTS §9.1e — 4-6 → full MA
]);

/**
 * Resolve a Zero Rule die roll.
 * LOB_CHARTS §9.1e — one die; applies only to Zero-command brigades on Attack orders.
 *
 * @param {number} diceRoll - 1d6 result (1–6)
 * @returns {{ ma: 'none'|'half'|'full' }}
 */
export function zeroRuleResult(diceRoll) {
  for (const { rollMin, rollMax, ma } of ZERO_RULE_TABLE) {
    if (diceRoll >= rollMin && diceRoll <= rollMax) return { ma };
  }
  return { ma: 'full' }; // fallback for out-of-range input
}
