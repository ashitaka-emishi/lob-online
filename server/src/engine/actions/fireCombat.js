import { ActionError } from './actionError.js';
import { loadOob, buildUnitSideMap, findOobUnit, sumCurrentSPs } from '../oob.js';
import { computeLOS } from '../los.js';
import { hexDistance } from '../hex.js';
import { FireCombatPayloadSchema, parsePayload } from './payloads.js';
import {
  combatResult,
  openingVolleyResult,
  smallArmsRangeShift,
  artilleryRangeShift,
  ammoTypeShift,
  targetStateShift,
} from '../tables/combat.js';
import { SMALL_ARMS, ARTILLERY } from '../tables/weapons.js';

// LOB §5.5 — maximum small-arms and artillery fire ranges by weapon type.
// Weapon max ranges are defined in tables/weapons.js; looked up per-fire.

/**
 * FIRE_COMBAT action handler.
 *
 * LOB §5 — Fire Combat. Resolves one fire attack from the active stack's hex against
 * an enemy hex, computing all column shifts and entering a pending morale cascade result.
 *
 * Payload: { attackerHex, defenderHex, weaponClass, weaponType, dice: [d1, d2], openingVolleyDie? }
 *
 *   weaponClass: 'smallArms' | 'artillery'
 *   weaponType:  small-arms code (e.g. 'R', 'M') or artillery gun code (e.g. 'R', 'N')
 *   dice:        [d1, d2] — two d6 rolls for the Combat Table (sum 2–12)
 *   openingVolleyDie: 1d6 — required when Opening Volley triggers (movedThisActivation === true)
 *
 * Returns new state with pendingResolution: { type: 'combatResult', context: { ... } }
 * and attacker ammo/depletionMarker updated if depletion fires.
 */
export function handleFireCombat(state, action, { oob, scenario, mapData, hexIndex } = {}) {
  const activity = state.activityPhase;
  if (!activity) {
    throw new ActionError('INVALID_ACTION', 'FIRE_COMBAT is only valid during the Activity Phase');
  }
  if (activity.currentActivation === null) {
    throw new ActionError('INVALID_ACTION', 'No stack is mid-activation — cannot fire');
  }

  // LOB §5.0 — validate payload at the boundary before any field is consumed
  const { attackerHex, defenderHex, weaponClass, weaponType, dice, openingVolleyDie } =
    parsePayload(action.payload, FireCombatPayloadSchema);

  const combatDiceRoll = dice[0] + dice[1];

  // LOB §3.0d — attacker must be in the active stack's hex
  if (attackerHex !== activity.currentActivation.hex) {
    throw new ActionError(
      'INVALID_ACTION',
      `Attacker hex '${attackerHex}' is not the active stack hex '${activity.currentActivation.hex}' (LOB §3.0d)`
    );
  }

  // LOB §5.5 — weapon type must be recognised
  const weaponDef = weaponClass === 'smallArms' ? SMALL_ARMS[weaponType] : ARTILLERY[weaponType];
  if (!weaponDef) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `Unknown ${weaponClass} weapon type '${weaponType}' (LOB §5.5)`
    );
  }

  // LOB §5.5 — resolve side affiliation; defender must be an enemy unit
  const loadedOob = oob ?? loadOob();
  const unitSideMap = buildUnitSideMap(loadedOob);

  const attackerUnits = Object.values(state.units).filter(
    (u) => u.isOnBoard && u.hex === attackerHex
  );
  const defenderUnits = Object.values(state.units).filter(
    (u) => u.isOnBoard && u.hex === defenderHex
  );

  if (attackerUnits.length === 0) {
    throw new ActionError('INVALID_ACTION', `No on-board units in attacker hex '${attackerHex}'`);
  }
  if (defenderUnits.length === 0) {
    throw new ActionError('INVALID_ACTION', `No on-board units in defender hex '${defenderHex}'`);
  }

  // LOB §5.5 — attacker side derived from OOB; firing unit is the first on-board unit in the hex
  const attackerUnitInfo = unitSideMap.get(attackerUnits[0].id);
  const defenderUnitInfo = unitSideMap.get(defenderUnits[0].id);

  if (!attackerUnitInfo) {
    throw new ActionError(
      'INVALID_ACTION',
      `Attacker unit '${attackerUnits[0].id}' not found in OOB`
    );
  }
  if (!defenderUnitInfo) {
    throw new ActionError(
      'INVALID_ACTION',
      `Defender unit '${defenderUnits[0].id}' not found in OOB`
    );
  }

  // LOB §5.5 / Security — active player may only fire with their own units (#603)
  if (attackerUnitInfo.side !== action.playerSide) {
    throw new ActionError(
      'INVALID_ACTION',
      `Player '${action.playerSide}' cannot fire with ${attackerUnitInfo.side} units (LOB §5.5)`
    );
  }

  if (attackerUnitInfo.side === defenderUnitInfo.side) {
    throw new ActionError(
      'INVALID_ACTION',
      'Attacker and defender are on the same side — friendly fire is not allowed (LOB §5.5)'
    );
  }

  // LOB §5.1 — validate LOS between attacker and defender hexes
  if (scenario && mapData) {
    const los = computeLOS(attackerHex, defenderHex, scenario, mapData, hexIndex ?? null);
    if (!los.canSee) {
      throw new ActionError(
        'INVALID_ACTION',
        `No LOS from '${attackerHex}' to '${defenderHex}': ${los.reason} (LOB §5.1)`
      );
    }
  }

  // LOB §5.5 — validate range
  const gridSpec = mapData?.gridSpec ?? null;
  const range = gridSpec
    ? hexDistance(attackerHex, defenderHex, gridSpec)
    : Math.abs(parseInt(attackerHex.split('.')[0]) - parseInt(defenderHex.split('.')[0])) +
      Math.abs(parseInt(attackerHex.split('.')[1]) - parseInt(defenderHex.split('.')[1]));

  const maxRange = weaponDef.maxRange;
  if (range > maxRange) {
    throw new ActionError(
      'INVALID_ACTION',
      `Range ${range} exceeds maximum range ${maxRange} for ${weaponType} (LOB §5.5)`
    );
  }

  // LOB §5.6 — combat column is determined by the ATTACKER's effective SPs (not defender's).
  // Current SPs (with prior losses) are used; OOB printed SPs are only the fallback when no
  // current SP is tracked on the unit state. DG attackers halve current SPs per LOB §5.0.
  let effectiveSPs = sumCurrentSPs(attackerUnits, loadedOob, { applyDgHalving: true });

  // LOB §5.6 — column shifts
  let netColumnShifts = 0;

  // LOB §5.6 — range shift (left shifts for range)
  if (weaponClass === 'smallArms') {
    const isSharpshooter = weaponType === 'SR' || weaponType === 'T';
    netColumnShifts += smallArmsRangeShift(range, isSharpshooter);
  } else {
    netColumnShifts += artilleryRangeShift(range);
  }

  // LOB §5.6 — ammo-type firepower shift (right shift if firer meets SP threshold)
  // Threshold uses current SPs (post-loss), not printed strength, matching §5.6 "engaged SPs".
  const ammoType = weaponClass === 'smallArms' ? weaponDef.ammo : null;
  if (ammoType) {
    const primaryAttacker = attackerUnits[0];
    const attackerOobUnit = findOobUnit(loadedOob, primaryAttacker.id);
    // LOB §5.6 — current SPs; fall back to printed when no loss has been tracked yet
    const firerSPs = primaryAttacker.strengthPoints ?? attackerOobUnit?.strengthPoints ?? 0;
    netColumnShifts += ammoTypeShift(ammoType, range, firerSPs);
  }

  // LOB §5.6 — target-state shifts
  const defenderIsDG = defenderUnits.some((u) => u.moraleState === 'disorganized');
  // TODO(M7): isRear, hasProtectiveTerrain, isOpenOrderCapable require terrain/facing queries (#609)
  netColumnShifts += targetStateShift({
    isRear: false,
    isDG: defenderIsDG,
    range,
    hasProtectiveTerrain: false,
    isOpenOrderCapable: false,
  });

  // LOB §5.4a — Opening Volley: fired by the INACTIVE DEFENDER against the moving attacker
  // when the attacker fires immediately after moving. SP loss applies to the ATTACKER, not
  // the defender. OV is resolved before the main combat roll; attacker's effective SPs are
  // reduced if OV causes SP loss (additional morale check on the attacker is deferred to M7).
  let openingVolleySpLoss = 0;
  let updatedUnits = { ...state.units };
  const willTriggerOpeningVolley =
    activity.currentActivation.movedThisActivation && !activity.currentActivation.openingVolley;

  if (willTriggerOpeningVolley) {
    if (openingVolleyDie === undefined || openingVolleyDie === null) {
      throw new ActionError(
        'INVALID_PAYLOAD',
        'openingVolleyDie (1d6) is required when firing after a Move action (LOB §5.4a)'
      );
    }
    if (openingVolleyDie < 1 || openingVolleyDie > 6) {
      throw new ActionError('INVALID_PAYLOAD', 'openingVolleyDie must be 1–6');
    }

    // LOB §5.4a — Opening Volley range condition: 1, 2, or 3+ hexes
    const ovCondition = range === 1 ? 'range1' : range === 2 ? 'range2' : 'range3';
    const ovResult = openingVolleyResult(ovCondition, openingVolleyDie);
    openingVolleySpLoss = ovResult.spLoss;

    // LOB §5.4a — OV SP loss applied to the attacker stack (defender fired at the moving attacker)
    if (openingVolleySpLoss > 0 && attackerUnits.length > 0) {
      const primaryAttacker = attackerUnits[0];
      if (updatedUnits[primaryAttacker.id]) {
        const currentSPs =
          updatedUnits[primaryAttacker.id].strengthPoints ??
          findOobUnit(loadedOob, primaryAttacker.id)?.strengthPoints ??
          0;
        updatedUnits[primaryAttacker.id] = {
          ...updatedUnits[primaryAttacker.id],
          strengthPoints: Math.max(0, currentSPs - openingVolleySpLoss),
        };
        // LOB §5.4a — OV SP loss also reduces effective SPs for the main combat column
        effectiveSPs = Math.max(0, effectiveSPs - openingVolleySpLoss);
      }
    }
  }

  // LOB §5.6 — resolve the Combat Table
  const result = combatResult(effectiveSPs, netColumnShifts, combatDiceRoll);

  // LOB §5.8 — Shell/Canister Depletion: check depletion band; update attacker ammo if triggered.
  // Depletion is not rolled here — it is a deterministic band check. The depletion roll itself
  // is a separate pending resolution (deferred to M7; for now we set the marker on 'left' band).
  // NOTE: this is a simplification — full depletion requires a separate die roll per LOB §5.8.
  const attackerId = attackerUnits[0].id;
  if (result.depletionBand === 'left' && updatedUnits[attackerId]) {
    updatedUnits = {
      ...updatedUnits,
      [attackerId]: {
        ...updatedUnits[attackerId],
        depletionMarker: true,
      },
    };
  }

  // LOB §5.8 — CBF (Canister By Fire) marker: set on each DEFENDER unit that takes SP loss,
  // but ONLY when ARTILLERY fires on ARTILLERY (arty-vs-arty). Infantry SP loss never sets CBF.
  // Attacker weaponClass is from the action payload; defender artillery is identified by gunType.
  if (result.spLoss > 0 && weaponClass === 'artillery') {
    const newUnits = { ...updatedUnits };
    for (const du of defenderUnits) {
      if (!newUnits[du.id]) continue;
      const defOobUnit = findOobUnit(loadedOob, du.id);
      // LOB §5.8 — CBF only when the defender is also an artillery unit (has gunType)
      if (defOobUnit?.gunType) {
        newUnits[du.id] = { ...newUnits[du.id], cbfMarker: true };
      }
    }
    updatedUnits = newUnits;
  }

  // LOB §5.4a — mark Opening Volley as fired on the activation context
  const newCurrentActivation = willTriggerOpeningVolley
    ? { ...activity.currentActivation, openingVolley: true }
    : activity.currentActivation;

  return {
    ...state,
    units: updatedUnits,
    activityPhase: {
      ...activity,
      currentActivation: newCurrentActivation,
    },
    // LOB §5.6 — fire result enters pendingResolution; morale cascade resolves it (Phase 4)
    pendingResolution: {
      type: 'combatResult',
      context: {
        attackerHex,
        defenderHex,
        resultType: result.resultType,
        spLoss: result.spLoss,
        openingVolleySpLoss,
        moraleCheckRequired: result.moraleCheckRequired,
        leaderLossCheckRequired: result.leaderLossCheckRequired,
        finalColumn: result.finalColumn,
        netColumnShifts,
      },
    },
  };
}
