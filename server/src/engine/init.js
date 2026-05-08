import { GameStateSchema } from '../schemas/gameState.schema.js';

// LOB §10.3 — artillery and non-order-holding units have null orders; effective behavior is §10.8a
// LOB §10.6 — scenario setup orders are treated as already accepted at turn 1; they represent
//   the pre-game historical posture and bypass the order-delivery pipeline
// LOB_GAME_UPDATES SM section — "complexDefense" replaced by "move"
// Returns a UnitOrderState object for order-holding units, or null for non-order-holding units.
function mapOrder(rawOrder) {
  if (rawOrder === 'none' || rawOrder == null) return null;
  const type = rawOrder === 'complexDefense' ? 'move' : rawOrder;
  return { type, status: 'accepted', deliveryTurnDue: null };
}

// Convert "HH:MM" time string to turn number relative to scenario firstTurn
function timeToTurn(timeStr, firstTurnTime, minutesPerTurn) {
  const [h, m] = timeStr.split(':').map(Number);
  const [fh, fm] = firstTurnTime.split(':').map(Number);
  const minutesSinceStart = h * 60 + m - (fh * 60 + fm);
  return Math.floor(minutesSinceStart / minutesPerTurn) + 1;
}

function defaultUnit(id, hex, orderRaw, isOnBoard, entryTurn, isDetached = false) {
  return {
    id,
    hex: hex ?? null,
    // LOB §3.3 — Facing: 0=N clockwise; default to 0 at init
    facing: 0,
    // LOB §6.0 — Morale States
    moraleState: 'normal',
    // LOB §5.7 — Wrecked Status: separate from morale
    wrecked: false,
    // LOB §10.6 — order state mapped from scenario setup data; null = inherits from parent division
    orders: mapOrder(orderRaw),
    // LOB §8.2b — Ammo: full at start
    ammo: 'full',
    isOnBoard,
    entryTurn: entryTurn ?? null,
    // SM detachment rules — false at init; set true by dispatch when a brigade is detached
    isDetached,
  };
}

// Process at-start setup entries for one side, returning { unitId: UnitState }
function processSetupSide(entries, order) {
  const units = {};
  for (const entry of entries) {
    if (entry.setupZone) {
      // Zone-constraint group — M4 initial pass: place all units at referenceHex
      // (M5 setup-phase UI lets the player reposition within the zone)
      for (const unitId of entry.units) {
        units[unitId] = defaultUnit(unitId, entry.referenceHex, entry.order ?? order, true, null);
      }
    } else if (entry.unitId && entry.hex) {
      // Individual unit at fixed hex
      units[entry.unitId] = defaultUnit(
        entry.unitId,
        entry.hex,
        entry.order !== undefined ? entry.order : order,
        true,
        null
      );
    } else if (Array.isArray(entry.units)) {
      // Group where each unit specifies its own hex
      const groupOrder = entry.order !== undefined ? entry.order : order;
      for (const u of entry.units) {
        if (typeof u === 'string') {
          // Unit string with no hex — treat as zone-less group (shouldn't occur in CSA setup)
          units[u] = defaultUnit(u, null, groupOrder, false, null);
        } else {
          // { unitId, hex }
          units[u.unitId] = defaultUnit(u.unitId, u.hex, groupOrder, true, null);
        }
      }
    }
  }
  return units;
}

// Process one reinforcement group, returning array of { unitId, turn, entryHex } entries
// and a map of unitId -> UnitState (off-board)
function processReinforcementGroup(group, firstTurnTime, minutesPerTurn) {
  const queueEntries = [];
  const units = {};

  let timeStr;
  let entryHex;

  if (group.variable) {
    // Variable timing — use the first variableTable entry (earliest possible arrival)
    const earliest = group.variableTable[0];
    timeStr = earliest.time;
    entryHex = earliest.entryHex;
  } else {
    timeStr = group.time;
    entryHex = group.entryHex;
  }

  const turn = timeToTurn(timeStr, firstTurnTime, minutesPerTurn);

  for (const unitId of group.units) {
    queueEntries.push({ unitId, turn, entryHex });
    units[unitId] = defaultUnit(unitId, null, null, false, turn);
  }

  return { queueEntries, units };
}

/**
 * Initialise a new GameState from a loaded scenario object.
 *
 * At-start units are placed at their setup positions (fixed-hex or zone reference hex for M4).
 * Reinforcement units are pre-queued with their scheduled arrival turn and entry hex.
 * All units receive default morale, ammo, and facing values.
 *
 * @param {object} scenario - Loaded and validated scenario object
 * @param {string} gameId - Unique identifier for this game session
 * @returns {object} GameState validated against GameStateSchema
 */
export function initGameState(scenario, gameId) {
  const { firstTurn, minutesPerTurn } = scenario.turnStructure;

  const units = {};
  const reinforcementQueue = [];

  // Process at-start union and confederate setup entries
  const unionUnits = processSetupSide(scenario.setup.union ?? [], null);
  const csaUnits = processSetupSide(scenario.setup.confederate ?? [], null);
  Object.assign(units, unionUnits, csaUnits);

  // Pre-queue reinforcements from both sides
  for (const side of ['union', 'confederate']) {
    const groups = scenario.reinforcements?.[side] ?? [];
    for (const group of groups) {
      const { queueEntries, units: rfUnits } = processReinforcementGroup(
        group,
        firstTurn,
        minutesPerTurn
      );
      reinforcementQueue.push(...queueEntries);
      Object.assign(units, rfUnits);
    }
  }

  const state = {
    id: gameId,
    scenarioId: scenario.id,
    version: 0,
    turn: 1,
    // LOB §2.1 — null until game starts (status: 'setup')
    phase: null,
    activePlayer: null,
    step: null,
    completedSteps: [],
    initiative: null,
    sides: { union: null, confederate: null },
    units,
    reinforcementQueue,
    status: 'setup',
    leaderState: {},
    pendingResolution: null,
    activityPhase: null,
    ordersPhase: null,
  };

  return GameStateSchema.parse(state);
}
