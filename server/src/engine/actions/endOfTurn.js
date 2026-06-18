/**
 * End-of-turn accounting action handlers.
 *
 * LOB §10.8c — Attack Recovery: per-division two-roll check each Command Phase.
 * SM §7.0    — Random Events: 2d6 per active player each Command Phase after order acceptance.
 * SM §7.0    — Variable Reinforcements: 1d6 per Force at game start to schedule arrival time/hex.
 */

import { ActionError } from './actionError.js';
import { attackRecoveryResult } from '../tables/command.js';

// ─── Attack Recovery (LOB §10.8c) ────────────────────────────────────────────

/**
 * ROLL_ATTACK_RECOVERY action handler.
 *
 * LOB §10.8c — per-division two-roll check. Called for each division in the
 * pendingAttackRecovery list. Both rolls supplied by the player on one action.
 *
 * Payload: {
 *   divisionId: string,        — the division being rolled for
 *   commandValue: number,      — leader command value (0–4)
 *   step1Roll: number,         — 2d6 (2–12) for the base check
 *   step2Roll: number,         — 2d6 (2–12) for the leader roll
 * }
 *
 * On recovery: unit's order.status transitions from 'stopped' → 'none'.
 * Removes the divisionId from pendingAttackRecovery.divisionIds.
 * When the list empties, clears pendingAttackRecovery to null.
 */
export function handleRollAttackRecovery(state, action) {
  if (state.pendingAttackRecovery === null) {
    throw new ActionError(
      'INVALID_ACTION',
      'ROLL_ATTACK_RECOVERY is only valid when pendingAttackRecovery is set (LOB §10.8c)'
    );
  }

  const { divisionId, commandValue, step1Roll, step2Roll } = action.payload ?? {};

  if (!divisionId || typeof divisionId !== 'string') {
    throw new ActionError('INVALID_PAYLOAD', 'ROLL_ATTACK_RECOVERY requires divisionId');
  }
  if (!Number.isInteger(step1Roll) || step1Roll < 2 || step1Roll > 12) {
    throw new ActionError('INVALID_PAYLOAD', 'step1Roll must be 2–12');
  }
  if (!Number.isInteger(step2Roll) || step2Roll < 2 || step2Roll > 12) {
    throw new ActionError('INVALID_PAYLOAD', 'step2Roll must be 2–12');
  }
  if (!Number.isInteger(commandValue) || commandValue < 0 || commandValue > 4) {
    throw new ActionError('INVALID_PAYLOAD', 'commandValue must be 0–4');
  }

  if (!state.pendingAttackRecovery.divisionIds.includes(divisionId)) {
    throw new ActionError(
      'INVALID_ACTION',
      `Division '${divisionId}' is not in the pending attack recovery list`
    );
  }

  // LOB §10.8c — determine which depletion tier applies to the division
  // Simple heuristic: any dead units → 'dead'; any wrecked → 'wrecked'; else 'clean'.
  // The engine does not yet have per-division tracking; scan the unit map for matching prefix.
  // TODO(M8+): wire proper division membership from OOB for exact tier determination.
  const divisionUnits = Object.values(state.units).filter(
    (u) => (u.isOnBoard && u.id.startsWith(`${divisionId}-`)) || u.id === divisionId
  );
  let divisionStatus = 'clean';
  for (const u of divisionUnits) {
    const sp = u.strengthPoints ?? 1;
    if (sp <= 0) {
      divisionStatus = 'dead';
      break;
    }
    if (u.wrecked && divisionStatus !== 'dead') divisionStatus = 'wrecked';
  }

  const result = attackRecoveryResult(divisionStatus, commandValue, step1Roll, step2Roll);

  // LOB §10.8c — on recovery, clear the division's 'stopped' order
  let updatedUnits = state.units;
  if (result.recovered) {
    const divUnit = state.units[divisionId];
    if (divUnit && divUnit.orders?.status === 'stopped') {
      updatedUnits = {
        ...state.units,
        [divisionId]: {
          ...divUnit,
          orders: { ...divUnit.orders, status: 'none', type: null, deliveryTurnDue: null },
        },
      };
    }
  }

  const remainingIds = state.pendingAttackRecovery.divisionIds.filter((id) => id !== divisionId);

  return {
    ...state,
    units: updatedUnits,
    pendingAttackRecovery: remainingIds.length > 0 ? { divisionIds: remainingIds } : null,
  };
}

// ─── Random Events (SM §7.1 / §7.2) ─────────────────────────────────────────

/**
 * ACKNOWLEDGE_RANDOM_EVENT action handler.
 *
 * SM §7.1–7.2 — player acknowledges the random event result.
 * Clears pendingRandomEvent on ordersPhase.
 * Complex event effects (leader injury, reinforcement delays, etc.) are recorded
 * in the result log but deferred to the client/GM layer for M7 — full effect
 * application per event type is an M8+ task.
 *
 * Payload: none required (acknowledgement only)
 */
export function handleAcknowledgeRandomEvent(state) {
  if (!state.ordersPhase?.pendingRandomEvent) {
    throw new ActionError(
      'INVALID_ACTION',
      'ACKNOWLEDGE_RANDOM_EVENT is only valid when a random event is pending'
    );
  }

  return {
    ...state,
    ordersPhase: { ...state.ordersPhase, pendingRandomEvent: null },
  };
}

// ─── Variable Reinforcements (SM §7.0, Confederate Order of Arrival) ─────────

/**
 * SCHEDULE_VARIABLE_REINFORCEMENTS action handler.
 *
 * SM §7.0 / Confederate Order of Arrival — 1d6 is rolled once per force group
 * at game start to determine arrival time and entry hex.
 *
 * This action is submitted once at the beginning of the game (before turn 1) for
 * any scenario that has variable reinforcement groups. Rolling two dice (one per force)
 * schedules both Force A and Force B.
 *
 * Payload: { rolls: [{ groupId: string, dieRoll: number (1–6) }, ...] }
 *
 * Effect: updates each matching unit in reinforcementQueue with the resolved turn and entryHex.
 * Sets variableReinforcementsScheduled: true to prevent re-rolling.
 *
 * @param {object} state
 * @param {object} action
 * @param {object} ctx - { scenario } passed by dispatch
 */
export function handleScheduleVariableReinforcements(state, action, { scenario } = {}) {
  if (state.variableReinforcementsScheduled) {
    throw new ActionError(
      'INVALID_ACTION',
      'Variable reinforcements have already been scheduled for this game'
    );
  }
  if (!scenario) {
    throw new ActionError(
      'INVALID_STATE',
      'SCHEDULE_VARIABLE_REINFORCEMENTS requires scenario ctx'
    );
  }

  const { rolls } = action.payload ?? {};
  if (!Array.isArray(rolls) || rolls.length === 0) {
    throw new ActionError(
      'INVALID_PAYLOAD',
      'SCHEDULE_VARIABLE_REINFORCEMENTS requires rolls array'
    );
  }

  // Build a lookup: groupId → resolved { time, entryHex }
  const allVariableGroups = [
    ...(scenario.reinforcements?.confederate ?? []),
    ...(scenario.reinforcements?.union ?? []),
  ].filter((g) => g.variable && g._id);

  const resolvedGroups = new Map();
  for (const { groupId, dieRoll } of rolls) {
    if (!Number.isInteger(dieRoll) || dieRoll < 1 || dieRoll > 6) {
      throw new ActionError('INVALID_PAYLOAD', `dieRoll for group '${groupId}' must be 1–6`);
    }
    const group = allVariableGroups.find((g) => g._id === groupId);
    if (!group) {
      throw new ActionError(
        'INVALID_PAYLOAD',
        `No variable reinforcement group with _id '${groupId}' found in scenario`
      );
    }
    // SM variable table — match roll against range entries ("2-3" or number)
    let resolved = null;
    for (const entry of group.variableTable) {
      const rollSpec = entry.roll;
      if (typeof rollSpec === 'number') {
        if (dieRoll === rollSpec) {
          resolved = entry;
          break;
        }
      } else if (typeof rollSpec === 'string' && rollSpec.includes('-')) {
        const [lo, hi] = rollSpec.split('-').map(Number);
        if (dieRoll >= lo && dieRoll <= hi) {
          resolved = entry;
          break;
        }
      }
    }
    if (!resolved) {
      throw new ActionError(
        'INVALID_PAYLOAD',
        `Die roll ${dieRoll} matched no entry in variable table for group '${groupId}'`
      );
    }
    resolvedGroups.set(groupId, resolved);
  }

  // SM §7.0 — time → turn number conversion
  const { firstTurn } = scenario.turnStructure;
  const [fh, fm] = firstTurn.split(':').map(Number);
  const firstMinutes = fh * 60 + fm;

  function timeToTurn(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const minutes = h * 60 + m;
    return Math.ceil((minutes - firstMinutes) / 20) + 1;
  }

  // Update reinforcementQueue entries that belong to the resolved variable groups
  const updatedQueue = state.reinforcementQueue.map((entry) => {
    // Determine which group this entry's unitId belongs to
    for (const [groupId, resolved] of resolvedGroups) {
      const group = allVariableGroups.find((g) => g._id === groupId);
      if (group?.units?.includes(entry.unitId)) {
        return {
          ...entry,
          turn: timeToTurn(resolved.time),
          entryHex: resolved.entryHex,
        };
      }
    }
    return entry;
  });

  // Also update unit.entryTurn to match
  const updatedUnits = { ...state.units };
  for (const [groupId, resolved] of resolvedGroups) {
    const group = allVariableGroups.find((g) => g._id === groupId);
    const newTurn = timeToTurn(resolved.time);
    for (const unitId of group?.units ?? []) {
      if (updatedUnits[unitId]) {
        updatedUnits[unitId] = { ...updatedUnits[unitId], entryTurn: newTurn };
      }
    }
  }

  return {
    ...state,
    reinforcementQueue: updatedQueue,
    units: updatedUnits,
    variableReinforcementsScheduled: true,
  };
}

// ─── Random event roll utility (used in drainAutoSteps) ──────────────────────

/**
 * Roll 2d6 against the SM random event table for the given side.
 *
 * SM §7.1 (Confederate) / §7.2 (Union) — reroll triggered on:
 *   Confederate: 11 or 12
 *   Union:       10, 11, or 12
 *
 * Returns { roll: number, event: string, text: string } or null if no event
 * (a reroll result that still yields no match, or table has no entry for the roll).
 *
 * @param {number} roll - 2d6 sum (2–12); pre-supplied by caller (not rolled here for testability)
 * @param {string} side - 'union' | 'confederate'
 * @param {object} scenario - loaded scenario object containing randomEvents tables
 * @returns {{ roll: number, event: string, text: string } | null}
 */
export function resolveRandomEvent(roll, side, scenario) {
  const tableData = scenario?.randomEvents?.[side];
  if (!tableData) return null;

  const entry = tableData.table?.find((e) => {
    const r = e.roll;
    if (typeof r === 'number') return r === roll;
    if (typeof r === 'string' && r.includes('-')) {
      const [lo, hi] = r.split('-').map(Number);
      return roll >= lo && roll <= hi;
    }
    return false;
  });

  if (!entry) return null;
  return { roll, event: entry.event, text: entry.text };
}

/**
 * Returns true if the given 2d6 roll triggers a reroll for the given side.
 * SM §7.1 — Confederate rerolls on 11 or 12.
 * SM §7.2 — Union rerolls on 10, 11, or 12.
 *
 * @param {number} roll
 * @param {string} side - 'union' | 'confederate'
 * @returns {boolean}
 */
export function isRandomEventReroll(roll, side) {
  if (side === 'confederate') return roll >= 11;
  if (side === 'union') return roll >= 10;
  return false;
}
