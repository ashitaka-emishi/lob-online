/**
 * Combat table module for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure functions; no game state, no side effects.
 * Source: LOB_CHARTS p. 2 (Combat Table, Opening Volley Table, Column Shifts,
 * Threshold Value Chart). SM overrides: no breastworks (SM §4.1).
 */

// ─── Column index ──────────────────────────────────────────────────────────────

/**
 * Ordered column labels for the Combat Table (left to right).
 * LOB_CHARTS §5.6 — columns -B through D represent increasing firepower.
 * Numeric columns are the natural starting positions based on SP total.
 * Lettered columns A-D are only reached through right-shifts.
 */
export const COMBAT_COLUMNS = Object.freeze([
  '-B',
  '-A',
  '1',
  '2-3',
  '4-5',
  '6-8',
  'A',
  'B',
  'C',
  'D',
]);

/** Map column label → index (0-based). */
export const COMBAT_COLUMN_INDEX = Object.freeze(
  Object.fromEntries(COMBAT_COLUMNS.map((c, i) => [c, i]))
);

// ─── Combat Table ──────────────────────────────────────────────────────────────

/**
 * Combat Table cell encoding.
 * LOB_CHARTS §5.6 — null = no effect, 'm' = morale check only, number = SP loss + leader loss + morale check.
 */
const _COMBAT_CELLS = [
  // roll 2: -B  -A   1  2-3  4-5  6-8   A    B    C    D
  [null, null, null, null, null, null, null, 'm', 'm', 1],
  // roll 3
  [null, null, null, null, null, null, 'm', 'm', 1, 1],
  // roll 4
  [null, null, null, null, null, null, 'm', 1, 1, 1],
  // roll 5
  [null, null, null, null, null, 'm', 1, 1, 1, 1],
  // roll 6
  [null, null, null, null, 'm', 'm', 1, 1, 1, 2],
  // roll 7
  [null, null, null, 'm', 'm', 1, 1, 1, 2, 2],
  // roll 8
  [null, null, 'm', 'm', 1, 1, 1, 2, 2, 2],
  // roll 9
  [null, null, 'm', 1, 1, 1, 2, 2, 2, 3],
  // roll 10
  [null, 'm', 1, 1, 1, 2, 2, 2, 3, 3],
  // roll 11
  ['m', 1, 1, 1, 2, 2, 2, 3, 3, 3],
  // roll 12
  [1, 1, 1, 2, 2, 2, 3, 3, 3, 4],
];

/** Immutable combat table: outer index = roll-2 (0-10), inner = column index (0-9). */
export const COMBAT_TABLE = Object.freeze(_COMBAT_CELLS.map((row) => Object.freeze(row)));

// ─── Depletion bands ───────────────────────────────────────────────────────────

/**
 * Columns in the left depletion band (trigger depletion of the ammo type in use).
 * LOB_CHARTS §8.2a — left band columns call for depletion of whatever type is used.
 */
export const LEFT_DEPLETION_COLUMNS = new Set(['-B', '-A', '1', '2-3']);

/**
 * Columns in the right depletion band (trigger canister depletion when canister is in use).
 * LOB_CHARTS §8.2c — right band columns call for Canister Depletion.
 */
export const RIGHT_DEPLETION_COLUMNS = new Set(['4-5', '6-8', 'A', 'B', 'C', 'D']);

// ─── Opening Volley Table ──────────────────────────────────────────────────────

/**
 * Opening Volley Table.
 * LOB_CHARTS §5.4 — one-die roll (1d6), columns by range or special condition.
 *
 * Each entry maps 1d6 roll values to SP loss.
 * format: array of [rollMin, rollMax, spLoss] tuples.
 */
export const OPENING_VOLLEY_TABLE = Object.freeze({
  // LOB_CHARTS §5.4 — Range 3
  range3: Object.freeze([
    [1, 5, 0],
    [6, 6, 1],
  ]),
  // LOB_CHARTS §5.4 — Range 2
  range2: Object.freeze([
    [1, 4, 0],
    [5, 6, 1],
  ]),
  // LOB_CHARTS §5.4 — Range 1
  range1: Object.freeze([
    [1, 3, 0],
    [4, 6, 1],
  ]),
  // LOB_CHARTS §5.4 — Charge column
  charge: Object.freeze([
    [1, 2, 0],
    [3, 5, 1],
    [6, 6, 2],
  ]),
  // LOB_CHARTS §5.4 — Shift-Only column
  shiftOnly: Object.freeze([
    [1, 1, 0],
    [2, 4, 1],
    [5, 6, 2],
  ]),
});

// ─── Column shift tables ───────────────────────────────────────────────────────

/**
 * Small-arms range shifts (left shifts by range).
 * LOB_CHARTS §5.6 — Combat Column Shifts: range shifts for small arms.
 * Negative values = left shifts.
 */
export const SMALL_ARMS_RANGE_SHIFTS = Object.freeze([
  { rangeMin: 1, rangeMax: 1, shift: 0, sharpshooterShift: 0 }, // LOB_CHARTS §5.6
  { rangeMin: 2, rangeMax: 2, shift: -1, sharpshooterShift: 0 }, // LOB_CHARTS §5.6
  { rangeMin: 3, rangeMax: 3, shift: -2, sharpshooterShift: -1 }, // LOB_CHARTS §5.6
  { rangeMin: 4, rangeMax: Infinity, shift: -3, sharpshooterShift: -1 }, // LOB_CHARTS §5.6
]);

/**
 * Artillery range shifts (left shifts by range).
 * LOB_CHARTS §5.6 — Combat Column Shifts: range shifts for artillery.
 */
export const ARTILLERY_RANGE_SHIFTS = Object.freeze([
  { rangeMin: 1, rangeMax: 5, shift: 0 }, // LOB_CHARTS §5.6
  { rangeMin: 6, rangeMax: 9, shift: -1 }, // LOB_CHARTS §5.6
  { rangeMin: 10, rangeMax: 13, shift: -2 }, // LOB_CHARTS §5.6
  { rangeMin: 14, rangeMax: 15, shift: -3 }, // LOB_CHARTS §5.6
  { rangeMin: 16, rangeMax: Infinity, shift: -4 }, // LOB_CHARTS §5.6
]);

/**
 * Ammo-type right shifts (firepower shifts).
 * LOB_CHARTS §5.6 — Firepower shifts; threshold check required before applying.
 * maxRange: maximum range at which the shift applies.
 * shift: positive = right shift.
 */
export const AMMO_TYPE_SHIFTS = Object.freeze({
  buckAndBall: { shift: 1, maxRange: 1 }, // LOB_CHARTS §5.6 — Smoothbore Musket, Shotgun
  breechloader: { shift: 1, maxRange: 2 }, // LOB_CHARTS §5.6 — Carbine, Sharps Rifle
  repeater: { shift: 2, maxRange: 2 }, // LOB_CHARTS §5.6 — Colt/Spencer, Henry
  normalCanister: { shift: 1, maxRange: 3 }, // LOB_CHARTS §5.6 — R, L, MH, hR, SG artillery
  denseCanister: { shift: 2, maxRange: 3 }, // LOB_CHARTS §5.6 — N, H, hH artillery
});

/**
 * Threshold Value Chart — minimum SP required for ammo-type shifts to apply.
 * LOB_CHARTS §5.6 / Threshold Value Chart: "# is the min SPs needed."
 *
 * An ammo-type right shift applies only if the firer's SP count meets or
 * exceeds the threshold corresponding to the firer's SP range.
 */
export const SHIFT_THRESHOLD_TIERS = Object.freeze([
  { spMin: 6, spMax: 8, threshold: 3 }, // LOB_CHARTS §5.6 Threshold Chart
  { spMin: 4, spMax: 5, threshold: 2 }, // LOB_CHARTS §5.6 Threshold Chart
  { spMin: 1, spMax: 3, threshold: 1 }, // LOB_CHARTS §5.6 Threshold Chart
]);

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Determine the starting combat column based on effective SP total.
 * LOB_CHARTS §5.6 — SP total maps to starting column before any shifts.
 *
 * @param {number} effectiveSPs - total firing SPs (DG units use half)
 * @returns {string} starting column label
 */
export function spToColumn(effectiveSPs) {
  if (effectiveSPs <= 0) return '-B'; // off the left edge
  if (effectiveSPs === 1) return '1'; // LOB_CHARTS §5.6
  if (effectiveSPs <= 3) return '2-3'; // LOB_CHARTS §5.6
  if (effectiveSPs <= 5) return '4-5'; // LOB_CHARTS §5.6
  return '6-8'; // LOB_CHARTS §5.6 — 6-8 SPs; higher SPs access lettered columns only via shifts
}

/**
 * Apply net column shifts to a starting column, clamping at table boundaries.
 * LOB_CHARTS §5.6 — shifts left decrease column index; shifts right increase it.
 *
 * @param {string} startColumn - starting column label
 * @param {number} netShifts   - net total shifts (positive = right, negative = left)
 * @returns {string} final column label after clamping
 */
export function applyColumnShifts(startColumn, netShifts) {
  const startIdx = COMBAT_COLUMN_INDEX[startColumn] ?? 0;
  const finalIdx = Math.max(0, Math.min(COMBAT_COLUMNS.length - 1, startIdx + netShifts));
  return COMBAT_COLUMNS[finalIdx];
}

/**
 * Look up a combat result from the Combat Table.
 *
 * LOB_CHARTS §5.6 — cross-index the dice roll with the final column (after all shifts).
 * Result type:
 *   'none'  — no effect
 *   'morale' — morale check required; no SP loss, no leader loss check
 *   'full'   — spLoss SP loss + morale check required + leader loss check
 *
 * @param {number} effectiveSPs - total firing SPs (DG units use ×½, round down)
 * @param {number} netColumnShifts - net total column shifts (positive = right)
 * @param {number} diceRoll - 2d6 result (2–12)
 * @returns {{
 *   resultType: 'none'|'morale'|'full',
 *   spLoss: number,
 *   moraleCheckRequired: boolean,
 *   leaderLossCheckRequired: boolean,
 *   finalColumn: string,
 *   depletionBand: 'left'|'right'
 * }}
 */
export function combatResult(effectiveSPs, netColumnShifts, diceRoll) {
  // LOB_CHARTS §5.6 — Combat Table valid dice range is 2–12 (2d6)
  if (diceRoll < 2 || diceRoll > 12) {
    throw new RangeError('diceRoll must be between 2 and 12');
  }
  const startColumn = spToColumn(effectiveSPs);
  const finalColumn = applyColumnShifts(startColumn, netColumnShifts);
  const colIdx = COMBAT_COLUMN_INDEX[finalColumn];
  const rowIdx = diceRoll - 2; // rolls 2-12 → indices 0-10

  const raw = COMBAT_TABLE[rowIdx]?.[colIdx] ?? null;

  let resultType;
  let spLoss;
  if (raw === null) {
    resultType = 'none';
    spLoss = 0;
  } else if (raw === 'm') {
    resultType = 'morale';
    spLoss = 0;
  } else {
    resultType = 'full';
    spLoss = raw;
  }

  const moraleCheckRequired = resultType !== 'none';
  const leaderLossCheckRequired = resultType === 'full';
  const depletionBand = LEFT_DEPLETION_COLUMNS.has(finalColumn) ? 'left' : 'right';

  return {
    resultType,
    spLoss,
    moraleCheckRequired,
    leaderLossCheckRequired,
    finalColumn,
    depletionBand,
  };
}

/**
 * Look up an Opening Volley result.
 *
 * LOB_CHARTS §5.4 — one-die roll (1d6), column determined by range or condition.
 *
 * @param {'range1'|'range2'|'range3'|'charge'|'shiftOnly'} condition
 * @param {number} diceRoll - 1d6 result (1–6)
 * @returns {{ spLoss: number }}
 */
export function openingVolleyResult(condition, diceRoll) {
  const column = OPENING_VOLLEY_TABLE[condition];
  if (!column) return { spLoss: 0 };

  for (const [rollMin, rollMax, spLoss] of column) {
    if (diceRoll >= rollMin && diceRoll <= rollMax) return { spLoss };
  }

  return { spLoss: 0 };
}

/**
 * Compute range shift for small-arms fire.
 * LOB_CHARTS §5.6 — range shifts for small arms and sharpshooters.
 *
 * @param {number} range - fire range in hexes
 * @param {boolean} [isSharpshooter=false] - true for sharpshooter-rated units
 * @returns {number} column shift (negative = left)
 */
export function smallArmsRangeShift(range, isSharpshooter = false) {
  for (const tier of SMALL_ARMS_RANGE_SHIFTS) {
    if (range >= tier.rangeMin && range <= tier.rangeMax) {
      return isSharpshooter ? tier.sharpshooterShift : tier.shift;
    }
  }
  return -3; // beyond range 4+ catches all
}

/**
 * Compute range shift for artillery fire.
 * LOB_CHARTS §5.6 — range shifts for artillery.
 *
 * @param {number} range - fire range in hexes
 * @returns {number} column shift (negative = left)
 */
export function artilleryRangeShift(range) {
  for (const tier of ARTILLERY_RANGE_SHIFTS) {
    if (range >= tier.rangeMin && range <= tier.rangeMax) return tier.shift;
  }
  return -4; // beyond 16+ tier
}

/**
 * Return the ammo-type SP threshold for a given SP count.
 * LOB_CHARTS §5.6 — Threshold Value Chart.
 *
 * @param {number} sps - current SP count of the firing unit
 * @returns {number} threshold value, or 0 if out of range
 */
export function spShiftThreshold(sps) {
  for (const tier of SHIFT_THRESHOLD_TIERS) {
    if (sps >= tier.spMin && sps <= tier.spMax) return tier.threshold;
  }
  return 0;
}

/**
 * Compute ammo-type column shift for a firing unit.
 * LOB_CHARTS §5.6 — Firepower shifts; both range and threshold must be met.
 *
 * @param {string|null} ammoType - 'buckAndBall'|'breechloader'|'repeater'|'normalCanister'|'denseCanister'|null
 * @param {number} range - fire range in hexes
 * @param {number} firerSPs - current SP count of the firing unit
 * @returns {number} column shift (positive = right, 0 if conditions not met)
 */
export function ammoTypeShift(ammoType, range, firerSPs) {
  if (!ammoType) return 0;
  const entry = AMMO_TYPE_SHIFTS[ammoType];
  if (!entry) return 0;

  // LOB_CHARTS §5.6 — shift only applies within max range for ammo type
  if (range > entry.maxRange) return 0;

  // LOB §5.6 / Threshold Value Chart — threshold is the spMin of the tier the firer falls into.
  // A non-zero return means firerSPs ≥ spMin for that tier, so firerSPs >= threshold is always
  // true here — the redundant comparison is removed (#291, domain-expert confirmed tautological).
  if (spShiftThreshold(firerSPs) === 0) return 0; // firerSPs outside all threshold tiers (< 1 or > 8)
  return entry.shift;
}

/**
 * Compute target-state column shifts.
 * LOB_CHARTS §5.6 — target state shifts: rear, DG, protective terrain, open order capable.
 *
 * ** Note: Rear and DG shifts are ignored at range 10 or more (LOB_CHARTS §5.6 footnote).
 * SM §4.1 / LOB_GAME_UPDATES SM — no breastworks in SM; breastworks entry in Protective
 *   Terrain is inert (never applies).
 *
 * @param {object} params
 * @param {boolean} params.isRear - target's rear is exposed to firer
 * @param {boolean} params.isDG - target is in DG (Defensive Ground) formation
 * @param {number} params.range - fire range in hexes
 * @param {boolean} params.hasProtectiveTerrain - target in stone wall, rock ledge, sunken road, etc.
 * @param {boolean} params.isOpenOrderCapable - target is Open Order Capable
 * @returns {number} net target-state column shift
 */
export function targetStateShift({
  isRear,
  isDG,
  range,
  hasProtectiveTerrain,
  isOpenOrderCapable,
}) {
  let shift = 0;

  // LOB_CHARTS §5.6 — 2 Right for rear target; ignored at range 10+ (**)
  if (isRear && range < 10) shift += 2;

  // LOB_CHARTS §5.6 — 1 Right for DG target; ignored at range 10+ (**)
  if (isDG && range < 10) shift += 1;

  // LOB_CHARTS §5.6 — 1 Left for target using Protective Terrain (once, regardless of count)
  // SM §4.1 — breastworks not present in SM; stone wall, rock ledge, sunken road, etc. still apply
  if (hasProtectiveTerrain) shift -= 1;

  // LOB_CHARTS §5.6 — 1 Left for Open Order Capable target
  if (isOpenOrderCapable) shift -= 1;

  return shift;
}
