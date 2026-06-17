import { leaderLossResult } from '../tables/leader-loss.js';
import { loadOob, findOobLeader } from '../oob.js';
import { ActionError } from './actionError.js';

/**
 * RESOLVE_LEADER_CASUALTY handler.
 *
 * LOB §9.1a — resolve a pending leader casualty check. The player supplies the
 * dice roll and the leaderId from the pendingResolution context. Outcomes:
 *   noEffect  → leader is fine; clear pending
 *   wounded   → leader suffers morale penalty; mark casualtyRollPending in leaderState
 *   captured  → leader removed; advance to successor
 *   killed    → leader removed; advance to successor
 *
 * payload: { leaderId: string, roll: number, situation: 'other'|'capture'|'defender'|'attacker',
 *            isSharpshooter?: boolean }
 */
export function handleResolveLeaderCasualty(state, action) {
  // LOB §9.1a — only valid when a leaderCasualty pending resolution is active
  if (!state.pendingResolution || state.pendingResolution.type !== 'leaderCasualty') {
    throw new ActionError(
      'INVALID_ACTION',
      'RESOLVE_LEADER_CASUALTY is only valid when pendingResolution.type is leaderCasualty'
    );
  }

  const { leaderId, roll, situation, isSharpshooter = false } = action.payload ?? {};

  if (!leaderId || typeof roll !== 'number') {
    throw new ActionError('INVALID_PAYLOAD', 'RESOLVE_LEADER_CASUALTY requires leaderId and roll');
  }

  // LOB §9.1a — validate roll is a legal 2d6 value
  if (!Number.isInteger(roll) || roll < 2 || roll > 12) {
    throw new ActionError('INVALID_PAYLOAD', 'roll must be a 2d6 result (integer 2–12)');
  }

  const validSituations = ['other', 'capture', 'defender', 'attacker'];
  if (!validSituations.includes(situation)) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `situation must be one of: ${validSituations.join(', ')}`
    );
  }

  // LOB §9.1a — validate leaderId matches the pending context
  const pendingLeaderId = state.pendingResolution.context?.leaderId;
  if (pendingLeaderId && pendingLeaderId !== leaderId) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      `leaderId '${leaderId}' does not match pending context leaderId '${pendingLeaderId}'`
    );
  }

  // LOB §9.1a — look up table result
  const { result } = leaderLossResult(situation, isSharpshooter, roll);

  let leaderState = { ...state.leaderState };
  const entry = leaderState[leaderId] ?? { casualtyRollPending: false, replacedBy: null };

  if (result === 'noEffect') {
    // LOB §9.1a — no effect; clear casualty roll flag if set
    leaderState = {
      ...leaderState,
      [leaderId]: { ...entry, casualtyRollPending: false },
    };
  } else if (result === 'wounded') {
    // LOB §9.1a — wounded leader: mark casualtyRollPending; morale penalty applied by caller
    leaderState = {
      ...leaderState,
      [leaderId]: { ...entry, casualtyRollPending: true },
    };
  } else {
    // LOB §9.1a — killed or captured: advance to successor from OOB succession list
    let successor = null;
    try {
      const oob = loadOob();
      const leaderEntry = findOobLeader(oob, leaderId);
      // LOB §9.1a — succession list on the leader/formation object
      const successionIds = leaderEntry?.successionIds ?? [];
      // Find first successor not already listed as replaced
      successor =
        successionIds.find((sid) => {
          const s = leaderState[sid];
          return !s || s.replacedBy === null;
        }) ?? null;
    } catch {
      // OOB unavailable — succession stays null (acceptable at M6 depth)
    }

    leaderState = {
      ...leaderState,
      [leaderId]: { ...entry, casualtyRollPending: false, replacedBy: successor },
    };
  }

  return {
    ...state,
    leaderState,
    pendingResolution: null,
  };
}
