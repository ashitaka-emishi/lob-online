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

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// ── POST /combat ──────────────────────────────────────────────────────────────
// Body: { effectiveSPs, netColumnShifts, diceRoll }
// Returns: { resultType, spLoss, moraleCheckRequired, leaderLossCheckRequired,
//            finalColumn, depletionBand }
// LOB_CHARTS §5.6 — Combat Table
router.post('/combat', (req, res) => {
  const { effectiveSPs, netColumnShifts, diceRoll } = req.body;
  if (effectiveSPs === undefined || netColumnShifts === undefined || diceRoll === undefined) {
    return res
      .status(400)
      .json({ error: 'effectiveSPs, netColumnShifts, and diceRoll are required' });
  }
  const sps = Number(effectiveSPs);
  const shifts = Number(netColumnShifts);
  const roll = Number(diceRoll);
  if (!Number.isFinite(sps) || !Number.isFinite(shifts) || !Number.isFinite(roll)) {
    return res
      .status(400)
      .json({ error: 'effectiveSPs, netColumnShifts, and diceRoll must be numbers' });
  }
  if (roll < 2 || roll > 12) {
    return res.status(400).json({ error: 'diceRoll must be 2–12 (2d6)' });
  }

  try {
    const result = combatResult(sps, shifts, roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/combat error:', err);
    return res.status(500).json({ error: 'Failed to compute combat result' });
  }
});

// ── POST /opening-volley ──────────────────────────────────────────────────────
// Body: { condition, diceRoll }
// Returns: { spLoss }
// LOB_CHARTS §5.4 — Opening Volley Table
router.post('/opening-volley', (req, res) => {
  const { condition, diceRoll } = req.body;
  if (!condition || diceRoll === undefined) {
    return res.status(400).json({ error: 'condition and diceRoll are required' });
  }
  if (!VALID_OPENING_VOLLEY_CONDITIONS.has(condition)) {
    return res.status(400).json({
      error: `Invalid condition. Valid values: ${[...VALID_OPENING_VOLLEY_CONDITIONS].join(', ')}`,
    });
  }
  const roll = Number(diceRoll);
  if (!Number.isFinite(roll) || roll < 1 || roll > 6) {
    return res.status(400).json({ error: 'diceRoll must be 1–6 (1d6)' });
  }

  try {
    const result = openingVolleyResult(condition, roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/opening-volley error:', err);
    return res.status(500).json({ error: 'Failed to compute opening volley result' });
  }
});

// ── POST /morale ───────────────────────────────────────────────────────────────
// Body: { rating, modifiers, diceRoll }
// Returns: { effectiveRoll, type, retreatHexes, spLoss, leaderLossCheck }
// LOB §6.1 — Morale Table
router.post('/morale', (req, res) => {
  const { rating, modifiers = {}, diceRoll } = req.body;
  if (!rating || diceRoll === undefined) {
    return res.status(400).json({ error: 'rating and diceRoll are required' });
  }
  if (!VALID_MORALE_RATINGS.has(rating)) {
    return res.status(400).json({
      error: `Invalid rating. Valid values: ${[...VALID_MORALE_RATINGS].join(', ')}`,
    });
  }
  const roll = Number(diceRoll);
  if (!Number.isFinite(roll) || roll < 2 || roll > 12) {
    return res.status(400).json({ error: 'diceRoll must be 2–12 (2d6)' });
  }

  try {
    const result = moraleResult(rating, modifiers, roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/morale error:', err);
    return res.status(500).json({ error: 'Failed to compute morale result' });
  }
});

// ── POST /morale-transition ────────────────────────────────────────────────────
// Body: { currentState, incomingResult }
// Returns: { newState, suppressRetreatsAndLosses } | null
// LOB §6.2a — Additive Morale Effects Chart
router.post('/morale-transition', (req, res) => {
  const { currentState, incomingResult } = req.body;
  if (!currentState || !incomingResult) {
    return res.status(400).json({ error: 'currentState and incomingResult are required' });
  }
  if (!VALID_MORALE_STATES.has(currentState)) {
    return res.status(400).json({
      error: `Invalid currentState. Valid values: ${[...VALID_MORALE_STATES].join(', ')}`,
    });
  }

  try {
    const result = moraleTransition(currentState, incomingResult);
    if (result === null) {
      return res
        .status(400)
        .json({ error: `No transition defined for ${currentState}/${incomingResult}` });
    }
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/morale-transition error:', err);
    return res.status(500).json({ error: 'Failed to compute morale transition' });
  }
});

// ── POST /closing-roll ────────────────────────────────────────────────────────
// Body: { moraleRating, mods, diceRoll }
// Returns: { pass, threshold, modifiedRoll }
// LOB_CHARTS §3.5 — Closing Roll Table
router.post('/closing-roll', (req, res) => {
  const { moraleRating, mods = {}, diceRoll } = req.body;
  if (!moraleRating || diceRoll === undefined) {
    return res.status(400).json({ error: 'moraleRating and diceRoll are required' });
  }
  if (!VALID_MORALE_RATINGS.has(moraleRating)) {
    return res.status(400).json({
      error: `Invalid moraleRating. Valid values: ${[...VALID_MORALE_RATINGS].join(', ')}`,
    });
  }
  const roll = Number(diceRoll);
  if (!Number.isFinite(roll) || roll < 1 || roll > 6) {
    return res.status(400).json({ error: 'diceRoll must be 1–6 (1d6)' });
  }

  try {
    const result = closingRollResult(moraleRating, mods, roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/closing-roll error:', err);
    return res.status(500).json({ error: 'Failed to compute closing roll result' });
  }
});

// ── POST /leader-loss ─────────────────────────────────────────────────────────
// Body: { situation, isSharpshooter, diceRoll }
// Returns: { result }
// LOB_CHARTS §9.1a — Leader Loss Table
router.post('/leader-loss', (req, res) => {
  const { situation, isSharpshooter = false, diceRoll } = req.body;
  if (!situation || diceRoll === undefined) {
    return res.status(400).json({ error: 'situation and diceRoll are required' });
  }
  if (!VALID_LEADER_SITUATIONS.has(situation)) {
    return res.status(400).json({
      error: `Invalid situation. Valid values: ${[...VALID_LEADER_SITUATIONS].join(', ')}`,
    });
  }
  const roll = Number(diceRoll);
  if (!Number.isFinite(roll) || roll < 2 || roll > 12) {
    return res.status(400).json({ error: 'diceRoll must be 2–12 (2d6)' });
  }

  try {
    const result = leaderLossResult(situation, Boolean(isSharpshooter), roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/leader-loss error:', err);
    return res.status(500).json({ error: 'Failed to compute leader loss result' });
  }
});

// ── POST /command-roll ────────────────────────────────────────────────────────
// Body: { commandValue, isReserve, isDeployment, diceRoll }
// Returns: { yes, modifiedRoll }
// LOB_CHARTS §10.6 — Command Roll Table
router.post('/command-roll', (req, res) => {
  const { commandValue, isReserve = false, isDeployment = false, diceRoll } = req.body;
  if (commandValue === undefined || diceRoll === undefined) {
    return res.status(400).json({ error: 'commandValue and diceRoll are required' });
  }
  const cv = Number(commandValue);
  const roll = Number(diceRoll);
  if (!Number.isFinite(cv) || !Number.isFinite(roll)) {
    return res.status(400).json({ error: 'commandValue and diceRoll must be numbers' });
  }
  if (roll < 2 || roll > 12) {
    return res.status(400).json({ error: 'diceRoll must be 2–12 (2d6)' });
  }

  try {
    const result = commandRollResult(cv, Boolean(isReserve), Boolean(isDeployment), roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/command-roll error:', err);
    return res.status(500).json({ error: 'Failed to compute command roll result' });
  }
});

// ── POST /order-delivery ──────────────────────────────────────────────────────
// Body: { armyCOType, distanceCategory, isReserveOrder }
// Returns: { turnsToDeliver }
// LOB_CHARTS §10.6a — Order Delivery Table
router.post('/order-delivery', (req, res) => {
  const { armyCOType, distanceCategory, isReserveOrder = false } = req.body;
  if (!armyCOType || !distanceCategory) {
    return res.status(400).json({ error: 'armyCOType and distanceCategory are required' });
  }
  if (!VALID_ARMY_CO_TYPES.has(armyCOType)) {
    return res.status(400).json({
      error: `Invalid armyCOType. Valid values: ${[...VALID_ARMY_CO_TYPES].join(', ')}`,
    });
  }
  if (!VALID_DISTANCE_CATEGORIES.has(distanceCategory)) {
    return res.status(400).json({
      error: `Invalid distanceCategory. Valid values: ${[...VALID_DISTANCE_CATEGORIES].join(', ')}`,
    });
  }

  try {
    const result = orderDeliveryTurns(armyCOType, distanceCategory, Boolean(isReserveOrder));
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/order-delivery error:', err);
    return res.status(500).json({ error: 'Failed to compute order delivery turns' });
  }
});

// ── POST /fluke-stoppage ──────────────────────────────────────────────────────
// Body: { commandValue, hasReserve, isNight, step1Roll, step2Roll }
// Returns: { step1EffectiveRoll, basePass, step2Required, step2EffectiveRoll,
//            step2Threshold, stoppage }
// LOB_CHARTS §10.7b — Fluke Stoppage Table
router.post('/fluke-stoppage', (req, res) => {
  const { commandValue, hasReserve = false, isNight = false, step1Roll, step2Roll = 7 } = req.body;
  if (commandValue === undefined || step1Roll === undefined) {
    return res.status(400).json({ error: 'commandValue and step1Roll are required' });
  }
  const cv = Number(commandValue);
  const s1 = Number(step1Roll);
  const s2 = Number(step2Roll);
  if (!Number.isFinite(cv) || !Number.isFinite(s1) || !Number.isFinite(s2)) {
    return res
      .status(400)
      .json({ error: 'commandValue, step1Roll, and step2Roll must be numbers' });
  }
  if (s1 < 2 || s1 > 12) {
    return res.status(400).json({ error: 'step1Roll must be 2–12 (2d6)' });
  }
  if (s2 < 2 || s2 > 12) {
    return res.status(400).json({ error: 'step2Roll must be 2–12 (2d6)' });
  }

  try {
    const result = flukeStoppageResult(cv, Boolean(hasReserve), Boolean(isNight), s1, s2);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/fluke-stoppage error:', err);
    return res.status(500).json({ error: 'Failed to compute fluke stoppage result' });
  }
});

// ── POST /attack-recovery ─────────────────────────────────────────────────────
// Body: { divisionStatus, commandValue, step1Roll, step2Roll }
// Returns: { step1Threshold, basePass, step2Required, step2EffectiveRoll,
//            step2Threshold, recovered }
// LOB_CHARTS §10.8c — Attack Recovery Table
router.post('/attack-recovery', (req, res) => {
  const { divisionStatus, commandValue, step1Roll, step2Roll = 7 } = req.body;
  if (!divisionStatus || commandValue === undefined || step1Roll === undefined) {
    return res
      .status(400)
      .json({ error: 'divisionStatus, commandValue, and step1Roll are required' });
  }
  if (!VALID_DIVISION_STATUSES.has(divisionStatus)) {
    return res.status(400).json({
      error: `Invalid divisionStatus. Valid values: ${[...VALID_DIVISION_STATUSES].join(', ')}`,
    });
  }
  const cv = Number(commandValue);
  const s1 = Number(step1Roll);
  const s2 = Number(step2Roll);
  if (!Number.isFinite(cv) || !Number.isFinite(s1) || !Number.isFinite(s2)) {
    return res
      .status(400)
      .json({ error: 'commandValue, step1Roll, and step2Roll must be numbers' });
  }
  if (s1 < 2 || s1 > 12) {
    return res.status(400).json({ error: 'step1Roll must be 2–12 (2d6)' });
  }
  if (s2 < 2 || s2 > 12) {
    return res.status(400).json({ error: 'step2Roll must be 2–12 (2d6)' });
  }

  try {
    const result = attackRecoveryResult(divisionStatus, cv, s1, s2);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/attack-recovery error:', err);
    return res.status(500).json({ error: 'Failed to compute attack recovery result' });
  }
});

// ── POST /zero-rule ────────────────────────────────────────────────────────────
// Body: { diceRoll }
// Returns: { ma }
// LOB_CHARTS §9.1e — Zero Rule Table
router.post('/zero-rule', (req, res) => {
  const { diceRoll } = req.body;
  if (diceRoll === undefined) {
    return res.status(400).json({ error: 'diceRoll is required' });
  }
  const roll = Number(diceRoll);
  if (!Number.isFinite(roll) || roll < 1 || roll > 6) {
    return res.status(400).json({ error: 'diceRoll must be 1–6 (1d6)' });
  }

  try {
    const result = zeroRuleResult(roll);
    return res.json(result);
  } catch (err) {
    console.error('[route] /table-test/zero-rule error:', err);
    return res.status(500).json({ error: 'Failed to compute zero rule result' });
  }
});

export default router;
