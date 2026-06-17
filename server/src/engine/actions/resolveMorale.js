import { ActionError } from './actionError.js';
import { loadOob, findOobUnit } from '../oob.js';
import { resolvePendingMorale } from '../morale.js';
import { MORALE_PENDING_TYPES } from '../../constants/resolution.js';

/**
 * RESOLVE_MORALE action handler.
 *
 * LOB §6.1/§7.0/§6.3 — resolves a pending combat-result, closing-roll, or morale-cascade
 * check by applying the player-supplied dice roll to the affected hex units.
 *
 * Payload: { dice: [d1, d2], mods?: { ... } }
 *
 *   dice: [d1, d2] — two d6 rolls for the Morale Table (sum 2–12)
 *   mods: morale modifier flags (see engine/tables/morale.js computeEffectiveRoll)
 *
 * Precondition: state.pendingResolution.type ∈ { 'combatResult', 'closingRoll', 'moraleCheck' }
 *
 * Returns new state with morale applied to the target hex units and
 * pendingResolution cleared (or updated to 'leaderCasualty' / next cascade check).
 */
export function handleResolveMorale(state, action, { oob } = {}) {
  // LOB §6.1 — only valid when a morale-type resolution is pending (#571)
  if (!state.pendingResolution || !MORALE_PENDING_TYPES.has(state.pendingResolution.type)) {
    throw new ActionError(
      'INVALID_ACTION',
      "RESOLVE_MORALE is only valid when pendingResolution type is 'combatResult', 'closingRoll', or 'moraleCheck'"
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

  // Build a getRating function that walks the OOB for each unit's morale rating
  const getRating = (unitId) => {
    const unit = findOobUnit(loadedOob, unitId);
    return unit?.morale ?? 'D';
  };

  // LOB §6.3 — pass oob for brigade cascade lookup
  return resolvePendingMorale(state, diceRoll, mods, getRating, loadedOob);
}
