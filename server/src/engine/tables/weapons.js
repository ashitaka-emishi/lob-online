/**
 * Weapons reference data for the LOB v2.0 rules engine — South Mountain scenario.
 *
 * Pure data module: no game state, no side effects.
 * All values sourced from LOB_CHARTS pages 2 and 4, with SM_ERRATA applied.
 * Consult docs/reference/lob-tables.pdf (pp. 2, 4) and sm-errata.pdf for source.
 */

// ─── Weapon type definitions ───────────────────────────────────────────────────

/**
 * Small-arms weapon type definitions.
 *
 * LOB_CHARTS p. 2 — Weapon Characteristics Chart (small arms section).
 * type: weapon type code used on unit counters and rosters
 * maxRange: maximum fire range in hexes
 * ammo: ammunition class driving combat column shifts (see §5.6)
 *
 * SM-present types: R, M, C, SR (from SM_ROSTER pp. 1-4)
 */
export const SMALL_ARMS = Object.freeze({
  R: { type: 'R', name: 'Rifled Musket', maxRange: 4, ammo: null }, // LOB_CHARTS p.2
  M: { type: 'M', name: 'Smoothbore Musket', maxRange: 2, ammo: 'buckAndBall' }, // LOB_CHARTS p.2
  C: { type: 'C', name: 'Carbine', maxRange: 3, ammo: 'breechloader' }, // LOB_CHARTS p.2
  SR: { type: 'SR', name: 'Sharps Rifle', maxRange: 5, ammo: 'breechloader' }, // LOB_CHARTS p.2
  'CR/S': { type: 'CR/S', name: 'Colt or Spencer Rifle', maxRange: 4, ammo: 'repeater' }, // LOB_CHARTS p.2
  HR: { type: 'HR', name: 'Henry Repeater', maxRange: 3, ammo: 'repeater' }, // LOB_CHARTS p.2
  SH: { type: 'SH', name: 'Shotgun', maxRange: 1, ammo: 'buckAndBall' }, // LOB_CHARTS p.2
  P: { type: 'P', name: 'Pistol', maxRange: 1, ammo: null }, // LOB_CHARTS p.2
  T: { type: 'T', name: 'Target Rifle', maxRange: 5, ammo: null }, // LOB_CHARTS p.2
});

/**
 * Artillery weapon type definitions.
 *
 * LOB_CHARTS p. 2 — Weapon Characteristics Chart (artillery section).
 * maxRange: maximum fire range in hexes
 * canister: canister class — 'normal' | 'dense' | null (some guns have no canister)
 *
 * SM-present types: R, N, H, L, hR (SM_ERRATA #2: E/2 US corrected R → hR)
 */
export const ARTILLERY = Object.freeze({
  R: { type: 'R', name: 'Rifled Cannon', maxRange: 30, canister: 'normal' }, // LOB_CHARTS p.2
  N: { type: 'N', name: 'Napoleon', maxRange: 16, canister: 'dense' }, // LOB_CHARTS p.2
  H: { type: 'H', name: '12-lb Howitzer', maxRange: 10, canister: 'dense' }, // LOB_CHARTS p.2
  L: { type: 'L', name: 'Light Gun (6-lb)', maxRange: 14, canister: 'normal' }, // LOB_CHARTS p.2
  hR: { type: 'hR', name: '20-lb Parrott', maxRange: 30, canister: 'normal' }, // LOB_CHARTS p.2; SM_ERRATA #2
  hH: { type: 'hH', name: '24-lb Howitzer', maxRange: 12, canister: 'dense' }, // LOB_CHARTS p.2
  MH: { type: 'MH', name: 'Mountain Howitzer', maxRange: 10, canister: 'normal' }, // LOB_CHARTS p.2
  SG: { type: 'SG', name: '4.5-in Siege Rifle', maxRange: 30, canister: 'normal' }, // LOB_CHARTS p.2
  W: { type: 'W', name: 'Whitworth', maxRange: 38, canister: null }, // LOB_CHARTS p.2
  NG: { type: 'NG', name: 'Naval Gun', maxRange: 22, canister: null }, // LOB_CHARTS p.2
});

// ─── Ammo-type shift threshold chart ──────────────────────────────────────────

/**
 * Threshold Chart for ammo-type column shifts.
 *
 * LOB_CHARTS p. 2 — Threshold Chart.
 * Ammo-type shifts (buckAndBall, breechloader, repeater, canister) apply only
 * when the firing unit's SP count meets or exceeds the threshold value.
 *
 * spMin/spMax: inclusive SP range for this threshold tier
 * threshold:   minimum SPs required to apply the ammo-type shift
 */
export const AMMO_THRESHOLD_TIERS = Object.freeze([
  { spMin: 6, spMax: 8, threshold: 3 }, // LOB_CHARTS p.2
  { spMin: 4, spMax: 5, threshold: 2 }, // LOB_CHARTS p.2
  { spMin: 1, spMax: 3, threshold: 1 }, // LOB_CHARTS p.2
]);

// ─── Lookup functions ──────────────────────────────────────────────────────────

/**
 * Return the maximum fire range (in hexes) for a small-arms weapon type code.
 *
 * LOB_CHARTS p. 2 — Weapon Characteristics Chart.
 *
 * @param {string} weaponType - e.g. 'R', 'M', 'SR'
 * @returns {number|null} max range in hexes, or null if unknown type
 */
export function smallArmsMaxRange(weaponType) {
  return SMALL_ARMS[weaponType]?.maxRange ?? null;
}

/**
 * Return the maximum fire range (in hexes) for an artillery weapon type code.
 *
 * LOB_CHARTS p. 2 — Artillery Characteristics Chart.
 *
 * @param {string} weaponType - e.g. 'R', 'N', 'hR'
 * @returns {number|null} max range in hexes, or null if unknown type
 */
export function artilleryMaxRange(weaponType) {
  return ARTILLERY[weaponType]?.maxRange ?? null;
}

/**
 * Return the ammo-type shift threshold for a unit with the given SP count.
 * The ammo-type shift applies only if the firing unit's SPs >= threshold.
 *
 * LOB_CHARTS p. 2 — Threshold Chart.
 *
 * @param {number} sps - current strength points of the firing unit
 * @returns {number|null} threshold value, or null if SPs are out of range
 */
export function ammoShiftThreshold(sps) {
  for (const tier of AMMO_THRESHOLD_TIERS) {
    if (sps >= tier.spMin && sps <= tier.spMax) return tier.threshold;
  }
  return null;
}
