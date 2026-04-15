/**
 * Formation and Activity Effects tables for the LOB v2.0 rules engine.
 *
 * Extracted from weapons.js (#292) — these charts are sourced from
 * LOB_CHARTS p. 4, separate from the weapon-characteristics data on p. 2.
 *
 * Pure data module: no game state, no side effects.
 */

// ─── Formation Effects Chart ───────────────────────────────────────────────────

/**
 * Formation Effects Chart.
 *
 * LOB_CHARTS p. 4 — Formation Effects Chart.
 * Keys: '<unitType>/<formation>' (e.g. 'infantry/line', 'artillery/unlimbered')
 *
 * facing:           'normal' | 'allRear' | 'allFront'
 * combatEligible:   whether the unit may fire
 * canMove:          whether the unit may use its MA
 * canUseRoads:      whether column/road movement applies
 * chargeAttacker:   whether the formation may initiate a charge
 *
 * Note: ZOC eligibility is governed by the Morale State Effects Chart, not this
 * chart. Column and Limbered formations have combatEligible=false but the rules
 * do not explicitly strip ZOC via this chart; ZOC loss comes from morale state.
 */
export const FORMATION_EFFECTS = Object.freeze({
  // LOB_CHARTS p.4 — Infantry formations
  'infantry/line': {
    facing: 'normal',
    combatEligible: true,
    canMove: true,
    canUseRoads: false,
    chargeAttacker: true,
  },
  'infantry/column': {
    facing: 'allRear',
    combatEligible: false,
    canMove: true,
    canUseRoads: true,
    chargeAttacker: false,
  },
  'infantry/openOrder': {
    facing: 'normal',
    combatEligible: true,
    canMove: true,
    canUseRoads: false,
    chargeAttacker: false,
  },
  'infantry/openOrderCapable': {
    facing: 'allFront',
    combatEligible: true,
    canMove: true,
    canUseRoads: false,
    chargeAttacker: false,
  },

  // LOB_CHARTS p.4 — Cavalry formations
  'cavalry/line': {
    facing: 'normal',
    combatEligible: true,
    canMove: true,
    canUseRoads: false,
    chargeAttacker: false,
  },
  'cavalry/mounted': {
    facing: 'allRear',
    combatEligible: false,
    canMove: true,
    canUseRoads: true,
    chargeAttacker: true,
  },
  'cavalry/openOrder': {
    facing: 'normal',
    combatEligible: true,
    canMove: true,
    canUseRoads: false,
    chargeAttacker: false,
  },
  'cavalry/openOrderCapable': {
    facing: 'allFront',
    combatEligible: true,
    canMove: true,
    canUseRoads: false,
    chargeAttacker: false,
  },

  // LOB_CHARTS p.4 — Artillery formations
  'artillery/limbered': {
    facing: 'allRear',
    combatEligible: false,
    canMove: true,
    canUseRoads: true,
    chargeAttacker: false,
  },
  'artillery/unlimbered': {
    facing: 'normal',
    combatEligible: true,
    canMove: false,
    canUseRoads: false,
    chargeAttacker: false,
  },
});

// ─── Activity Effects Chart ────────────────────────────────────────────────────

/**
 * Activity Effects Chart.
 *
 * LOB_CHARTS p. 4 — Activity Effects Chart.
 * canMove:    whether the unit may use its MA during this activity
 * canFire:    whether the unit may fire at full SPs
 * halfFire:   whether the unit may fire at half SPs (drop fractions)
 *
 * No SM-specific override to this chart. LOB_GAME_UPDATES SM section is silent.
 */
export const ACTIVITY_EFFECTS = Object.freeze({
  // LOB_CHARTS p.4 — Movement Action (MA): full move, half fire
  movementAction: { canMove: true, fullMove: true, canFire: true, halfFire: true },

  // LOB_CHARTS p.4 — Fire Combat: no move, full fire
  fireCombat: { canMove: false, fullMove: false, canFire: true, halfFire: false },

  // LOB_CHARTS p.4 — Charge: full move, no fire
  charge: { canMove: true, fullMove: true, canFire: false, halfFire: false },

  // LOB_CHARTS p.4 — Formation Change: move permitted, fire permitted
  formationChange: { canMove: true, fullMove: false, canFire: true, halfFire: false },

  // LOB_CHARTS p.4 — Facing Change: move permitted, fire permitted
  facingChange: { canMove: true, fullMove: false, canFire: true, halfFire: false },
});

// ─── Lookup functions ──────────────────────────────────────────────────────────

/**
 * Look up Formation Effects Chart entry for a unit type + formation combination.
 *
 * LOB_CHARTS p. 4 — Formation Effects Chart.
 *
 * @param {string} unitType  - 'infantry' | 'cavalry' | 'artillery'
 * @param {string} formation - 'line' | 'column' | 'mounted' | 'limbered' | 'unlimbered' | etc.
 * @returns {object|null} formation effects object, or null if combination not in chart
 */
export function formationEffect(unitType, formation) {
  return FORMATION_EFFECTS[`${unitType}/${formation}`] ?? null;
}

/**
 * Look up Activity Effects Chart entry for a given activity.
 *
 * LOB_CHARTS p. 4 — Activity Effects Chart.
 *
 * @param {string} activity - 'movementAction' | 'fireCombat' | 'charge' | 'formationChange' | 'facingChange'
 * @returns {object|null} activity effects object, or null if unknown activity
 */
export function activityEffect(activity) {
  return ACTIVITY_EFFECTS[activity] ?? null;
}
