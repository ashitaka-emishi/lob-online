import { ActionError } from './actionError.js';
import { loadOob, buildUnitSideMap } from '../oob.js';
import { hexDistance } from '../hex.js';
import { openingVolleyResult } from '../tables/combat.js';
import { closingRollResult } from '../tables/charge.js';

/**
 * CLOSE_COMBAT action handler.
 *
 * LOB §7 — Close Combat (Charge). Resolves a charge from the active stack's hex
 * into an adjacent enemy hex.
 *
 * Payload:
 *   { attackerHex, defenderHex, closingDie, openingVolleyDie?,
 *     mods?: { hasLeaderMorale2Plus?, isRear?, isShaken?,
 *              frontalArtilleryWithCanister?, startsAdjacentToTarget? } }
 *
 *   closingDie:       1d6 raw result for the Closing Roll
 *   openingVolleyDie: 1d6 — required; defender fires Opening Volley (LOB §7.0b)
 *   mods:             Closing Roll modifiers (LOB_CHARTS §3.5)
 *
 * Sequence (LOB §7.0):
 *   1. Validate adjacency, side affiliation, active stack ownership.
 *   2. Defender Opening Volley (LOB §7.0b): always fires; apply SP loss to attacker.
 *      If attacker driven to 0 SPs after OV, abort charge — no Closing Roll.
 *   3. Automatic 1 SP defender loss (LOB §7.0c).
 *   4. Closing Roll (LOB §7.0d/§3.5): attacker rolls 1d6 + mods vs. defender morale threshold.
 *      - Open Order Capable units: automatic pass (LOB §9.4).
 *   5. On pass: defender retreats one hex (retreat handled in morale cascade — pendingResolution).
 *   6. Set pendingResolution for morale cascade and leader loss checks.
 *
 * Returns new state with pendingResolution: { type: 'closingRoll', context: { ... } }
 */
export function handleCloseCombat(state, action, { oob, mapData } = {}) {
  const activity = state.activityPhase;
  if (!activity) {
    throw new ActionError('INVALID_ACTION', 'CLOSE_COMBAT is only valid during the Activity Phase');
  }
  if (activity.currentActivation === null) {
    throw new ActionError('INVALID_ACTION', 'No stack is mid-activation — cannot charge');
  }

  const {
    attackerHex,
    defenderHex,
    closingDie,
    openingVolleyDie,
    mods = {},
  } = action.payload ?? {};

  // LOB §7.0 — payload validation
  if (!attackerHex || !defenderHex || closingDie === undefined || closingDie === null) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      'CLOSE_COMBAT requires attackerHex, defenderHex, and closingDie'
    );
  }
  if (closingDie < 1 || closingDie > 6) {
    throw new ActionError('INVALID_PAYLOAD', 'closingDie must be 1–6');
  }

  // LOB §7.0b — defender always fires Opening Volley against charger; die is required
  if (openingVolleyDie === undefined || openingVolleyDie === null) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      'openingVolleyDie (1d6) is required — defender fires Opening Volley (LOB §7.0b)'
    );
  }
  if (openingVolleyDie < 1 || openingVolleyDie > 6) {
    throw new ActionError('INVALID_PAYLOAD', 'openingVolleyDie must be 1–6');
  }

  // LOB §3.0d — attacker must be in the active stack's hex
  if (attackerHex !== activity.currentActivation.hex) {
    throw new ActionError(
      'INVALID_ACTION',
      `Attacker hex '${attackerHex}' is not the active stack hex '${activity.currentActivation.hex}' (LOB §3.0d)`
    );
  }

  // LOB §7.0 — charge must be into an adjacent hex (distance = 1)
  const gridSpec = mapData?.gridSpec ?? null;
  const range = gridSpec
    ? hexDistance(attackerHex, defenderHex, gridSpec)
    : Math.abs(parseInt(attackerHex.split('.')[0]) - parseInt(defenderHex.split('.')[0])) +
      Math.abs(parseInt(attackerHex.split('.')[1]) - parseInt(defenderHex.split('.')[1]));

  if (range !== 1) {
    throw new ActionError(
      'INVALID_ACTION',
      `Close combat requires adjacent hexes (distance 1); distance is ${range} (LOB §7.0)`
    );
  }

  // LOB §5.5 / §7.0 — resolve side affiliation
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

  const attackerInfo = unitSideMap.get(attackerUnits[0].id);
  const defenderInfo = unitSideMap.get(defenderUnits[0].id);

  if (!attackerInfo) {
    throw new ActionError(
      'INVALID_ACTION',
      `Attacker unit '${attackerUnits[0].id}' not found in OOB`
    );
  }
  if (!defenderInfo) {
    throw new ActionError(
      'INVALID_ACTION',
      `Defender unit '${defenderUnits[0].id}' not found in OOB`
    );
  }
  if (attackerInfo.side === defenderInfo.side) {
    throw new ActionError(
      'INVALID_ACTION',
      'Attacker and defender are on the same side — friendly close combat is not allowed (LOB §7.0)'
    );
  }

  let updatedUnits = { ...state.units };

  // LOB §7.0b — Defender Opening Volley: fires against charger at range 1 (charge condition)
  const ovResult = openingVolleyResult('charge', openingVolleyDie);
  const ovSpLoss = ovResult.spLoss;

  // Apply Opening Volley SP loss as CBF markers on attacker units (morale cascade handles actual
  // SP reduction; for now we record the loss in context and mark CBF).
  // LOB §8.1 — CBF marker on units that take a loss
  if (ovSpLoss > 0) {
    const attackerId = attackerUnits[0].id;
    if (updatedUnits[attackerId]) {
      updatedUnits = {
        ...updatedUnits,
        [attackerId]: { ...updatedUnits[attackerId], cbfMarker: true },
      };
    }
  }

  // LOB §7.0b — if Opening Volley would eliminate the attacker (OV loss ≥ attacker printed SPs),
  // the charge is aborted. Full SP tracking is deferred to morale cascade; here we check the
  // OV condition flag and record it in context for the morale cascade to resolve.
  // Actual abort enforcement happens when morale cascade processes the combatResult.
  // For now, record ovSpLoss in the pending context so Phase 4 can apply it.

  // LOB §7.0c — automatic 1 SP defender loss (close combat always costs the defender 1 SP)
  // LOB §8.1 — CBF marker set on each defender unit that takes a loss
  const defenderSpLoss = 1; // LOB §7.0c — automatic 1 SP loss for defender
  const newUnits = { ...updatedUnits };
  for (const du of defenderUnits) {
    if (newUnits[du.id]) {
      newUnits[du.id] = { ...newUnits[du.id], cbfMarker: true };
    }
  }
  updatedUnits = newUnits;

  // LOB §7.0d / §3.5 — Closing Roll
  // Determine attacker morale rating from OOB for the Closing Roll threshold
  // The attacker's morale rating determines the threshold; look up first attacker unit's morale.
  // Note: LOB uses the charging unit's morale rating for the Closing Roll (not defender's).
  const attackerOobUnit = findOobUnit(loadedOob, attackerUnits[0].id);
  const attackerMoraleRating = attackerOobUnit?.morale ?? 'D';

  // LOB §9.4 — Open Order Capable units pass the Closing Roll automatically (no die needed)
  // TODO(M7): determine Open Order Capable status from OOB/formation data; for now no units
  // are Open Order Capable in South Mountain at this stage.
  const isOpenOrderCapable = false;

  let closingPass;
  let closingThreshold;
  let closingModifiedRoll;

  if (isOpenOrderCapable) {
    // LOB §9.4 — automatic pass for Open Order Capable units
    closingPass = true;
    closingThreshold = 0;
    closingModifiedRoll = 99;
  } else {
    // LOB §3.5 / §7.0d — roll Closing Roll with modifiers
    const crResult = closingRollResult(attackerMoraleRating, mods, closingDie);
    closingPass = crResult.pass;
    closingThreshold = crResult.threshold;
    closingModifiedRoll = crResult.modifiedRoll;
  }

  return {
    ...state,
    units: updatedUnits,
    activityPhase: activity,
    // LOB §7.0d — close combat result enters pendingResolution; morale cascade resolves retreat
    // and further morale checks (Phase 4). leaderLossCheckRequired when m+ result occurs.
    pendingResolution: {
      type: 'closingRoll',
      context: {
        attackerHex,
        defenderHex,
        openingVolleySpLoss: ovSpLoss,
        defenderSpLoss,
        closingPass,
        closingThreshold,
        closingModifiedRoll,
        // LOB §9.1a — leader loss check required when Closing Roll passes (charge succeeds)
        leaderLossCheckRequired: closingPass,
        // LOB §6.0 — defender morale check required after automatic SP loss
        moraleCheckRequired: true,
      },
    },
  };
}

/**
 * Walk the OOB tree and return the unit object with matching id.
 * Duplicated from fireCombat.js — will be extracted to engine/oob.js in M7 cleanup.
 * LOB §7.0d — needed to resolve attacker morale rating for Closing Roll threshold.
 *
 * @param {object} oob
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
