import { STATE_SCHEMA_VERSION } from '../constants/schemaVersion.js';
import { GameStateSchema } from '../schemas/gameState.schema.js';

/**
 * LOB §10.3 / SM §2.3 — True when the unit holds its own order state (divisions and detached
 * brigades). False for brigades within a non-detached division, which inherit their effective
 * order from the parent at query time (LOB §10.3f).
 *
 * Centralises the null-check so query code does not need to replicate it. Note that
 * `orders: null` (non-order-holder) and `orders: { status: 'none' }` (order-holder with no
 * active order) are semantically distinct: only non-null `orders` means the unit is the
 * authoritative order level (#364).
 *
 * @param {{ orders: object|null }} unit
 * @returns {boolean}
 */
export function isOrderHolder(unit) {
  return unit.orders !== null;
}

// LOB §10.3 — artillery and non-order-holding units have null orders; effective behavior is §10.8a
// LOB §10.6 — scenario setup orders are treated as already accepted at turn 1; they represent
//   the pre-game historical posture and bypass the order-delivery pipeline
// LOB_GAME_UPDATES SM (p.4) — "All those 'Complex' defense orders should be Move Orders."
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

function defaultUnit({ id, hex, orderRaw, isOnBoard, entryTurn, isDetached = false }) {
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
    // SM §2.3, §3.3 — false at init; set true by dispatch when a brigade is detached
    isDetached,
  };
}

// Process at-start setup entries for one side, returning { unitId: UnitState }
function processSetupSide(entries, defaultOrder) {
  const units = {};
  for (const entry of entries) {
    // SM §2.3, §3.3 — scenario data flags scenario-start detached brigades (#361)
    const isDetached = entry.isDetached ?? false;
    if (entry.setupZone) {
      // Zone-constraint group — M4 initial pass: place all units at referenceHex
      // (M5 setup-phase UI lets the player reposition within the zone)
      for (const unitId of entry.units) {
        units[unitId] = defaultUnit({
          id: unitId,
          hex: entry.referenceHex,
          // Zone groups always carry an explicit order field; ?? is correct (null and undefined
          // both mean "use the side default"). Individual entries use the ternary below to
          // preserve explicit null as a meaningful "non-order-holder" signal.
          orderRaw: entry.order ?? defaultOrder,
          isOnBoard: true,
          entryTurn: null,
          isDetached,
        });
      }
    } else if (entry.unitId && entry.hex) {
      // Individual unit at fixed hex
      units[entry.unitId] = defaultUnit({
        id: entry.unitId,
        hex: entry.hex,
        // Preserve explicit null (e.g. leaders/artillery with order:null = non-order-holder).
        orderRaw: entry.order !== undefined ? entry.order : defaultOrder,
        isOnBoard: true,
        entryTurn: null,
        isDetached,
      });
    } else if (Array.isArray(entry.units)) {
      // Group where each unit specifies its own hex
      const groupOrder = entry.order !== undefined ? entry.order : defaultOrder;
      for (const u of entry.units) {
        if (typeof u === 'string') {
          // Unit string with no hex — treat as zone-less group (shouldn't occur in CSA setup)
          units[u] = defaultUnit({
            id: u,
            hex: null,
            orderRaw: groupOrder,
            isOnBoard: false,
            entryTurn: null,
            isDetached,
          });
        } else {
          // { unitId, hex }
          units[u.unitId] = defaultUnit({
            id: u.unitId,
            hex: u.hex,
            orderRaw: groupOrder,
            isOnBoard: true,
            entryTurn: null,
            isDetached,
          });
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

  // LOB §10.6 — reinforcements carry their historical order already accepted; setup orders bypass
  // the delivery pipeline (#360). SM §2.3, §3.3 — reinforcement groups may be pre-detached in
  // scenario data (e.g. force-b Jones brigades); propagate the flag the same way processSetupSide
  // does for at-start entries (#361).
  const orderRaw = group.orderType ?? null;
  const isDetached = group.isDetached ?? false;
  for (const unitId of group.units) {
    queueEntries.push({ unitId, turn, entryHex });
    units[unitId] = defaultUnit({
      id: unitId,
      hex: null,
      orderRaw,
      isOnBoard: false,
      entryTurn: turn,
      isDetached,
    });
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
    schemaVersion: STATE_SCHEMA_VERSION,
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
