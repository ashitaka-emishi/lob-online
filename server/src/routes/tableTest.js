/**
 * Table Test Tool routes — POST endpoints for validating LOB v2.0 game table output.
 *
 * Mounted at /api/tools/table-test when MAP_EDITOR_ENABLED=true.
 * All routes are POST, all pure-computation, no game state, no map data.
 */

import { Router } from 'express';

import { combatResult, openingVolleyResult } from '../engine/tables/combat.js';
import { closingRollResult } from '../engine/tables/charge.js';
import {
  attackRecoveryResult,
  commandRollResult,
  flukeStoppageResult,
  orderDeliveryTurns,
  AWARENESS_TURNS,
  DISTANCE_TURNS,
  zeroRuleResult,
} from '../engine/tables/command.js';
import { leaderLossResult } from '../engine/tables/leader-loss.js';
import { moraleResult, moraleTransition, MORALE_STATES } from '../engine/tables/morale.js';

// ─── Allowlists ────────────────────────────────────────────────────────────────

/** #306 — known boolean modifier keys for the Morale Table (LOB §6.1) */
const MORALE_BOOL_MODS = [
  'isShakenOrDG',
  'isWrecked',
  'isRear',
  'isSmall',
  'cowardlyLegs',
  'isNight',
  'isArtilleryOrCavalryFromSmallArms',
  'hasProtectiveTerrain',
];

/** #306 — known boolean modifier keys for the Closing Roll Table (LOB_CHARTS §3.5) */
const CLOSING_BOOL_MODS = [
  'hasLeaderMorale2Plus',
  'isRear',
  'isShaken',
  'frontalArtilleryWithCanister',
  'startsAdjacentToTarget',
  'targetInBreastworks',
];

const VALID_OPENING_VOLLEY_CONDITIONS = new Set([
  'range1',
  'range2',
  'range3',
  'charge',
  'shiftOnly',
]);
const VALID_MORALE_RATINGS = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
const VALID_MORALE_STATES = new Set(MORALE_STATES);
const VALID_LEADER_SITUATIONS = new Set(['other', 'capture', 'defender', 'attacker']);
const VALID_ARMY_CO_TYPES = new Set(Object.keys(AWARENESS_TURNS));
const VALID_DISTANCE_CATEGORIES = new Set(Object.keys(DISTANCE_TURNS));
const VALID_DIVISION_STATUSES = new Set(['clean', 'wrecked', 'dead']);
const VALID_INCOMING_RESULTS = new Set(['bl', 'normal', 'shaken', 'dg', 'rout', 'townHex']);

// ─── Validation helpers ───────────────────────────────────────────────────────

/** Coerce `raw` to a finite number, with optional min/max range check. */
function requireNumber(raw, name, { min, max } = {}) {
  if (raw === undefined || raw === null) return { ok: false, error: `${name} is required` };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, error: `${name} must be a number` };
  if (min !== undefined && n < min) return { ok: false, error: `${name} must be ≥ ${min}` };
  if (max !== undefined && n > max) return { ok: false, error: `${name} must be ≤ ${max}` };
  return { ok: true, value: n };
}

/** Validate `raw` is a member of `allowSet`. */
function requireEnum(raw, name, allowSet) {
  if (!allowSet.has(raw)) {
    return {
      ok: false,
      error: `Invalid ${name}. Valid values: ${[...allowSet].join(', ')}`,
    };
  }
  return { ok: true, value: raw };
}

// ─── Modifier allowlist filter ────────────────────────────────────────────────

/**
 * Build a safe modifier object from raw client input.
 *
 * Only keys named in `boolKeys` (coerced with Boolean()) and `numKeys`
 * (coerced with Number(); NaN becomes 0) are forwarded to the engine.
 * All other properties are silently dropped, preventing prototype pollution
 * and unrecognised-field forwarding. — #306
 *
 * @param {unknown} raw          - untrusted input (from req.body.modifiers)
 * @param {string[]} boolKeys    - boolean modifier key names
 * @param {string[]} [numKeys=[]] - numeric modifier key names
 * @returns {object}
 */
function pickMods(raw, boolKeys, numKeys = []) {
  const src = typeof raw === 'object' && raw !== null ? raw : {};
  const out = {};
  for (const k of boolKeys) out[k] = Boolean(src[k]);
  for (const k of numKeys) {
    const n = Number(src[k]);
    out[k] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

// ─── Route wrapper ────────────────────────────────────────────────────────────

/** Wrap a route handler with a uniform try/catch → 500 response. */
function wrapTableRoute(routeName, fn) {
  return (req, res) => {
    try {
      return fn(req, res);
    } catch (err) {
      console.error(`[route] /table-test/${routeName} error:`, err);
      return res.status(500).json({ error: `Failed to compute ${routeName} result` });
    }
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// ── POST /combat ──────────────────────────────────────────────────────────────
// Body: { effectiveSPs, netColumnShifts, diceRoll }
// Returns: { resultType, spLoss, moraleCheckRequired, leaderLossCheckRequired,
//            finalColumn, depletionBand }
// LOB_CHARTS §5.6 — Combat Table
router.post(
  '/combat',
  wrapTableRoute('combat', (req, res) => {
    const { effectiveSPs, netColumnShifts, diceRoll } = req.body;
    const spsR = requireNumber(effectiveSPs, 'effectiveSPs');
    if (!spsR.ok) return res.status(400).json({ error: spsR.error });
    const shiftsR = requireNumber(netColumnShifts ?? 0, 'netColumnShifts');
    if (!shiftsR.ok) return res.status(400).json({ error: shiftsR.error });
    const rollR = requireNumber(diceRoll, 'diceRoll', { min: 2, max: 12 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    return res.json(combatResult(spsR.value, shiftsR.value, rollR.value));
  })
);

// ── POST /opening-volley ──────────────────────────────────────────────────────
// Body: { condition, diceRoll }
// Returns: { spLoss }
// LOB_CHARTS §5.4 — Opening Volley Table
router.post(
  '/opening-volley',
  wrapTableRoute('opening-volley', (req, res) => {
    const { condition, diceRoll } = req.body;
    const condR = requireEnum(condition, 'condition', VALID_OPENING_VOLLEY_CONDITIONS);
    if (!condR.ok) return res.status(400).json({ error: condR.error });
    const rollR = requireNumber(diceRoll, 'diceRoll', { min: 1, max: 6 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    return res.json(openingVolleyResult(condR.value, rollR.value));
  })
);

// ── POST /morale ───────────────────────────────────────────────────────────────
// Body: { rating, modifiers, diceRoll }
// Returns: { effectiveRoll, type, retreatHexes, spLoss, leaderLossCheck }
// LOB §6.1 — Morale Table
router.post(
  '/morale',
  wrapTableRoute('morale', (req, res) => {
    const { rating, modifiers = {}, diceRoll } = req.body;
    const ratingR = requireEnum(rating, 'rating', VALID_MORALE_RATINGS);
    if (!ratingR.ok) return res.status(400).json({ error: ratingR.error });
    const rollR = requireNumber(diceRoll, 'diceRoll', { min: 2, max: 12 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    // #306 — allowlist-filter modifier object before forwarding to engine
    const safeMods = pickMods(modifiers, MORALE_BOOL_MODS, ['leaderMoraleValue', 'range']);
    return res.json(moraleResult(ratingR.value, safeMods, rollR.value));
  })
);

// ── POST /morale-transition ────────────────────────────────────────────────────
// Body: { currentState, incomingResult }
// Returns: { newState, suppressRetreatsAndLosses } | null
// LOB §6.2a — Additive Morale Effects Chart
router.post(
  '/morale-transition',
  wrapTableRoute('morale-transition', (req, res) => {
    const { currentState, incomingResult } = req.body;
    if (!currentState || !incomingResult) {
      return res.status(400).json({ error: 'currentState and incomingResult are required' });
    }
    const stateR = requireEnum(currentState, 'currentState', VALID_MORALE_STATES);
    if (!stateR.ok) return res.status(400).json({ error: stateR.error });
    const incR = requireEnum(incomingResult, 'incomingResult', VALID_INCOMING_RESULTS);
    if (!incR.ok) return res.status(400).json({ error: incR.error });
    const result = moraleTransition(stateR.value, incR.value);
    if (result === null) {
      return res
        .status(400)
        .json({ error: `No transition defined for ${stateR.value}/${incR.value}` });
    }
    return res.json(result);
  })
);

// ── POST /closing-roll ────────────────────────────────────────────────────────
// Body: { moraleRating, modifiers, diceRoll }
// Returns: { pass, threshold, modifiedRoll }
// LOB_CHARTS §3.5 — Closing Roll Table
router.post(
  '/closing-roll',
  wrapTableRoute('closing-roll', (req, res) => {
    const { moraleRating, modifiers = {}, diceRoll } = req.body;
    const ratingR = requireEnum(moraleRating, 'moraleRating', VALID_MORALE_RATINGS);
    if (!ratingR.ok) return res.status(400).json({ error: ratingR.error });
    const rollR = requireNumber(diceRoll, 'diceRoll', { min: 1, max: 6 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    // #306 — allowlist-filter modifier object before forwarding to engine
    const safeMods = pickMods(modifiers, CLOSING_BOOL_MODS);
    return res.json(closingRollResult(ratingR.value, safeMods, rollR.value));
  })
);

// ── POST /leader-loss ─────────────────────────────────────────────────────────
// Body: { situation, isSharpshooter, diceRoll }
// Returns: { result }
// LOB_CHARTS §9.1a — Leader Loss Table
router.post(
  '/leader-loss',
  wrapTableRoute('leader-loss', (req, res) => {
    const { situation, isSharpshooter = false, diceRoll } = req.body;
    const sitR = requireEnum(situation, 'situation', VALID_LEADER_SITUATIONS);
    if (!sitR.ok) return res.status(400).json({ error: sitR.error });
    const rollR = requireNumber(diceRoll, 'diceRoll', { min: 2, max: 12 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    return res.json(leaderLossResult(sitR.value, Boolean(isSharpshooter), rollR.value));
  })
);

// ── POST /command-roll ────────────────────────────────────────────────────────
// Body: { commandValue, isReserve, isDeployment, diceRoll }
// Returns: { yes, modifiedRoll }
// LOB_CHARTS §10.6 — Command Roll Table
router.post(
  '/command-roll',
  wrapTableRoute('command-roll', (req, res) => {
    const { commandValue, isReserve = false, isDeployment = false, diceRoll } = req.body;
    const cvR = requireNumber(commandValue, 'commandValue');
    if (!cvR.ok) return res.status(400).json({ error: cvR.error });
    const rollR = requireNumber(diceRoll, 'diceRoll', { min: 2, max: 12 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    return res.json(
      commandRollResult(cvR.value, Boolean(isReserve), Boolean(isDeployment), rollR.value)
    );
  })
);

// ── POST /order-delivery ──────────────────────────────────────────────────────
// Body: { armyCOType, distanceCategory, isReserveOrder }
// Returns: { turnsToDeliver }
// LOB_CHARTS §10.6a — Order Delivery Table
router.post(
  '/order-delivery',
  wrapTableRoute('order-delivery', (req, res) => {
    const { armyCOType, distanceCategory, isReserveOrder = false } = req.body;
    const coR = requireEnum(armyCOType, 'armyCOType', VALID_ARMY_CO_TYPES);
    if (!coR.ok) return res.status(400).json({ error: coR.error });
    const distR = requireEnum(distanceCategory, 'distanceCategory', VALID_DISTANCE_CATEGORIES);
    if (!distR.ok) return res.status(400).json({ error: distR.error });
    return res.json(orderDeliveryTurns(coR.value, distR.value, Boolean(isReserveOrder)));
  })
);

// ── POST /fluke-stoppage ──────────────────────────────────────────────────────
// Body: { commandValue, hasReserve, isNight, step1Roll, step2Roll }
// Returns: { step1EffectiveRoll, basePass, step2Required, step2EffectiveRoll,
//            step2Threshold, stoppage }
// LOB_CHARTS §10.7b — Fluke Stoppage Table
router.post(
  '/fluke-stoppage',
  wrapTableRoute('fluke-stoppage', (req, res) => {
    const {
      commandValue,
      hasReserve = false,
      isNight = false,
      step1Roll,
      step2Roll = 7,
    } = req.body;
    const cvR = requireNumber(commandValue, 'commandValue');
    if (!cvR.ok) return res.status(400).json({ error: cvR.error });
    const s1R = requireNumber(step1Roll, 'step1Roll', { min: 2, max: 12 });
    if (!s1R.ok) return res.status(400).json({ error: s1R.error });
    const s2R = requireNumber(step2Roll, 'step2Roll', { min: 2, max: 12 });
    if (!s2R.ok) return res.status(400).json({ error: s2R.error });
    return res.json(
      flukeStoppageResult(cvR.value, Boolean(hasReserve), Boolean(isNight), s1R.value, s2R.value)
    );
  })
);

// ── POST /attack-recovery ─────────────────────────────────────────────────────
// Body: { divisionStatus, commandValue, step1Roll, step2Roll }
// Returns: { step1Threshold, basePass, step2Required, step2EffectiveRoll,
//            step2Threshold, recovered }
// LOB_CHARTS §10.8c — Attack Recovery Table
router.post(
  '/attack-recovery',
  wrapTableRoute('attack-recovery', (req, res) => {
    const { divisionStatus, commandValue, step1Roll, step2Roll = 7 } = req.body;
    const statusR = requireEnum(divisionStatus, 'divisionStatus', VALID_DIVISION_STATUSES);
    if (!statusR.ok) return res.status(400).json({ error: statusR.error });
    const cvR = requireNumber(commandValue, 'commandValue');
    if (!cvR.ok) return res.status(400).json({ error: cvR.error });
    const s1R = requireNumber(step1Roll, 'step1Roll', { min: 2, max: 12 });
    if (!s1R.ok) return res.status(400).json({ error: s1R.error });
    const s2R = requireNumber(step2Roll, 'step2Roll', { min: 2, max: 12 });
    if (!s2R.ok) return res.status(400).json({ error: s2R.error });
    return res.json(attackRecoveryResult(statusR.value, cvR.value, s1R.value, s2R.value));
  })
);

// ── POST /zero-rule ────────────────────────────────────────────────────────────
// Body: { diceRoll }
// Returns: { ma }
// LOB_CHARTS §9.1e — Zero Rule Table
router.post(
  '/zero-rule',
  wrapTableRoute('zero-rule', (req, res) => {
    const rollR = requireNumber(req.body.diceRoll, 'diceRoll', { min: 1, max: 6 });
    if (!rollR.ok) return res.status(400).json({ error: rollR.error });
    return res.json(zeroRuleResult(rollR.value));
  })
);

export default router;
