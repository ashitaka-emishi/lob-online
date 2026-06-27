import { z } from 'zod';

import { PHASES } from '../constants/phases.js';
import { STATE_SCHEMA_VERSION } from '../constants/schemaVersion.js';

// col.row format — e.g. "19.23"
const HexId = z.string().regex(/^\d+\.\d+$/, 'Hex ID must be in col.row format (e.g. "19.23")');

// LOB §6.0 — Morale States: Normal (NM), Blood Lust (BL), Shaken (SH), Disorganized (DG), Routed (RT)
export const MoraleState = z.enum(['normal', 'bloodlust', 'shaken', 'disorganized', 'routed']);

// LOB §10.4a–b — Attack and Move order types; null = no order type assigned (distinct from in-delivery).
// Reserve (§10.4c) and Association (§10.8e part 2) statuses are deferred to a later milestone.
export const OrderType = z.enum(['attack', 'move']).nullable();

// LOB §10.6, §10.6a, §10.6b — Full order state for divisions and detached brigades.
// status 'none'     = no order issued; type must be null
// status 'delay'    = order issued, awaiting delivery; deliveryTurnDue must be set
// status 'accepted' = order accepted and active; deliveryTurnDue must be null
// status 'stopped'  = order stopped by Attack Recovery; type must be non-null (restored without new Command Roll — LOB §10.6b)
export const UnitOrderState = z
  .object({
    type: OrderType,
    status: z.enum(['none', 'delay', 'accepted', 'stopped']),
    deliveryTurnDue: z.number().int().positive().nullable(),
  })
  .strict()
  .refine((o) => o.status !== 'delay' || o.deliveryTurnDue !== null, {
    message: 'deliveryTurnDue must be set when status is delay',
    path: ['deliveryTurnDue'],
  })
  .refine((o) => o.status !== 'none' || o.type === null, {
    message: 'type must be null when status is none',
    path: ['type'],
  })
  .refine((o) => o.status !== 'accepted' || o.deliveryTurnDue === null, {
    message: 'deliveryTurnDue must be null when status is accepted',
    path: ['deliveryTurnDue'],
  })
  .refine((o) => o.status === 'none' || o.type !== null, {
    message: 'type must be set when status is accepted, delay, or stopped',
    path: ['type'],
  })
  .refine((o) => o.status === 'delay' || o.deliveryTurnDue === null, {
    message: 'deliveryTurnDue must be null unless status is delay',
    path: ['deliveryTurnDue'],
  });

// LOB §8.2b — Shell Depletion / Canister Depletion mapped to RSS Low/No Ammo markers (LOB_GAME_UPDATES)
// 'full' = undepleted; 'low' = Shell Depleted; 'none' = Canister Depleted
export const AmmoState = z.enum(['full', 'low', 'none']);

export const UnitStateSchema = z
  .object({
    id: z.string(),
    // LOB §3.3 — Facing: hexside 0–5, 0=N clockwise (implementation convention)
    hex: HexId.nullable(),
    facing: z.number().int().min(0).max(5),
    moraleState: MoraleState,
    // LOB §5.7 — Wrecked Status: separate from morale; unit is Wrecked when current SPs < 50% of printed strength
    wrecked: z.boolean(),
    // LOB §10.6 — null = non-order-holding unit (brigade within a non-detached division; inherits
    // effective order from parent at query time). Non-null = division or detached brigade that holds
    // its own UnitOrderState. NOTE: null and { status:'none' } are semantically distinct — null means
    // "not an order-holding unit", whereas { status:'none' } means "order-holder with no active order".
    // Use isOrderHolder() from engine/queries.js rather than checking orders !== null directly (#364).
    // LOB §10.3f: orders relayed division → brigade. SM §2.3, §3.3: detached brigade becomes
    // the order-holding level.
    orders: UnitOrderState.nullable(),
    ammo: AmmoState,
    // LOB §5.8 — Shell/Canister Depletion marker: placed on unit when depletion roll triggers during fire
    depletionMarker: z.boolean(),
    // LOB §8.1 — Can't Be Fought (CBF) marker: placed after a unit takes a combat loss; cleared at Rally Phase
    cbfMarker: z.boolean(),
    isOnBoard: z.boolean(),
    entryTurn: z.number().int().positive().nullable(),
    // LOB §5.6 — current strength points (casualties applied). Absent = no loss yet;
    // engine falls back to OOB printed SPs. Explicitly 0 means the unit is eliminated.
    strengthPoints: z.number().int().min(0).optional(),
    // LOB §3.6 — artillery formation state: 'limbered' (can move) or 'unlimbered' (can fire).
    // Absent for non-artillery units. Artillery batteries start limbered unless scenario sets otherwise.
    formation: z.enum(['limbered', 'unlimbered']).optional(),
    // SM §2.3, §3.3 — true when a brigade is operating independently of its parent division.
    // Union: 1st Corps may detach one Division; each 1st Corps Division may detach one Brigade;
    // 9th Corps may detach up to two Divisions but may not detach Brigades (§2.3).
    // Confederate: D.H. Hill and D.R. Jones may each detach up to three brigades (§3.3).
    // Detached brigades hold their own order state; non-detached brigades inherit from their division.
    isDetached: z.boolean().default(false),
    // LOB §3 — remaining movement points for this activation; absent until the stack is activated.
    // Set by handleActivateStack from scenario.movementCosts.movementAllowances; decremented by MOVE.
    remainingMPs: z.number().nonnegative().optional(),
  })
  .strict()
  // SM §2.3, §3.3 — a detached brigade must carry its own order state; isDetached: true with orders: null
  // is an invalid combination (silent correctness bug — the engine would try to inherit an order that
  // doesn't exist for a unit that is supposed to be operating independently).
  .refine((u) => !u.isDetached || u.orders !== null, {
    message:
      'A detached brigade must have its own order state (orders must be non-null when isDetached is true)',
    path: ['orders'],
  });

const ReinforcementEntry = z
  .object({
    unitId: z.string(),
    turn: z.number().int().positive(),
    entryHex: HexId,
  })
  .strict();

// LOB §3.0d — per-leader transient runtime state (casualty and succession tracking)
export const LeaderStateSchema = z
  .object({
    casualtyRollPending: z.boolean(),
    replacedBy: z.string().nullable(),
  })
  .strict();

// Pending interrupt requiring a dice roll or player decision before the current step completes
export const PendingResolutionSchema = z
  .object({
    type: z.enum([
      'looseCannonRoll',
      'variableReinforcement',
      // LOB §6.0 — morale check triggered by m/m+ combat result; context: { unitId, roll, modifier }
      'moraleCheck',
      // LOB §9.1a — leader casualty check triggered by m+ result or close combat; context: { leaderId }
      'leaderCasualty',
      // LOB §7.0b — closing roll triggered at start of charge sequence; context: { attackerId, defenderId }
      'closingRoll',
      // LOB §5.6 — fire combat result awaiting morale cascade to resolve; context: { attackerHex, defenderHex, result }
      'combatResult',
    ]),
    context: z.record(z.string(), z.unknown()),
  })
  .strict();

export const GameStateSchema = z
  .object({
    id: z.string(),
    scenarioId: z.string(),
    // Identifies the on-disk schema format version. loadGame() rejects files whose schemaVersion
    // does not match STATE_SCHEMA_VERSION. Increment when GameStateSchema fields change in a
    // breaking way and update constants/schemaVersion.js (#363).
    schemaVersion: z.literal(STATE_SCHEMA_VERSION),
    // Monotonically incremented on every saveGame — used for optimistic concurrency control (#332)
    version: z.number().int().nonnegative(),
    turn: z.number().int().min(1),
    // LOB §2.1 — Phase within the current turn: command, activity, or rally; null when status = 'setup'
    phase: z.enum(Object.values(PHASES)).nullable(),
    // LOB §2.1 — Which player acts first; null during setup; alternates each turn after Rally
    activePlayer: z.enum(['union', 'confederate']).nullable(),
    // LOB §2.1 — Step key within the current phase (e.g. 'orders', 'activation', 'rally'); null between phases
    step: z.string().nullable(),
    // Ordered list of step keys completed in the current phase; reset to [] on each phase transition
    completedSteps: z.array(z.string()),
    initiative: z.enum(['union', 'confederate']).nullable(),
    sides: z.object({ union: z.string().nullable(), confederate: z.string().nullable() }).strict(),
    units: z.record(z.string(), UnitStateSchema),
    reinforcementQueue: z.array(ReinforcementEntry),
    status: z.enum(['setup', 'active', 'complete']),
    // Per-leader transient runtime state; keyed by leaderId; reset when leaders are restored
    leaderState: z.record(z.string(), LeaderStateSchema),
    // Non-null when a mid-step interrupt requires a dice roll or player decision before the step completes
    pendingResolution: PendingResolutionSchema.nullable(),
    // LOB §3.0d — non-null only during Activity Phase; tracks stacks that have completed activation this phase
    // currentActivation: null when no activation in progress; non-null object when a stack is mid-activation
    activityPhase: z
      .object({
        activatedUnits: z.array(z.string()),
        // LOB §3.0d — tracks the hex and activation context of the stack currently mid-activation
        currentActivation: z
          .object({
            hex: z.string().regex(/^\d+\.\d+$/),
            // LOB §5.4 — true when this activation included a Move action (enables Opening Volley on fire)
            movedThisActivation: z.boolean(),
            // LOB §5.4 — true when Opening Volley was triggered this activation
            openingVolley: z.boolean(),
            // LOB §9.1e — true when Zero Rule MA roll fired a zero result; blocks attack this activation
            zeroRuleFired: z.boolean(),
          })
          .strict()
          .nullable(),
      })
      .strict()
      .nullable(),
    // LOB §10.6 — non-null only during Orders step of Command Phase
    // pendingOrderIssuance: set after a successful ROLL_INITIATIVE; cleared by ISSUE_ORDER
    ordersPhase: z
      .object({
        leaderRollUsed: z.record(z.string(), z.boolean()),
        pendingOrderIssuance: z
          .object({ leaderId: z.string(), unitId: z.string() })
          .strict()
          .nullable(),
        // SM §7.0 / SM §7.1–7.2 — non-null when a random-event roll result is awaiting
        // player acknowledgement. Cleared by ACKNOWLEDGE_RANDOM_EVENT. null = no pending event.
        pendingRandomEvent: z
          .object({
            side: z.enum(['union', 'confederate']),
            roll: z.number().int().min(2).max(12),
            event: z.string(),
            text: z.string(),
          })
          .strict()
          .nullable()
          .default(null),
      })
      .strict()
      .nullable(),
    // LOB §10.8c — non-null during ATTACK_RECOVERY step when stopped divisions are present.
    // Stores the division IDs that still need recovery rolls this step.
    // null = no pending attack recovery (auto-advance).
    pendingAttackRecovery: z
      .object({
        divisionIds: z.array(z.string()).min(1),
      })
      .strict()
      .nullable()
      .default(null),
    // SM §7.0 (Confederate Order of Arrival) — true once Force A and Force B variable arrival
    // turns have been determined by 1d6 roll at game start. Prevents re-rolling.
    variableReinforcementsScheduled: z.boolean().default(false),
    // SM §5.1 — terrain hex control: tracks which side last moved a qualifying non-Routed
    // infantry or unlimbered artillery unit through each VP hex. Keyed by hex ID.
    // null = uncontrolled (no qualifying unit has passed through yet).
    hexControl: z.record(z.string(), z.enum(['union', 'confederate']).nullable()).default({}),
    // SM §5.0–5.3 — current VP totals and victory state.
    // vp: null until first VP computation (end of first turn). gameOver: true when game ends.
    vp: z
      .object({
        union: z.number(),
        confederate: z.number(),
        net: z.number(),
        vpLog: z.array(z.record(z.string(), z.unknown())),
      })
      .strict()
      .nullable()
      .default(null),
    // SM §5.3 — the evaluated victory outcome label (e.g. 'Union Marginal Victory').
    // null until game ends (status: 'complete').
    victoryResult: z.string().nullable().default(null),
    // SM §5.0 — true when the game has reached turn 45 or another terminal condition.
    gameOver: z.boolean().default(false),
    // LOB §8.1 — non-null only during Rally Phase; tracks units with CBF markers pending rally
    rallyPhase: z
      .object({
        unitsPendingRally: z.array(z.string()),
        // LOB §6.4 step 3 — non-null when routed units are waiting for interactive rally dice;
        // cleared after all unit rolls are resolved. null = no pending rally rolls.
        pendingRallyRoll: z
          .object({ unitIds: z.array(z.string()).min(1) })
          .strict()
          .nullable()
          .default(null),
      })
      .strict()
      .nullable(),
  })
  .strict()
  // SM §5.0 — phase is null when status is 'setup' OR 'complete' (terminal states).
  // During active play phase must be non-null.
  .refine(
    (data) =>
      data.status === 'setup' || data.status === 'complete'
        ? data.phase === null
        : data.phase !== null,
    {
      message: "phase must be null when status is 'setup' or 'complete', non-null when 'active'",
      path: ['phase'],
    }
  )
  // SM §5.3 — terminal 'complete' state requires activePlayer and step to be null (#team-review)
  .refine(
    (data) => data.status !== 'complete' || (data.activePlayer === null && data.step === null),
    {
      message: "activePlayer and step must be null when status is 'complete'",
      path: ['activePlayer'],
    }
  )
  // LOB §3.0d — activityPhase tracks mid-activation state; must be null outside Activity Phase (#378)
  .refine((data) => (data.phase === PHASES.ACTIVITY) === (data.activityPhase !== null), {
    message: "activityPhase must be non-null iff phase is 'activity'",
    path: ['activityPhase'],
  })
  // LOB §10.6 — ordersPhase holds Command Phase order-issuance state; null outside Command Phase (#380)
  .refine((data) => (data.phase === PHASES.COMMAND) === (data.ordersPhase !== null), {
    message: "ordersPhase must be non-null iff phase is 'command'",
    path: ['ordersPhase'],
  })
  // LOB §2.1 — during Rally Phase both phase-scoped envelopes must be null.
  // These are logically implied by the two biconditionals above (rally ≠ activity → activityPhase null;
  // rally ≠ command → ordersPhase null), but stated explicitly here as belt-and-suspenders so the
  // schema self-documents the full phase-envelope invariant set at the reading site.
  .refine((data) => data.phase !== PHASES.RALLY || data.activityPhase === null, {
    message: "activityPhase must be null during 'rally' phase",
    path: ['activityPhase'],
  })
  .refine((data) => data.phase !== PHASES.RALLY || data.ordersPhase === null, {
    message: "ordersPhase must be null during 'rally' phase",
    path: ['ordersPhase'],
  })
  // LOB §8.1 — rallyPhase envelope biconditional: non-null iff phase is 'rally'
  .refine((data) => (data.phase === PHASES.RALLY) === (data.rallyPhase !== null), {
    message: "rallyPhase must be non-null iff phase is 'rally'",
    path: ['rallyPhase'],
  });
