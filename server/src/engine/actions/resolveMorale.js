import { ActionError } from './actionError.js';
import { loadOob, buildUnitSideMap } from '../oob.js';
import { resolvePendingMorale } from '../morale.js';

/**
 * RESOLVE_MORALE action handler.
 *
 * LOB §6.1 — resolves a pending 'combatResult' morale check by applying the
 * player-supplied dice roll to all units in the defender hex.
 *
 * Payload: { dice: [d1, d2], mods?: { ... } }
 *
 *   dice: [d1, d2] — two d6 rolls for the Morale Table (sum 2–12)
 *   mods: morale modifier flags (see engine/tables/morale.js computeEffectiveRoll)
 *
 * Precondition: state.pendingResolution.type === 'combatResult'
 *
 * Returns new state with morale applied to defender hex units and
 * pendingResolution cleared (or updated to 'leaderCasualty' / cascade check).
 */
export function handleResolveMorale(state, action, { oob } = {}) {
  // LOB §6.1 — only valid when a combat result is pending morale resolution
  if (!state.pendingResolution || state.pendingResolution.type !== 'combatResult') {
    throw new ActionError(
      'INVALID_ACTION',
      "RESOLVE_MORALE is only valid when pendingResolution type is 'combatResult'"
    );
  }

  const { dice, mods = {} } = action.payload ?? {};

  if (!Array.isArray(dice) || dice.length !== 2) {
    throw new ActionError('INVALID_PAYLOAD', 'RESOLVE_MORALE requires dice: [d1, d2]');
  }
  if (dice[0] < 1 || dice[0] > 6 || dice[1] < 1 || dice[1] > 6) {
    throw new ActionError('INVALID_PAYLOAD', 'dice values must each be 1–6');
  }

  const diceRoll = dice[0] + dice[1];

  // LOB §6.1 — build unit → morale rating map from OOB for the morale check
  const loadedOob = oob ?? loadOob();
  const unitSideMap = buildUnitSideMap(loadedOob);
  void unitSideMap; // side map loaded; rating lookup uses findOobUnit below

  // Build a getRating function that walks the OOB for each unit's morale rating
  const getRating = (unitId) => {
    const unit = findOobUnit(loadedOob, unitId);
    return unit?.morale ?? 'D';
  };

  return resolvePendingMorale(state, diceRoll, mods, getRating);
}

/**
 * Walk the OOB tree and return the unit object with matching id.
 * LOB §6.1 — needed to look up morale rating for each unit being checked.
 * Duplicated from fireCombat.js — will be extracted to engine/oob.js in M7 cleanup.
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
