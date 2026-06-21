/**
 * Artillery action handlers: LIMBER, UNLIMBER, FIRE_ARTILLERY, REPLENISH_ARTILLERY.
 *
 * LOB §3.6  — limber/unlimber formation transitions (3 MP cost each direction)
 * LOB §8.2  — artillery fire: canister vs shell, range shifts, depletion
 * LOB §9.1  — artillery leaders: second/third shots, unlimber at 4 hexes
 * SM  §3.6  — Confederate supply trace: Wing Wagon OR west-edge road hex
 * SM  §3.5  — Pelham/Pleasonton: any friendly ammo reserve
 */

import { ActionError } from './actionError.js';
import { loadOob, findOobUnit, buildUnitSideMap } from '../oob.js';
import { hexDistance } from '../hex.js';
import {
  combatResult,
  artilleryRangeShift,
  ORANGE_DEPLETION_COLUMNS,
  BLUE_DEPLETION_COLUMNS,
} from '../tables/combat.js';

// LOB §3.6a — formation change costs 3 MPs in each direction
export const FORMATION_CHANGE_MP_COST = 3;

// LOB §9.1 / LOB_CHARTS Artillery Formation Changes box — unlimber distance thresholds
const UNLIMBER_MIN_RANGE_NORMAL = 5; // LOB §3.6 — standard: ≥5 hexes from enemy
const UNLIMBER_MIN_RANGE_ARTY_LEADER = 4; // LOB §9.1c — with Artillery Leader in hex: ≥4

// LOB §8.2e — canister maximum range
const CANISTER_MAX_RANGE = 3;

// ─── Artillery type detection ──────────────────────────────────────────────────

/**
 * Return true when the OOB unit is an artillery battery.
 * LOB §3.6 — only artillery use limber/unlimber.
 *
 * @param {object|null} oobUnit - unit entry from OOB (may be null if not found)
 * @returns {boolean}
 */
function isArtilleryUnit(oobUnit) {
  return oobUnit?.type === 'artillery' || oobUnit?.gunType !== undefined;
}

// ─── LIMBER ───────────────────────────────────────────────────────────────────

/**
 * LIMBER action handler.
 *
 * LOB §3.6a — an Unlimbered battery spends 3 MPs to change to Limbered formation.
 * May not limber if the unit has already moved this activation (MPs are spent before movement).
 * Limbering is otherwise unrestricted (no range gate from enemy).
 *
 * Payload: { unitId: string }
 */
export function handleLimber(state, action, { oob: injectedOob } = {}) {
  if (!state.activityPhase) {
    throw new ActionError('INVALID_ACTION', 'LIMBER is only valid during the Activity Phase');
  }
  if (state.activityPhase.currentActivation === null) {
    throw new ActionError('INVALID_ACTION', 'No stack is mid-activation — cannot limber');
  }

  const { unitId } = action.payload ?? {};
  if (!unitId || typeof unitId !== 'string') {
    throw new ActionError('INVALID_PAYLOAD', 'LIMBER requires unitId');
  }

  const unit = state.units[unitId];
  if (!unit || !unit.isOnBoard) {
    throw new ActionError('INVALID_ACTION', `Unit '${unitId}' is not on board`);
  }

  // LOB §3.6a — unit must be in the active hex
  if (unit.hex !== state.activityPhase.currentActivation.hex) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not in the active hex (LOB §3.6a)`
    );
  }

  const oob = injectedOob ?? loadOob();
  const oobUnit = findOobUnit(oob, unitId);
  if (!isArtilleryUnit(oobUnit)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not an artillery battery — only batteries can limber (LOB §3.6)`
    );
  }

  // LOB §3.6a — battery must already be Unlimbered to Limber
  if ((unit.formation ?? 'unlimbered') !== 'unlimbered') {
    throw new ActionError('INVALID_ACTION', `Unit '${unitId}' is already Limbered (LOB §3.6a)`);
  }

  // LOB §3.6a — may not limber after having moved (formation change must be first action)
  if (state.activityPhase.currentActivation.movedThisActivation) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' has already moved this activation — limber before moving (LOB §3.6a)`
    );
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: { ...unit, formation: 'limbered' },
    },
  };
}

// ─── UNLIMBER ─────────────────────────────────────────────────────────────────

/**
 * UNLIMBER action handler.
 *
 * LOB §3.6b — a Limbered battery spends 3 MPs to change to Unlimbered formation.
 * LOB_CHARTS Artillery Formation Changes box — minimum range from nearest enemy:
 *   Standard: ≥ 5 hexes
 *   With Artillery Leader in the hex: ≥ 4 hexes (LOB §9.1c)
 *
 * Payload: { unitId: string, hasArtilleryLeader?: boolean }
 *   hasArtilleryLeader: caller signals an Artillery Leader is in the same hex (LOB §9.1c)
 */
export function handleUnlimber(state, action, { oob: injectedOob, mapData } = {}) {
  if (!state.activityPhase) {
    throw new ActionError('INVALID_ACTION', 'UNLIMBER is only valid during the Activity Phase');
  }
  if (state.activityPhase.currentActivation === null) {
    throw new ActionError('INVALID_ACTION', 'No stack is mid-activation — cannot unlimber');
  }

  const { unitId, hasArtilleryLeader = false } = action.payload ?? {};
  if (!unitId || typeof unitId !== 'string') {
    throw new ActionError('INVALID_PAYLOAD', 'UNLIMBER requires unitId');
  }

  const unit = state.units[unitId];
  if (!unit || !unit.isOnBoard) {
    throw new ActionError('INVALID_ACTION', `Unit '${unitId}' is not on board`);
  }

  if (unit.hex !== state.activityPhase.currentActivation.hex) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not in the active hex (LOB §3.6b)`
    );
  }

  const oob = injectedOob ?? loadOob();
  const oobUnit = findOobUnit(oob, unitId);
  if (!isArtilleryUnit(oobUnit)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not an artillery battery (LOB §3.6)`
    );
  }

  // LOB §3.6b — must be Limbered to Unlimber
  const currentFormation = unit.formation ?? 'limbered';
  if (currentFormation !== 'limbered') {
    throw new ActionError('INVALID_ACTION', `Unit '${unitId}' is already Unlimbered (LOB §3.6b)`);
  }

  // LOB_CHARTS Artillery Formation Changes box — range gate from nearest enemy
  if (mapData?.gridSpec) {
    const minRange = hasArtilleryLeader
      ? UNLIMBER_MIN_RANGE_ARTY_LEADER // LOB §9.1c
      : UNLIMBER_MIN_RANGE_NORMAL; // LOB §3.6b

    const unitSideMap = buildUnitSideMap(oob);
    const unitInfo = unitSideMap.get(unitId);
    if (unitInfo) {
      const enemySide = unitInfo.side === 'union' ? 'confederate' : 'union';
      const enemyUnits = Object.values(state.units).filter((u) => {
        if (!u.isOnBoard || !u.hex) return false;
        const info = unitSideMap.get(u.id);
        return info?.side === enemySide;
      });

      for (const enemy of enemyUnits) {
        const dist = hexDistance(unit.hex, enemy.hex, mapData.gridSpec);
        if (dist < minRange) {
          throw new ActionError(
            'INVALID_ACTION',
            `Cannot unlimber — enemy unit at '${enemy.hex}' is only ${dist} hexes away (minimum ${minRange}, LOB §3.6b / LOB §9.1c)`
          );
        }
      }
    }
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: { ...unit, formation: 'unlimbered' },
    },
  };
}

// ─── FIRE_ARTILLERY ───────────────────────────────────────────────────────────

/**
 * FIRE_ARTILLERY action handler.
 *
 * LOB §8.2 — artillery fire sequence:
 *   1. Battery must be Unlimbered (LOB §3.6a: Limbered cannot fire)
 *   2. Player selects Shell or Canister; Canister requires range ≤ 3 (LOB §8.2e)
 *   3. Shell Depleted battery cannot fire at range > 3 (LOB §8.2d)
 *   4. Compute effective column: starting column + range shift (LOB §8.2 / §5.6)
 *   5. Roll Combat Table → result
 *   6. Apply depletion: left band → Shell Depleted; right band + Canister → Canister Depleted (LOB §8.2a)
 *
 * Payload: { attackerUnitId, defenderHex, ammoType: 'shell'|'canister', diceRoll: number, range: number }
 *   range:    caller supplies the hex distance (validated here when mapData is available)
 *   diceRoll: 2d6 sum (2–12)
 *   ammoType: 'shell' or 'canister' (player's choice, validated against range)
 */
export function handleFireArtillery(state, action, { oob: injectedOob, mapData } = {}) {
  if (!state.activityPhase) {
    throw new ActionError(
      'INVALID_ACTION',
      'FIRE_ARTILLERY is only valid during the Activity Phase'
    );
  }
  if (state.activityPhase.currentActivation === null) {
    throw new ActionError('INVALID_ACTION', 'No stack is mid-activation');
  }

  const { attackerUnitId, defenderHex, ammoType, diceRoll, range } = action.payload ?? {};

  if (!attackerUnitId || !defenderHex) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      'FIRE_ARTILLERY requires attackerUnitId and defenderHex'
    );
  }
  if (!['shell', 'canister'].includes(ammoType)) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      "FIRE_ARTILLERY ammoType must be 'shell' or 'canister'"
    );
  }
  if (!Number.isInteger(diceRoll) || diceRoll < 2 || diceRoll > 12) {
    throw new ActionError('INVALID_PAYLOAD', 'FIRE_ARTILLERY diceRoll must be 2–12');
  }
  if (!Number.isInteger(range) || range < 1) {
    throw new ActionError('INVALID_PAYLOAD', 'FIRE_ARTILLERY range must be a positive integer');
  }

  const unit = state.units[attackerUnitId];
  if (!unit || !unit.isOnBoard) {
    throw new ActionError('INVALID_ACTION', `Unit '${attackerUnitId}' is not on board`);
  }

  // Security: validate the client-supplied range against the actual board geometry when
  // mapData is available. The client value is used for column-shift selection and canister
  // gating — a lying player could claim range 1 to unlock canister shifts at long distance.
  // (#634 — always required once the movement handler is wired)
  if (mapData?.gridSpec && unit.hex) {
    const actualRange = hexDistance(unit.hex, defenderHex, mapData.gridSpec);
    if (actualRange !== range) {
      throw new ActionError(
        'INVALID_ACTION',
        `FIRE_ARTILLERY range mismatch: claimed ${range} but actual hex distance is ${actualRange}`
      );
    }
  }

  const oob = injectedOob ?? loadOob();
  const oobUnit = findOobUnit(oob, attackerUnitId);
  if (!isArtilleryUnit(oobUnit)) {
    throw new ActionError('INVALID_ACTION', `Unit '${attackerUnitId}' is not an artillery battery`);
  }

  // LOB §3.6a — Limbered batteries cannot fire
  if ((unit.formation ?? 'unlimbered') === 'limbered') {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${attackerUnitId}' is Limbered — must unlimber before firing (LOB §3.6a)`
    );
  }

  // LOB §8.2e — Canister requires range ≤ 3
  if (ammoType === 'canister' && range > CANISTER_MAX_RANGE) {
    throw new ActionError(
      'INVALID_ACTION',
      `Canister fire requires range ≤ ${CANISTER_MAX_RANGE}; range is ${range} (LOB §8.2e)`
    );
  }

  // LOB §8.2d — Shell Depleted battery cannot fire at range > 3
  if (unit.ammo === 'low' && range > CANISTER_MAX_RANGE) {
    throw new ActionError(
      'INVALID_ACTION',
      `Shell Depleted battery cannot fire at range > ${CANISTER_MAX_RANGE} (LOB §8.2d)`
    );
  }

  // LOB §8.2 / §5.6 — compute effective column: starting column (SPs) + range shift
  const printedSPs = oobUnit?.strengthPoints ?? 1;
  const currentSPs = unit.strengthPoints ?? printedSPs;
  const rangeShift = artilleryRangeShift(range);
  const netColumnShifts = rangeShift; // TODO(M7+): add terrain/formation column shifts

  const result = combatResult(currentSPs, netColumnShifts, diceRoll);

  // LOB §8.2a — apply depletion based on which color zone the final column falls in.
  // Orange zone (numeric cols): deplete whichever ammo type was fired.
  // Blue zone (lettered cols A-D): canister depletion only; no depletion if shell was fired.
  let newAmmo = unit.ammo;
  const col = result.finalColumn;
  if (ORANGE_DEPLETION_COLUMNS.has(col)) {
    // LOB §8.2a — orange zone: deplete whatever ammo type the battery fired
    newAmmo = ammoType === 'canister' ? 'none' : 'low';
  } else if (BLUE_DEPLETION_COLUMNS.has(col) && ammoType === 'canister') {
    // LOB §8.2a — blue zone: Canister Depletion only (no depletion if shell was fired)
    newAmmo = 'none';
  }

  const updatedUnit = {
    ...unit,
    ammo: newAmmo,
    depletionMarker: newAmmo !== unit.ammo, // mark depletion occurred this activation
  };

  return {
    ...state,
    units: { ...state.units, [attackerUnitId]: updatedUnit },
    // LOB §5.6 — pendingResolution for morale cascade on the target hex
    pendingResolution: {
      type: 'combatResult',
      context: {
        attackerHex: unit.hex,
        defenderHex,
        resultType: result.resultType,
        spLoss: result.spLoss ?? 0,
        openingVolleySpLoss: 0,
        moraleCheckRequired: result.moraleCheckRequired ?? false,
        leaderLossCheckRequired: (result.spLoss ?? 0) > 0,
        finalColumn: result.finalColumn,
        netColumnShifts,
        ammoType,
        range,
      },
    },
  };
}

// ─── REPLENISH_ARTILLERY ──────────────────────────────────────────────────────

/**
 * REPLENISH_ARTILLERY action handler.
 *
 * LOB §8.3 / §8.4 (By Caisson) — supply trace validation and ammo restoration.
 * SM §3.6 — Confederate batteries may trace supply to Wing Wagon OR west-edge road hex.
 * SM §3.5 / LOB_GAME_UPDATES SM — Pelham/Pleasonton batteries may use any friendly reserve.
 *
 * Payload: { unitId: string }
 *   The route server validates supply trace server-side using scenario map data.
 *   For M7, the handler accepts the player's claim and clears the depletion state.
 *   Full supply-path validation (tracing hexes) is deferred to M8+ per SDLC plan.
 *
 * Precondition: the battery is depleted (ammo !== 'full') and a valid supply trace exists.
 */
export function handleReplenishArtillery(state, action, { oob: injectedOob } = {}) {
  if (!state.activityPhase) {
    throw new ActionError(
      'INVALID_ACTION',
      'REPLENISH_ARTILLERY is only valid during the Activity Phase'
    );
  }

  const { unitId } = action.payload ?? {};
  if (!unitId || typeof unitId !== 'string') {
    throw new ActionError('INVALID_PAYLOAD', 'REPLENISH_ARTILLERY requires unitId');
  }

  const unit = state.units[unitId];
  if (!unit || !unit.isOnBoard) {
    throw new ActionError('INVALID_ACTION', `Unit '${unitId}' is not on board`);
  }

  const oob = injectedOob ?? loadOob();
  const oobUnit = findOobUnit(oob, unitId);
  if (!isArtilleryUnit(oobUnit)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not an artillery battery (LOB §8.3)`
    );
  }

  // LOB §8.3 — only depleted batteries can replenish (ammo !== 'full')
  if (unit.ammo === 'full') {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' is not depleted — replenishment is only valid when ammo is not full (LOB §8.3)`
    );
  }

  // LOB §8.4b — cannot replenish with CBF marker
  if (unit.cbfMarker) {
    throw new ActionError(
      'INVALID_ACTION',
      `Unit '${unitId}' has a CBF marker — By Caisson replenishment not permitted (LOB §8.4b)`
    );
  }

  // LOB §8.3 / SM §3.6 — supply trace validity is trusted from caller for M7.
  // Full hex-path supply-trace validation (Wing Wagon OR west-edge road hex) is deferred to M8+.
  // Pelham/Pleasonton override (SM §3.5 / LOB_GAME_UPDATES): any friendly reserve accepted.

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        ammo: 'full', // LOB §8.4 — By Caisson restores full ammo
        depletionMarker: false, // LOB §8.4 — depletion marker cleared
      },
    },
  };
}
