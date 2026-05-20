import { z } from 'zod';

import { PHASES } from '../constants/phases.js';
import { STATE_SCHEMA_VERSION } from '../constants/schemaVersion.js';

// col.row format — e.g. "19.23"
const HexId = z.string().regex(/^\d+\.\d+$/, 'Hex ID must be in col.row format (e.g. "19.23")');

// LOB §6.0 — Morale States: Normal, Blood Lust (BL), Shaken (Sh), Disorganized (DG), Routed (R)
export const MoraleState = z.enum(['normal', 'bloodLust', 'shaken', 'DG', 'routed']);

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
    // Use isOrderHolder() from engine/init.js rather than checking orders !== null directly (#364).
    // LOB §10.3f: orders relayed division → brigade. SM §2.3, §3.3: detached brigade becomes
    // the order-holding level.
    orders: UnitOrderState.nullable(),
    ammo: AmmoState,
    isOnBoard: z.boolean(),
    entryTurn: z.number().int().positive().nullable(),
    // SM §2.3, §3.3 — true when a brigade is operating independently of its parent division.
    // Union: 1st Corps may detach one Division; each 1st Corps Division may detach one Brigade;
    // 9th Corps may detach up to two Divisions but may not detach Brigades (§2.3).
    // Confederate: D.H. Hill and D.R. Jones may each detach up to three brigades (§3.3).
    // Detached brigades hold their own order state; non-detached brigades inherit from their division.
    isDetached: z.boolean().default(false),
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
    type: z.enum(['looseCannonRoll', 'variableReinforcement', 'leaderCasualty']),
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
    // currentActivation: hex of the stack currently mid-activation; null when no activation in progress
    activityPhase: z
      .object({
        activatedUnits: z.array(z.string()),
        currentActivation: z.string().nullable(),
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
      })
      .strict()
      .nullable(),
  })
  .strict()
  .refine((data) => (data.status === 'setup') === (data.phase === null), {
    message: "phase must be null when status is 'setup', and non-null otherwise",
    path: ['phase'],
  })
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
  });
