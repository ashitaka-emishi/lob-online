import { ActionError } from './actionError.js';
import { loadOob, buildUnitSideMap } from '../oob.js';
import { computeLOS } from '../los.js';
import { hexDistance } from '../hex.js';
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

  const { attackerHex, defenderHex, weaponClass, weaponType, dice, openingVolleyDie } =
    action.payload ?? {};

  // LOB §5.0 — payload validation
  if (!attackerHex || !defenderHex || !weaponClass || !weaponType || !Array.isArray(dice)) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      'FIRE_COMBAT requires attackerHex, defenderHex, weaponClass, weaponType, dice'
    );
  }
  if (dice.length !== 2 || dice[0] < 1 || dice[0] > 6 || dice[1] < 1 || dice[1] > 6) {
    throw new ActionError('INVALID_PAYLOAD', 'dice must be two values each 1–6');
  }
  const combatDiceRoll = dice[0] + dice[1];

  // LOB §3.0d — attacker must be in the active stack's hex
  if (attackerHex !== activity.currentActivation.hex) {
    throw new ActionError(
      'INVALID_ACTION',
      `Attacker hex '${attackerHex}' is not the active stack hex '${activity.currentActivation.hex}' (LOB §3.0d)`
    );
  }

  // LOB §5.5 — weapon class must be valid
  if (weaponClass !== 'smallArms' && weaponClass !== 'artillery') {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `weaponClass must be 'smallArms' or 'artillery', got '${weaponClass}'`
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

  // LOB §5.3 — sum SP contributions from all defender units; DG units count half (round down)
  let effectiveSPs = 0;
  for (const du of defenderUnits) {
    const duInfo = unitSideMap.get(du.id);
    if (!duInfo) continue;
    // Look up printed SP from OOB — walk the tree to find this unit
    const oobUnit = findOobUnit(loadedOob, du.id);
    if (!oobUnit) continue;
    const printedSPs = oobUnit.strengthPoints;
    // LOB §5.3 — DG state halves SP contribution (round down)
    effectiveSPs += du.moraleState === 'disorganized' ? Math.floor(printedSPs / 2) : printedSPs;
  }

  // LOB §5.6 — column shifts
  let netColumnShifts = 0;

  // LOB §5.6 — range shift (left shifts for range)
  if (weaponClass === 'smallArms') {
    const isSharpshooter = weaponType === 'SR' || weaponType === 'T';
    netColumnShifts += smallArmsRangeShift(range, isSharpshooter);
  } else {
    netColumnShifts += artilleryRangeShift(range);
  }

  // LOB §5.6 — ammo-type firepower shift (right shift if firer meets threshold)
  const ammoType = weaponClass === 'smallArms' ? weaponDef.ammo : null;
  if (ammoType) {
    const attackerOobUnit = findOobUnit(loadedOob, attackerUnits[0].id);
    const firerSPs = attackerOobUnit?.strengthPoints ?? 0;
    netColumnShifts += ammoTypeShift(ammoType, range, firerSPs);
  }

  // LOB §5.6 — target-state shifts
  const defenderIsDG = defenderUnits.some((u) => u.moraleState === 'disorganized');
  // TODO(M7): isRear, hasProtectiveTerrain, isOpenOrderCapable require terrain/facing queries
  netColumnShifts += targetStateShift({
    isRear: false,
    isDG: defenderIsDG,
    range,
    hasProtectiveTerrain: false,
    isOpenOrderCapable: false,
  });

  // LOB §5.4 — Opening Volley: fires when the attacking stack fires immediately after moving
  let openingVolleySpLoss = 0;
  const willTriggerOpeningVolley =
    activity.currentActivation.movedThisActivation && !activity.currentActivation.openingVolley;

  if (willTriggerOpeningVolley) {
    if (openingVolleyDie === undefined || openingVolleyDie === null) {
      throw new ActionError(
        'INVALID_PAYLOAD',
        'openingVolleyDie (1d6) is required when firing after a Move action (LOB §5.4)'
      );
    }
    if (openingVolleyDie < 1 || openingVolleyDie > 6) {
      throw new ActionError('INVALID_PAYLOAD', 'openingVolleyDie must be 1–6');
    }

    // LOB §5.4 — Opening Volley range condition: 1, 2, or 3+ hexes
    const ovCondition = range === 1 ? 'range1' : range === 2 ? 'range2' : 'range3';
    const ovResult = openingVolleyResult(ovCondition, openingVolleyDie);
    openingVolleySpLoss = ovResult.spLoss;
  }

  // LOB §5.6 — resolve the Combat Table
  const result = combatResult(effectiveSPs, netColumnShifts, combatDiceRoll);

  // LOB §5.8 — Shell/Canister Depletion: check depletion band; update attacker ammo if triggered.
  // Depletion is not rolled here — it is a deterministic band check. The depletion roll itself
  // is a separate pending resolution (deferred to M7; for now we set the marker on 'left' band).
  // NOTE: this is a simplification — full depletion requires a separate die roll per LOB §5.8.
  let updatedUnits = state.units;
  const attackerId = attackerUnits[0].id;
  if (result.depletionBand === 'left' && state.units[attackerId]) {
    updatedUnits = {
      ...state.units,
      [attackerId]: {
        ...state.units[attackerId],
        depletionMarker: true,
      },
    };
  }

  // LOB §8.1 — CBF marker: set on each defender unit when SP loss > 0
  if (result.spLoss > 0 || openingVolleySpLoss > 0) {
    const newUnits = { ...updatedUnits };
    for (const du of defenderUnits) {
      if (newUnits[du.id]) {
        newUnits[du.id] = { ...newUnits[du.id], cbfMarker: true };
      }
    }
    updatedUnits = newUnits;
  }

  // LOB §5.4 — mark Opening Volley as fired on the activation context
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

/**
 * Walk the OOB tree and return the unit object with matching id.
 * LOB §5.3 — needed to look up printed strengthPoints for SP computation.
 *
 * @param {object} oob - validated OOB data
 * @param {string} unitId
 * @returns {object|null}
 */
function findOobUnit(oob, unitId) {
  function searchList(list) {
    for (const item of list ?? []) {
      if (item.id === unitId) return item;
    }
    return null;
  }

  function searchBrigade(brigade) {
    return searchList(brigade.regiments) ?? searchList(brigade.batteries);
  }

  function searchArtilleryGroup(artGroup) {
    for (const group of Object.values(artGroup ?? {})) {
      const found = searchList(group.batteries);
      if (found) return found;
    }
    return null;
  }

  function searchDivision(div) {
    for (const brig of div.brigades ?? []) {
      const found = searchBrigade(brig);
      if (found) return found;
    }
    return searchArtilleryGroup(div.artillery) ?? searchList(div.batteries);
  }

  // Union
  for (const corps of oob.union.corps ?? []) {
    const found =
      searchList(corps.corpsUnits) ??
      searchArtilleryGroup(corps.artillery) ??
      corps.divisions?.reduce((acc, d) => acc ?? searchDivision(d), null);
    if (found) return found;
  }
  const cavFound =
    oob.union.cavalryDivision?.brigades?.reduce((acc, b) => acc ?? searchBrigade(b), null) ??
    searchArtilleryGroup(oob.union.cavalryDivision?.artillery);
  if (cavFound) return cavFound;

  // Confederate
  for (const div of oob.confederate.divisions ?? []) {
    const found = searchDivision(div);
    if (found) return found;
  }
  const indFound =
    searchList(oob.confederate.independent?.cavalry) ??
    searchList(oob.confederate.independent?.artillery) ??
    searchList(oob.confederate.reserveArtillery?.batteries);
  if (indFound) return indFound;

  for (const brig of oob.confederate.independentBrigades ?? []) {
    const found = searchList(brig.regiments) ?? searchArtilleryGroup(brig.artillery);
    if (found) return found;
  }

  return null;
}
