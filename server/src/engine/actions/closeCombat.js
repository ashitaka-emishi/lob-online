import { ActionError } from './actionError.js';
import { loadOob, buildUnitSideMap, findOobUnit, sumCurrentSPs } from '../oob.js';
import { hexDistance } from '../hex.js';
import { openingVolleyResult } from '../tables/combat.js';
import { closingRollResult } from '../tables/charge.js';
import { CloseCombatPayloadSchema, parsePayload } from './payloads.js';

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

  // LOB §7.0 — validate payload at the boundary before any field is consumed
  const { attackerHex, defenderHex, closingDie, openingVolleyDie, mods } = parsePayload(
    action.payload,
    CloseCombatPayloadSchema
  );

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
  // LOB §7.0 / Security — active player may only charge with their own units (#603)
  if (attackerInfo.side !== action.playerSide) {
    throw new ActionError(
      'INVALID_ACTION',
      `Player '${action.playerSide}' cannot charge with ${attackerInfo.side} units (LOB §7.0)`
    );
  }
  if (attackerInfo.side === defenderInfo.side) {
    throw new ActionError(
      'INVALID_ACTION',
      'Attacker and defender are on the same side — friendly close combat is not allowed (LOB §7.0)'
    );
  }

  // LOB §7.0 — sum attacker current SPs (not printed). DG halving does NOT apply to this
  // gate — §5.0 DG ×½ is only for the Combat Table column; §7.0g uses all SPs unmodified for DG.
  // "SPs remaining in the attack" = current strength (with OOB printed as fallback if no marker).
  const attackerSPs = sumCurrentSPs(attackerUnits, loadedOob, { applyDgHalving: false });

  let updatedUnits = { ...state.units };

  // LOB §7.0b — Defender Opening Volley: fires against charger at range 1 (charge condition)
  const ovResult = openingVolleyResult('charge', openingVolleyDie);
  const ovSpLoss = ovResult.spLoss;

  // Apply Opening Volley SP loss as CBF markers on attacker units (morale cascade handles actual
  // SP reduction; for now we record the loss in context and mark CBF).
  // LOB §5.8 — CBF marker set on units that take an SP loss from fire
  if (ovSpLoss > 0) {
    const attackerId = attackerUnits[0].id;
    if (updatedUnits[attackerId]) {
      updatedUnits = {
        ...updatedUnits,
        [attackerId]: { ...updatedUnits[attackerId], cbfMarker: true },
      };
    }
  }

  // TODO(M7): §5.4b/§7.0 — abort charge (return) before §7.0a(e) gate and Closing Roll when ovSpLoss >= attackerSPs. (#609)

  // LOB §7.0a(e) / §7.0 prose — gate is evaluated on post-Opening-Volley SPs ("remaining in the attack").
  // Charge Sequence: OV fires first (step 1), then automatic SP loss check (step 2).
  // LOB §5.8 — CBF marker set on each defender unit that takes a loss.
  const postOvAttackerSPs = Math.max(0, attackerSPs - ovSpLoss);
  const defenderSpLoss = postOvAttackerSPs >= 4 ? 1 : 0; // LOB §7.0a(e) — ≥4 SPs remaining after OV → automatic 1 SP defender loss
  if (defenderSpLoss > 0) {
    const newUnits = { ...updatedUnits };
    for (const du of defenderUnits) {
      if (newUnits[du.id]) {
        newUnits[du.id] = { ...newUnits[du.id], cbfMarker: true };
      }
    }
    updatedUnits = newUnits;
  }

  // LOB §7.0d / §3.5 — Closing Roll
  // Determine attacker morale rating from OOB for the Closing Roll threshold
  // The attacker's morale rating determines the threshold; look up first attacker unit's morale.
  // Note: LOB uses the charging unit's morale rating for the Closing Roll (not defender's).
  const attackerOobUnit = findOobUnit(loadedOob, attackerUnits[0].id);
  const attackerMoraleRating = attackerOobUnit?.morale ?? 'D';

  // LOB §9.4 — Open Order Capable units pass the Closing Roll automatically (no die needed)
  // TODO(M7): determine Open Order Capable status from OOB/formation data; for now no units
  // are Open Order Capable in South Mountain at this stage. (#609)
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
        // LOB §9.1a — leader loss triggers on Combat Table or Opening Volley SP loss only.
        // Charge Sequence (LOB_CHARTS): leader loss at steps 1 (OV) and 2 (§7.0c auto loss);
        // morale check is step 3. Cascade morale SP losses do NOT trigger §9.1a — confirmed
        // by domain-expert ruling 2026-06-21 (pre-m8-debt-sprint_20260621).
        leaderLossCheckRequired: defenderSpLoss > 0 || ovSpLoss > 0,
        // LOB §7.0a(f) — Charge Sequence always ends with a defender Morale Check, independent of SP loss (modifiers per §7.0g)
        moraleCheckRequired: true,
      },
    },
  };
}
